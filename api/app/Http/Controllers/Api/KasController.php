<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\KasTransaction;
use App\Models\Transaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Barryvdh\DomPDF\Facade\Pdf;
use Laravel\Sanctum\PersonalAccessToken;

class KasController extends Controller
{
    /**
     * Get Kas Summary (Total IN, OUT, Balance, Breakdown).
     */
    public function summary(Request $request)
    {
        $user = Auth::user();
        $rtId = $user->rt_id;

        if (!$rtId) {
            return response()->json(['message' => 'User not assigned to RT'], 403);
        }

        // 1. Calculate from KasTransactions (New System - Denda, etc)
        $kasIn = KasTransaction::where('rt_id', $rtId)->where('direction', 'IN')->sum('amount');
        $kasOut = KasTransaction::where('rt_id', $rtId)->where('direction', 'OUT')->sum('amount');

        // 2. Calculate from Transactions (Old System - Iuran, Expenses)
        // Note: We only count PAID transactions
        $transIn = Transaction::where('rt_id', $rtId)
            ->where('type', 'IN')
            ->where('status', 'PAID')
            ->sum('amount');

        $transOut = Transaction::where('rt_id', $rtId)
            ->whereIn('type', ['OUT', 'EXPENSE'])
            ->where('status', 'PAID')
            ->sum('amount');

        $totalIn = $kasIn + $transIn;
        $totalOut = $kasOut + $transOut;
        $balance = $totalIn - $totalOut;

        // Breakdown by source_type/category
        $kasBreakdown = KasTransaction::where('rt_id', $rtId)
            ->where('direction', 'IN')
            ->select('source_type as name', DB::raw('SUM(amount) as total'))
            ->groupBy('source_type')
            ->get()
            ->toArray();

        $transBreakdown = Transaction::where('rt_id', $rtId)
            ->where('type', 'IN')
            ->where('status', 'PAID')
            ->select('category as name', DB::raw('SUM(amount) as total'))
            ->groupBy('category')
            ->get()
            ->toArray();

        // Merge breakdown
        $breakdown = [];
        foreach (array_merge($kasBreakdown, $transBreakdown) as $item) {
            $name = $item['name'];
            if (!isset($breakdown[$name])) {
                $breakdown[$name] = 0;
            }
            $breakdown[$name] += $item['total'];
        }

        return response()->json([
            'success' => true,
            'data' => [
                'total_in' => (int)$totalIn,
                'total_out' => (int)$totalOut,
                'balance' => (int)$balance,
                'breakdown' => $breakdown
            ]
        ]);
    }

    /**
     * Get Kas Transactions List.
     */
    public function index(Request $request)
    {
        $user = Auth::user();
        $rtId = $user->rt_id;

        if (!$rtId) {
            return response()->json(['message' => 'User not assigned to RT'], 403);
        }

        // Fetch from KasTransactions
        $kasQuery = KasTransaction::where('rt_id', $rtId)
            ->select(
                'id',
                'amount',
                'direction',
                'source_type',
                'description',
                'created_at',
                DB::raw("'KAS' as origin")
            );

        // Fetch from Transactions
        $transQuery = Transaction::where('rt_id', $rtId)
            ->where('status', 'PAID')
            ->select(
                'id',
                'amount',
                DB::raw("CASE WHEN type = 'IN' THEN 'IN' ELSE 'OUT' END as direction"),
                'category as source_type',
                'description',
                'date as created_at',
                DB::raw("'TRANS' as origin")
            );

        // Apply filters
        if ($request->has('direction')) {
            $kasQuery->where('direction', $request->direction);
            $dir = $request->direction == 'OUT' ? ['OUT', 'EXPENSE'] : ['IN'];
            $transQuery->whereIn('type', $dir);
        }

        // Combine using Union
        $combined = $kasQuery->union($transQuery)
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return response()->json([
            'success' => true,
            'data' => $combined
        ]);
    }

    /**
     * Store a manual transaction.
     */
    public function store(Request $request)
    {
        $user = Auth::user();
        $rtId = $user->rt_id;

        if (!$rtId) {
            return response()->json(['message' => 'User not assigned to RT'], 403);
        }

        $validator = Validator::make($request->all(), [
            'amount' => 'required|numeric|min:1',
            'direction' => 'required|in:IN,OUT',
            'source_type' => 'required|string',
            'description' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $transaction = KasTransaction::create([
            'rt_id' => $rtId,
            'amount' => $request->amount,
            'direction' => $request->direction,
            'source_type' => $request->source_type,
            'description' => $request->description,
            // source_id is null for manual transactions
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Transaksi berhasil ditambahkan',
            'data' => $transaction
        ]);
    }

    /**
     * Export Kas Report to PDF
     */
    public function exportPdf(Request $request)
    {
        // 1. Authenticate (Handle Query Token for Download)
        $user = null;
        if ($request->bearerToken()) {
            $user = Auth::guard('sanctum')->user();
        }
        if (!$user && $request->has('token')) {
            $accessToken = PersonalAccessToken::findToken($request->token);
            if ($accessToken) {
                $user = $accessToken->tokenable;
            }
        }

        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        if (!$user->rt_id) {
            return response()->json(['message' => 'User not assigned to RT'], 403);
        }

        $rtId = $user->rt_id;
        
        // 2. Filter Parameters
        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');
        
        // Default to current month if no dates provided
        if (!$startDate || !$endDate) {
            $startDate = date('Y-m-01');
            $endDate = date('Y-m-t');
            $period = date('F Y');
        } else {
            $period = date('d M Y', strtotime($startDate)) . ' - ' . date('d M Y', strtotime($endDate));
        }

        // 3. Fetch Data (Reusing logic from index but filtered by date and no pagination)
        
        // KasTransactions
        $kasQuery = KasTransaction::where('rt_id', $rtId)
            ->whereBetween('created_at', [$startDate . ' 00:00:00', $endDate . ' 23:59:59'])
            ->select(
                'amount',
                'direction',
                'source_type',
                'description',
                'created_at'
            );

        // Legacy Transactions
        $transQuery = Transaction::where('rt_id', $rtId)
            ->where('status', 'PAID')
            ->whereBetween('date', [$startDate, $endDate])
            ->select(
                'amount',
                DB::raw("CASE WHEN type = 'IN' THEN 'IN' ELSE 'OUT' END as direction"),
                'category as source_type',
                'description',
                'date as created_at'
            );

        // Combine
        $transactions = $kasQuery->union($transQuery)
            ->orderBy('created_at', 'desc')
            ->get();

        // 4. Calculate Summary for this period
        $totalIn = 0;
        $totalOut = 0;
        
        foreach ($transactions as $tx) {
            if ($tx->direction == 'IN') {
                $totalIn += $tx->amount;
            } else {
                $totalOut += $tx->amount;
            }
        }
        
        // Note: Balance is usually running balance, but for this report let's show Net Flow of Period + Current Real Balance
        // Or just re-calculate total balance separately like in summary()
        // For the PDF "Saldo Akhir", users usually expect the CURRENT accumulated balance, not just period flow.
        
        // Calculate Total Balance (All Time)
        $kasInAll = KasTransaction::where('rt_id', $rtId)->where('direction', 'IN')->sum('amount');
        $kasOutAll = KasTransaction::where('rt_id', $rtId)->where('direction', 'OUT')->sum('amount');
        
        $transInAll = Transaction::where('rt_id', $rtId)->where('type', 'IN')->where('status', 'PAID')->sum('amount');
        $transOutAll = Transaction::where('rt_id', $rtId)->whereIn('type', ['OUT', 'EXPENSE'])->where('status', 'PAID')->sum('amount');
        
        $currentBalance = ($kasInAll + $transInAll) - ($kasOutAll + $transOutAll);

        // 5. Generate PDF
        $data = [
            'rt_name' => $user->rt ? ('RT ' . $user->rt->rt_number . ' / RW ' . $user->rt->rw_number) : 'RT Online',
            'period' => $period,
            'transactions' => $transactions,
            'total_in' => $totalIn, // In this period
            'total_out' => $totalOut, // In this period
            'balance' => $currentBalance, // Current global balance
            'city' => $user->rt->city ?? 'Indonesia',
        ];

        $pdf = Pdf::loadView('reports.kas_pdf', $data)
            ->setPaper('a4', 'portrait');

        return $pdf->stream('laporan-kas-' . date('Ymd') . '.pdf');
    }

    /**
     * Export Expense Report to PDF
     */
    public function exportExpensePdf(Request $request)
    {
        // 1. Authenticate (Handle Query Token for Download)
        $user = null;
        if ($request->bearerToken()) {
            $user = Auth::guard('sanctum')->user();
        }
        if (!$user && $request->has('token')) {
            $accessToken = PersonalAccessToken::findToken($request->token);
            if ($accessToken) {
                $user = $accessToken->tokenable;
            }
        }

        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        if (!$user->rt_id) {
            return response()->json(['message' => 'User not assigned to RT'], 403);
        }

        $rtId = $user->rt_id;
        
        // 2. Filter Parameters
        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');
        
        // Default to current month if no dates provided
        if (!$startDate || !$endDate) {
            $startDate = date('Y-m-01');
            $endDate = date('Y-m-t');
            $period = date('F Y');
        } else {
            $period = date('d M Y', strtotime($startDate)) . ' - ' . date('d M Y', strtotime($endDate));
        }

        // 3. Fetch Data (Filtered by OUT/EXPENSE)
        
        // KasTransactions (OUT)
        $kasQuery = KasTransaction::where('rt_id', $rtId)
            ->where('direction', 'OUT')
            ->whereBetween('created_at', [$startDate . ' 00:00:00', $endDate . ' 23:59:59'])
            ->select(
                'amount',
                'direction',
                'source_type',
                'description',
                'created_at'
            );

        // Legacy Transactions (OUT/EXPENSE)
        $transQuery = Transaction::where('rt_id', $rtId)
            ->where('status', 'PAID')
            ->whereIn('type', ['OUT', 'EXPENSE'])
            ->whereBetween('date', [$startDate, $endDate])
            ->select(
                'amount',
                DB::raw("'OUT' as direction"),
                'category as source_type',
                'description',
                'date as created_at'
            );

        // Combine
        $transactions = $kasQuery->union($transQuery)
            ->orderBy('created_at', 'desc')
            ->get();

        // 4. Calculate Summary
        $totalOut = 0;
        foreach ($transactions as $tx) {
            $totalOut += $tx->amount;
        }
        
        // 5. Generate PDF
        $data = [
            'rt_name' => $user->rt ? ('RT ' . $user->rt->rt_number . ' / RW ' . $user->rt->rw_number) : 'RT Online',
            'period' => $period,
            'transactions' => $transactions,
            'total_out' => $totalOut,
            'city' => $user->rt->city ?? 'Indonesia',
        ];

        $pdf = Pdf::loadView('reports.expense_pdf', $data)
            ->setPaper('a4', 'portrait');

        return $pdf->stream('laporan-pengeluaran-' . date('Ymd') . '.pdf');
    }

    /**
     * Get Finance Accounts (Wallets) for Dropdown.
     */
    public function getAccounts(Request $request)
    {
        $user = Auth::user();
        $rtId = $user->rt_id;

        if (!$rtId) {
            return response()->json(['message' => 'User not assigned to RT'], 403);
        }

        $accounts = \App\Models\Wallet::where('rt_id', $rtId)
            ->select('id', 'name', 'type', 'balance')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $accounts
        ]);
    }

    /**
     * Transfer funds between accounts.
     */
    public function transfer(Request $request)
    {
        $user = Auth::user();
        $rtId = $user->rt_id;

        if (!$rtId) {
            return response()->json(['message' => 'User not assigned to RT'], 403);
        }

        $validator = Validator::make($request->all(), [
            'from_account_id' => 'required|exists:wallets,id',
            'to_account_id' => 'required|exists:wallets,id|different:from_account_id',
            'amount' => 'required|numeric|min:1',
            'description' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Validate Ownership
        $fromAccount = \App\Models\Wallet::where('rt_id', $rtId)->find($request->from_account_id);
        $toAccount = \App\Models\Wallet::where('rt_id', $rtId)->find($request->to_account_id);

        if (!$fromAccount || !$toAccount) {
            return response()->json(['message' => 'Unauthorized account access'], 403);
        }

        // Check Balance
        if ($fromAccount->balance < $request->amount) {
            return response()->json(['message' => 'Saldo tidak mencukupi'], 422);
        }

        DB::beginTransaction();

        try {
            // 1. OUT Transaction (Source)
            Transaction::create([
                'rt_id' => $rtId,
                'account_id' => $fromAccount->id,
                'user_id' => $user->id,
                'type' => 'OUT',
                'amount' => $request->amount,
                'category' => 'TRANSFER',
                'description' => 'Transfer ke ' . $toAccount->name . ': ' . $request->description,
                'status' => 'PAID',
                'date' => now(),
            ]);

            $fromAccount->decrement('balance', $request->amount);

            // 2. IN Transaction (Destination)
            Transaction::create([
                'rt_id' => $rtId,
                'account_id' => $toAccount->id,
                'user_id' => $user->id,
                'type' => 'IN',
                'amount' => $request->amount,
                'category' => 'TRANSFER',
                'description' => 'Terima dari ' . $fromAccount->name . ': ' . $request->description,
                'status' => 'PAID',
                'date' => now(),
            ]);

            $toAccount->increment('balance', $request->amount);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Transfer berhasil',
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Transfer gagal: ' . $e->getMessage()], 500);
        }
    }
}
