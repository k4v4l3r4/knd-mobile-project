<?php

namespace App\Http\Controllers\Api\Warga;

use App\Http\Controllers\Controller;
use App\Models\Fee;
use App\Models\Transaction;
use App\Models\Wallet;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;

class BillController extends Controller
{
    /**
     * Get list of unpaid bills and transaction history.
     */
    public function index(Request $request)
    {
        $user = Auth::user();
        $currentMonth = Carbon::now()->month;
        $currentYear = Carbon::now()->year;

        // 1. Get all mandatory fees for User's RT
        $fees = Fee::where('rt_id', $user->rt_id)
            ->where('is_mandatory', true)
            ->get();

        // 2. Get user's transactions for this month to check payments
        // We look for transactions that are NOT REJECTED (so PENDING or VERIFIED counts as "paid" or "processing")
        $monthTransactions = Transaction::where('user_id', $user->id)
            ->whereYear('date', $currentYear)
            ->whereMonth('date', $currentMonth)
            ->where('status', '!=', 'REJECTED')
            ->get();

        $unpaid = [];

        foreach ($fees as $fee) {
            $isPaid = false;

            // Check if any transaction covers this fee
            foreach ($monthTransactions as $trx) {
                $items = $trx->items ?? [];
                // If items is null/empty, skip
                if (!is_array($items)) continue;

                foreach ($items as $item) {
                    if (isset($item['fee_id']) && $item['fee_id'] == $fee->id) {
                        $isPaid = true;
                        break 2;
                    }
                }
            }

            if (!$isPaid) {
                $unpaid[] = $fee;
            }
        }

        // 3. Get History (Last 10 transactions)
        $history = Transaction::where('user_id', $user->id)
            ->with('wallet') // Optional: load wallet info
            ->orderBy('date', 'desc')
            ->orderBy('created_at', 'desc')
            ->take(10)
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'unpaid' => $unpaid,
                'history' => $history
            ]
        ]);
    }

    /**
     * Pay bills (create pending transaction).
     */
    public function pay(Request $request)
    {
        // Support both single fee_id and multiple fee_ids
        $request->validate([
            'fee_id' => 'sometimes|exists:fees,id',
            'fee_ids' => 'sometimes|array',
            'fee_ids.*' => 'exists:fees,id',
            'payment_method' => 'required|string',
            'proof' => 'nullable|image|max:2048', // Add proof validation
            'description' => 'nullable|string',
        ]);

        if (!$request->has('fee_id') && !$request->has('fee_ids')) {
             return response()->json(['success' => false, 'message' => 'Fee ID required.'], 400);
        }

        $user = Auth::user();
        $targetFeeIds = [];

        if ($request->has('fee_ids')) {
            $targetFeeIds = $request->fee_ids;
        } elseif ($request->has('fee_id')) {
            $targetFeeIds = [$request->fee_id];
        }

        // Find default wallet for RT (Kas RT) to receive money
        $wallet = Wallet::where('rt_id', $user->rt_id)->first();
        
        if (!$wallet) {
            return response()->json([
                'success' => false,
                'message' => 'Belum ada akun kas RT yang terdaftar. Hubungi Admin.'
            ], 400);
        }

        $fees = Fee::whereIn('id', $targetFeeIds)->get();
        $totalAmount = 0;
        $items = [];
        $feeNames = [];
        
        // Check for double payment
        $monthTransactions = Transaction::where('user_id', $user->id)
            ->whereYear('date', Carbon::now()->year)
            ->whereMonth('date', Carbon::now()->month)
            ->where('status', '!=', 'REJECTED')
            ->get();

        foreach ($fees as $fee) {
            $isPaid = false;
            foreach ($monthTransactions as $trx) {
                $trxItems = $trx->items ?? [];
                if (is_array($trxItems)) {
                    foreach ($trxItems as $item) {
                        if (isset($item['fee_id']) && $item['fee_id'] == $fee->id) {
                            $isPaid = true;
                            break 2;
                        }
                    }
                }
            }

            if ($isPaid) {
                return response()->json([
                    'success' => false,
                    'message' => "Tagihan '{$fee->name}' sudah dibayar atau sedang diproses."
                ], 400);
            }

            $totalAmount += $fee->amount;
            $items[] = [
                'fee_id' => $fee->id,
                'name' => $fee->name,
                'amount' => $fee->amount
            ];
            $feeNames[] = $fee->name;
        }

        // Handle Proof Upload
        $proofPath = null;
        if ($request->hasFile('proof')) {
            $proofPath = $request->file('proof')->store('payments', 'public');
        }

        // Determine Description
        $description = $request->description;
        if (empty($description)) {
            $description = "Pembayaran " . implode(', ', $feeNames) . " " . Carbon::now()->locale('id')->isoFormat('MMMM Y');
        }

        // Create Transaction
        $transaction = Transaction::create([
            'rt_id' => $user->rt_id,
            'account_id' => $wallet->id,
            'user_id' => $user->id,
            'type' => 'IN',
            'amount' => $totalAmount,
            'category' => 'IURAN_WAJIB',
            'description' => $description,
            'date' => Carbon::now(),
            'status' => 'PENDING', // Waiting for admin verification
            'items' => $items,
            'proof_url' => $proofPath, // Save proof URL
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Pembayaran berhasil dicatat. Menunggu verifikasi admin.',
            'data' => $transaction
        ]);
    }
}
