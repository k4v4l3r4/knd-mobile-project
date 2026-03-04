<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\TransactionRequest;
use App\Models\Wallet;
use App\Models\Transaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class TransactionController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = Transaction::with(['wallet', 'user']);

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
        
        // Add additional info
        $validated['rt_id'] = Wallet::find($validated['account_id'])->rt_id;
        $validated['user_id'] = Auth::id();
        
        // Default admin transactions are verified immediately
        $validated['status'] = 'PAID'; 

        DB::beginTransaction();

        try {
            // Check Balance for Expenses
            if (in_array($validated['type'], ['OUT', 'EXPENSE'])) {
                $wallet = Wallet::lockForUpdate()->find($validated['account_id']);
                if ($wallet->balance < $validated['amount']) {
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

        try {
            // Upload proof
            $proofPath = null;
            if ($request->hasFile('proof')) {
                $proofPath = $request->file('proof')->store('payments', 'public');
            }

            // Get default RT Finance Account (Prioritize BANK, then CASH)
            $user = Auth::user();
            $account = Wallet::where('rt_id', $user->rt_id)
                             ->where('type', 'BANK')
                             ->first();
            
            if (!$account) {
                // Fallback to any wallet
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
                    'title' => 'Pembayaran Tunai Baru',
                    'message' => 'Warga ' . $user->name . ' melakukan pembayaran sebesar Rp ' . number_format($request->amount) . '. Harap verifikasi.',
                    'type' => 'TRANSACTION_VERIFICATION',
                    'related_id' => $transaction->id,
                    'url' => '/finance/transactions',
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
    public function verify($id)
    {
        DB::beginTransaction();
        try {
            $transaction = Transaction::findOrFail($id);

            if ($transaction->status === 'PAID' || $transaction->status === 'VERIFIED') {
                return response()->json(['message' => 'Transaksi sudah diverifikasi sebelumnya.'], 400);
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
                    'message' => 'Pembayaran Anda sebesar Rp ' . number_format($transaction->amount) . ' telah diverifikasi oleh Admin.',
                    'type' => 'TRANSACTION_APPROVED',
                    'related_id' => $transaction->id,
                    'url' => '/warga/bills', // Redirect to bills history
                    'is_read' => false,
                ]);
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
}
