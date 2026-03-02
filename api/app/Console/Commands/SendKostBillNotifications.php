<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\BoardingTenant;
use App\Models\Notification;
use App\Services\WhatsAppService;
use Carbon\Carbon;

class SendKostBillNotifications extends Command
{
    protected $signature = 'kost:send-bill-notifications';

    protected $description = 'Kirim notifikasi tagihan kost ke penghuni yang jatuh tempo';

    protected $whatsAppService;

    public function __construct(WhatsAppService $whatsAppService)
    {
        parent::__construct();
        $this->whatsAppService = $whatsAppService;
    }

    public function handle()
    {
        $today = Carbon::today();
        
        $this->info("Mulai proses notifikasi tagihan kost untuk {$today->toDateString()}");

        // Revisi query: ambil semua active tenant yang due_date <= today
        $tenants = BoardingTenant::with(['user', 'boardingHouse'])
            ->where('status', 'ACTIVE')
            ->whereDate('due_date', '<=', $today)
            ->get();

        if ($tenants->isEmpty()) {
            $this->info('Tidak ada tagihan kost yang jatuh tempo.');
            return Command::SUCCESS;
        }

        $totalNotifications = 0;

        foreach ($tenants as $tenant) {
            if (!$tenant->user || !$tenant->boardingHouse) {
                continue;
            }

            // Cek apakah sudah ada notifikasi bulan ini untuk tagihan ini
            // Kita gunakan periode bulan dari due_date sebagai penanda
            $dueDate = Carbon::parse($tenant->due_date);
            
            // Cek notifikasi terakhir
            $lastNotification = Notification::where('user_id', $tenant->user_id)
                ->where('type', 'BILL_KOST')
                ->where('related_id', $tenant->id) // Link ke ID tenant kost
                ->whereMonth('created_at', $today->month)
                ->whereYear('created_at', $today->year)
                ->first();

            // Jika sudah dikirim bulan ini, skip (agar tidak spam tiap hari)
            // Kecuali kita mau kirim H-3, H-1, H+1 dst.
            // Untuk saat ini, kita buat simpel: kirim 1x saat jatuh tempo atau lewat jatuh tempo di bulan berjalan.
            if ($lastNotification) {
                continue;
            }

            $amount = $tenant->room_price;
            $formattedAmount = 'Rp ' . number_format($amount, 0, ',', '.');
            $monthName = $dueDate->translatedFormat('F Y');
            $senderName = "Pengurus " . $tenant->boardingHouse->name;
            
            $message = "Tagihan kost periode {$monthName} sebesar {$formattedAmount} jatuh tempo pada {$dueDate->translatedFormat('d F Y')}.";

            // Simpan notifikasi di database
            Notification::create([
                'user_id' => $tenant->user_id,
                'title' => 'Tagihan Kost Jatuh Tempo',
                'message' => $message,
                'type' => 'BILL_KOST',
                'related_id' => $tenant->id,
                'url' => null,
                'is_read' => false,
            ]);

            // Kirim WhatsApp
            if ($tenant->user->phone) {
                $waMessage = "Yth. {$tenant->user->name},\n\n" .
                             "Kami informasikan tagihan sewa kost Anda untuk periode *{$monthName}* telah jatuh tempo.\n\n" .
                             "*Detail Tagihan:*\n" .
                             "Kost: {$tenant->boardingHouse->name}\n" .
                             "Kamar: {$tenant->room_number}\n" .
                             "Jatuh Tempo: {$dueDate->translatedFormat('d F Y')}\n" .
                             "Total: *{$formattedAmount}*\n\n" .
                             "Mohon segera melakukan pembayaran melalui aplikasi atau hubungi pengurus kost.\n\n" .
                             "Terima kasih.\n\n" .
                             "Salam,\n" .
                             "{$senderName}";
                
                try {
                    $this->whatsAppService->sendMessage($tenant->user->phone, $waMessage);
                    $this->info("WA Kost terkirim ke {$tenant->user->name} ({$tenant->user->phone})");
                } catch (\Exception $e) {
                    $this->error("Gagal kirim WA Kost ke {$tenant->user->name}: " . $e->getMessage());
                }
            }

            $totalNotifications++;
        }

        $this->info("Selesai mengirim {$totalNotifications} notifikasi tagihan kost.");

        return Command::SUCCESS;
    }
}
