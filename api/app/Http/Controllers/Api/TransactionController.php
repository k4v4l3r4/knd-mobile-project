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
        } else {
            // Default to VERIFIED only if not specified, OR show all? 
            // Usually dashboard shows verified in main table.
            // But let's keep it flexible. If no status param, maybe show all or just VERIFIED?
            // User requested "Laporan Keuangan" (VERIFIED) vs "Menunggu Konfirmasi" (PENDING).
            // So we will pass status param from frontend.
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
            // If we didn't lock above, lock now. But we might have locked.
            // Simplest is to find again or use the instance if we fetched it.
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
                 return response()->json(['message' => 'Rekening RT belum dikonfigurasi'], 500);
            }

            $transaction = Transaction::create([
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
}
