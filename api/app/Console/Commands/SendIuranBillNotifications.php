<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Fee;
use App\Models\User;
use App\Models\Transaction;
use App\Models\Notification;
use App\Models\WilayahRt;
use App\Models\User as UserModel;
use App\Services\WhatsAppService;
use Carbon\Carbon;

class SendIuranBillNotifications extends Command
{
    protected $signature = 'iuran:send-bill-notifications';

    protected $description = 'Kirim notifikasi tagihan iuran bulanan ke warga yang menunggak';

    protected $whatsAppService;

    public function __construct(WhatsAppService $whatsAppService)
    {
        parent::__construct();
        $this->whatsAppService = $whatsAppService;
    }

    public function handle()
    {
        $today = Carbon::today();
        $month = $today->month;
        $year = $today->year;

        $this->info("Mulai proses notifikasi iuran untuk {$today->toDateString()}");

        $fees = Fee::where('is_mandatory', true)->get();

        if ($fees->isEmpty()) {
            $this->info('Tidak ada iuran wajib yang terdaftar.');
            return Command::SUCCESS;
        }

        $feesByRt = $fees->groupBy('rt_id');
        $totalNotifications = 0;

        foreach ($feesByRt as $rtId => $rtFees) {
            // Get RT & Tenant Details
            $rt = WilayahRt::with('tenant')->find($rtId);
            
            // Default sender if tenant not found
            $senderName = "Pengurus RT";

            if ($rt && $rt->tenant) {
                $senderName = "Pengurus " . $rt->tenant->name;
            } elseif ($rt) {
                // Fallback to RT/RW name if tenant relation issue
                $rtName = $rt->rt_name;
                $rwName = $rt->rw ? $rt->rw->name : "";
                $senderName = "Pengurus {$rtName} {$rwName}";
            }

            $activeFees = $rtFees->filter(function (Fee $fee) use ($today, $month, $year) {
                if (!$fee->billing_day) {
                    return true;
                }
                $billingDate = Carbon::create($year, $month, $fee->billing_day, 0, 0, 0);
                return $today->greaterThanOrEqualTo($billingDate);
            });

            if ($activeFees->isEmpty()) {
                continue;
            }

            $residents = User::where('rt_id', $rtId)
                ->whereIn('role', ['WARGA', 'WARGA_TETAP', 'WARGA_KOST'])
                ->get();

            if ($residents->isEmpty()) {
                continue;
            }

            foreach ($residents as $resident) {
                $transactions = Transaction::where('user_id', $resident->id)
                    ->whereYear('date', $year)
                    ->whereMonth('date', $month)
                    ->where('status', '!=', 'REJECTED')
                    ->get();

                $unpaidFees = [];

                foreach ($activeFees as $fee) {
                    $isPaid = false;

                    foreach ($transactions as $trx) {
                        $items = $trx->items ?? [];
                        if (!is_array($items)) {
                            continue;
                        }

                        foreach ($items as $item) {
                            if (isset($item['fee_id']) && $item['fee_id'] == $fee->id) {
                                $isPaid = true;
                                break 2;
                            }
                        }
                    }

                    if (!$isPaid) {
                        $unpaidFees[] = $fee;
                    }
                }

                if (empty($unpaidFees)) {
                    continue;
                }

                $totalAmount = collect($unpaidFees)->sum(function (Fee $fee) {
                    return $fee->amount;
                });

                if ($totalAmount <= 0) {
                    continue;
                }

                $alreadyNotified = Notification::where('notifiable_id', $resident->id)
                    ->where('notifiable_type', UserModel::class)
                    ->where('type', 'BILL')
                    ->whereMonth('created_at', $month)
                    ->whereYear('created_at', $year)
                    ->exists();

                if ($alreadyNotified) {
                    continue;
                }

                $monthName = $today->translatedFormat('F');
                $formattedAmount = 'Rp ' . number_format($totalAmount, 0, ',', '.');
                $message = "Tagihan iuran bulan {$monthName} {$year} sebesar {$formattedAmount} belum terbayar.";

                Notification::create([
                    'notifiable_id' => $resident->id,
                    'notifiable_type' => UserModel::class,
                    'title' => 'Tagihan Iuran Bulanan',
                    'message' => $message,
                    'type' => 'BILL',
                    'related_id' => null,
                    'url' => null,
                    'is_read' => false,
                ]);

                // Send WhatsApp Notification
                if ($resident->phone) {
                    $waMessage = "Yth. Bapak/Ibu {$resident->name},\n\n" .
                                 "Kami informasikan tagihan iuran bulanan Anda untuk periode *{$monthName} {$year}* sebagai berikut:\n\n" .
                                 "*Total Tagihan: {$formattedAmount}*\n\n" .
                                 "Mohon kesediaan Bapak/Ibu untuk melakukan pembayaran melalui aplikasi RT Online.\n\n" .
                                 "Terima kasih atas perhatian dan kerjasamanya.\n\n" .
                                 "Salam,\n" .
                                 "{$senderName}";
                    
                    try {
                        $this->whatsAppService->sendMessage($resident->phone, $waMessage);
                        $this->info("WA terkirim ke {$resident->name} ({$resident->phone})");
                    } catch (\Exception $e) {
                        $this->error("Gagal kirim WA ke {$resident->name}: " . $e->getMessage());
                    }
                }

                $totalNotifications++;
            }
        }

        $this->info("Selesai mengirim {$totalNotifications} notifikasi iuran.");

        return Command::SUCCESS;
    }
}
