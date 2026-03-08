<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\TransactionRequest;
use App\Models\Wallet;
use App\Models\Transaction;
use App\Services\WhatsAppService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class TransactionController extends Controller
{
    protected $whatsAppService;

    public function __construct(WhatsAppService $whatsAppService)
    {
        $this->whatsAppService = $whatsAppService;
    }

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        // Eager load relationships including user details (RT, RW) and wallet
        // Note: 'items' is a JSON column on the transactions table, so it's automatically included
        $query = Transaction::with(['wallet', 'user', 'user.rt', 'user.rw']);

        if ($request->has('type')) {
            $query->where('type', $request->type);
        }

        if ($request->has('category')) {
            $query->where('category', 'like', "%{$request->category}%");
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        $transactions = $query->latest('date')->paginate(10);

        return response()->json([
            'success' => true,
            'message' => 'List data transaksi',
            'data' => $transactions
        ]);
    }

    /**
     * Store a newly created resource in storage (Admin/Web).
     */
    public function store(TransactionRequest $request)
    {
        \Illuminate\Support\Facades\Log::info('Transaction Store Payload:', $request->all());
        $validated = $request->validated();
        
        // 1. Secure Wallet Lookup & Validation
        $wallet = Wallet::find($validated['account_id']);
        if (!$wallet) {
            return response()->json(['message' => 'Dompet/Kas tidak ditemukan.'], 404);
        }

        // 2. Tenant/Scope Validation
        $user = Auth::user();
        if ($user->role !== 'SUPER_ADMIN') {
            // Strict RT Check for ADMIN_RT
            if ($user->role === 'ADMIN_RT' && $wallet->rt_id != $user->rt_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Akses Ditolak: Anda tidak dapat mencatat transaksi di dompet RT lain.',
                ], 403);
            }

            // RW Check for ADMIN_RW
            if ($user->role === 'ADMIN_RW') {
                $walletRt = \App\Models\WilayahRt::find($wallet->rt_id);
                if (!$walletRt || $walletRt->rw_id != $user->rw_id) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Akses Ditolak: Dompet ini berada di luar wilayah RW Anda.',
                    ], 403);
                }
            }
        }

        // Add additional info
        $validated['rt_id'] = $wallet->rt_id;
        $validated['user_id'] = Auth::id();
        
        // Default admin transactions are verified immediately
        $validated['status'] = 'PAID'; 

        DB::beginTransaction();

        try {
            // Check Balance for Expenses
            if (in_array($validated['type'], ['OUT', 'EXPENSE'])) {
                // Use the already fetched wallet, but lock it now?
                // Better to lock properly in transaction
                $walletLocked = Wallet::lockForUpdate()->find($validated['account_id']);
                
                if ($walletLocked->balance < $validated['amount']) {
                    DB::rollBack();
                    return response()->json([
                        'success' => false,
                        'message' => 'Saldo dompet tidak mencukupi untuk pengeluaran ini.',
                    ], 422);
                }
            }

            // Create Transaction
            $transaction = Transaction::create($validated);

            // Update Account Balance
            $account = Wallet::lockForUpdate()->find($validated['account_id']);
            
            if ($validated['type'] === 'IN') {
                $account->balance += $validated['amount'];
            } else {
                // OUT or EXPENSE
                $account->balance -= $validated['amount'];
            }
            
            $account->save();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Transaksi berhasil dicatat',
                'data' => $transaction
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Gagal mencatat transaksi: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(TransactionRequest $request, $id)
    {
        DB::beginTransaction();
        try {
            $transaction = Transaction::lockForUpdate()->findOrFail($id);
            $validated = $request->validated();
            
            // 1. Revert Old Balance Effect
            if ($transaction->status === 'PAID' || $transaction->status === 'VERIFIED') {
                $oldWallet = Wallet::lockForUpdate()->find($transaction->account_id);
                if ($transaction->type === 'IN') {
                    $oldWallet->balance -= $transaction->amount;
                } else {
                    $oldWallet->balance += $transaction->amount;
                }
                $oldWallet->save();
            }

            // 2. Update Transaction Data
            $transaction->update($validated);

            // 3. Apply New Balance Effect
            if ($transaction->status === 'PAID' || $transaction->status === 'VERIFIED') {
                $newWallet = Wallet::lockForUpdate()->find($validated['account_id']);
                if ($transaction->type === 'IN') {
                    $newWallet->balance += $validated['amount'];
                } else {
                    $newWallet->balance -= $validated['amount'];
                }
                $newWallet->save();
            }

            DB::commit();
            return response()->json([
                'success' => true,
                'message' => 'Transaksi berhasil diperbarui',
                'data' => $transaction
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Gagal update: ' . $e->getMessage()
            ], 500);
        }
    }

    public function destroy($id)
    {
        DB::beginTransaction();
        try {
            $transaction = Transaction::findOrFail($id);
            
            // Only revert balance if transaction was VERIFIED
            if ($transaction->status === 'PAID' || $transaction->status === 'VERIFIED') {
                $account = Wallet::lockForUpdate()->find($transaction->account_id);
                
                if ($transaction->type === 'IN') {
                    $account->balance -= $transaction->amount;
                } elseif (in_array($transaction->type, ['OUT', 'EXPENSE'])) {
                    $account->balance += $transaction->amount;
                }
                
                $account->save();
            }

            $transaction->delete();
            DB::commit();

            return response()->json(['success' => true, 'message' => 'Transaksi berhasil dihapus']);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['success' => false, 'message' => 'Gagal menghapus transaksi'], 500);
        }
    }

    /**
     * Store public transaction (Mobile App Warga - Iuran).
     */
    public function storePublic(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'amount' => 'required|numeric|min:1000',
            'description' => 'required|string|max:255',
            'proof' => 'required|image|max:2048', // Max 2MB
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validasi gagal',
                'errors' => $validator->errors()
            ], 422);
        }

        // Prevent Double Post (Check if similar transaction exists within 2 minutes)
        $existing = Transaction::where('user_id', Auth::id())
            ->where('amount', $request->amount)
            ->where('description', $request->description)
            ->where('created_at', '>=', now()->subMinutes(2))
            ->where('status', 'PENDING')
            ->first();

        if ($existing) {
            return response()->json([
                'success' => true,
                'message' => 'Transaksi serupa sudah dikirim sebelumnya (Duplicate Prevented).',
                'data' => $existing
            ], 200);
        }

        try {
            // Upload proof
            $proofPath = null;
            if ($request->hasFile('proof')) {
                $proofPath = $request->file('proof')->store('payments', 'public');
            }

            // Get default RT Finance Account (Prioritize CASH, specifically 'KAS RT')
            $user = Auth::user();
            
            // Priority 1: 'KAS RT' (CASH)
            $account = Wallet::where('rt_id', $user->rt_id)
                             ->where('name', 'KAS RT')
                             ->first();

            // Priority 2: Any CASH account
            if (!$account) {
                $account = Wallet::where('rt_id', $user->rt_id)
                             ->where('type', 'CASH')
                             ->first();
            }
            
            // Priority 3: Fallback to any wallet
            if (!$account) {
                $account = Wallet::where('rt_id', $user->rt_id)->first();
            }

            if (!$account) {
                return response()->json(['message' => 'Harap buat Akun Kas terlebih dahulu di menu Pengaturan'], 400);
            }

            // Get Tenant ID from Admin of this RT
            $admin = \App\Models\User::where('rt_id', $account->rt_id)
                ->whereNotNull('tenant_id')
                ->whereIn('role', ['ADMIN_RT', 'RT'])
                ->first();
            $tenantId = $admin ? $admin->tenant_id : null;

            $transaction = Transaction::create([
                'tenant_id' => $tenantId, // Explicitly set tenant_id from Admin
                'rt_id' => $account->rt_id,
                'account_id' => $account->id,
                'user_id' => Auth::id(),
                'type' => 'IN',
                'amount' => $request->amount,
                'category' => 'Iuran Warga',
                'description' => $request->description,
                'date' => now(),
                'proof_url' => $proofPath,
                'status' => 'PENDING', // Waiting for admin verification
            ]);

            // Notify Admins
            $admins = \App\Models\User::where('rt_id', $account->rt_id)
                ->where(function($q) {
                    $q->where('role', 'ADMIN_RT')
                      ->orWhere('role', 'admin_rt')
                      ->orWhere('role', 'RT');
                })->get();

            foreach ($admins as $admin) {
                \App\Models\Notification::create([
                    'tenant_id' => $admin->tenant_id,
                    'notifiable_id' => $admin->id,
                    'notifiable_type' => \App\Models\User::class,
                    'title' => 'Pembayaran Warga Baru',
                    'message' => 'Ada pembayaran baru dari ' . $user->name . ' sebesar Rp ' . number_format($request->amount, 0, ',', '.') . ' perlu verifikasi.',
                    'type' => 'TRANSACTION_VERIFICATION',
                    'related_id' => $transaction->id,
                    'url' => '/dashboard/keuangan',
                    'is_read' => false,
                ]);
            }

            return response()->json([
                'success' => true,
                'message' => 'Bukti pembayaran berhasil dikirim. Menunggu verifikasi admin.',
                'data' => $transaction
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal mengirim bukti pembayaran: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Verify a transaction (Admin approves payment).
     */
    public function verify(Request $request, $id)
    {
        DB::beginTransaction();
        try {
            $transaction = Transaction::findOrFail($id);

            if ($transaction->status === 'PAID' || $transaction->status === 'VERIFIED') {
                return response()->json(['message' => 'Transaksi sudah diverifikasi sebelumnya.'], 400);
            }

            if ($request->has('payment_method') && $request->payment_method !== null) {
                $method = strtoupper($request->payment_method);
                if (in_array($method, ['CASH', 'TRANSFER', 'QRIS', 'OTHER'])) {
                    $transaction->payment_method = $method;
                }
            }

            // Update Status
            $transaction->status = 'PAID';
            $transaction->save();

            // Update Wallet Balance (Only NOW, after approval)
            $account = Wallet::lockForUpdate()->find($transaction->account_id);
            if ($transaction->type === 'IN') {
                $account->balance += $transaction->amount;
            } else {
                $account->balance -= $transaction->amount;
            }
            $account->save();

            // Notify Warga
            $warga = \App\Models\User::find($transaction->user_id);
            if ($warga) {
                \App\Models\Notification::create([
                    'tenant_id' => $warga->tenant_id,
                    'notifiable_id' => $warga->id,
                    'notifiable_type' => \App\Models\User::class,
                    'title' => 'Pembayaran Diterima',
                    'message' => 'Pembayaran Anda sebesar Rp ' . number_format($transaction->amount, 0, ',', '.') . ' telah diverifikasi oleh Admin.',
                    'type' => 'TRANSACTION_APPROVED',
                    'related_id' => $transaction->id,
                    'url' => '/warga/bills', // Redirect to bills history
                    'is_read' => false,
                ]);

                // Send WhatsApp Notification
                if ($warga->phone) {
                    try {
                        $method = $transaction->payment_method ? " via " . $transaction->payment_method : "";
                        $waMessage = "Pembayaran iuran Anda sebesar Rp " . number_format($transaction->amount, 0, ',', '.') . "{$method} telah diterima dan diverifikasi oleh pengurus RT 004. Terima kasih!";
                        
                        $this->whatsAppService->sendMessage($warga->phone, $waMessage);
                        \Illuminate\Support\Facades\Log::info("WhatsApp sent to {$warga->name}");
                    } catch (\Exception $e) {
                        \Illuminate\Support\Facades\Log::error("Failed to send WhatsApp to {$warga->name}: " . $e->getMessage());
                    }
                }
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Transaksi berhasil diverifikasi dan saldo telah diperbarui.',
                'data' => $transaction
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Gagal memverifikasi transaksi: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Reject a transaction.
     */
    public function reject($id)
    {
        DB::beginTransaction();
        try {
            $transaction = Transaction::findOrFail($id);

            if ($transaction->status !== 'PENDING') {
                return response()->json(['message' => 'Hanya transaksi PENDING yang bisa ditolak.'], 400);
            }

            // Update Status
            $transaction->status = 'REJECTED';
            $transaction->save();

            // Notify Warga
            $warga = \App\Models\User::find($transaction->user_id);
            if ($warga) {
                \App\Models\Notification::create([
                    'tenant_id' => $warga->tenant_id,
                    'notifiable_id' => $warga->id,
                    'notifiable_type' => \App\Models\User::class,
                    'title' => 'Pembayaran Ditolak',
                    'message' => 'Pembayaran Anda sebesar Rp ' . number_format($transaction->amount) . ' ditolak oleh Admin.',
                    'type' => 'TRANSACTION_REJECTED',
                    'related_id' => $transaction->id,
                    'url' => '/warga/bills',
                    'is_read' => false,
                ]);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Transaksi berhasil ditolak.',
                'data' => $transaction
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Gagal menolak transaksi: ' . $e->getMessage()
            ], 500);
        }
    }
}
