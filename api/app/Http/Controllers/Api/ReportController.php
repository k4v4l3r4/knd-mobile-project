<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Report;
use App\Models\Transaction;
use App\Models\Fee;
use App\Models\ActivityCategory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    /**
     * Financial Report Summary
     */
    public function summary(Request $request)
    {
        $month = $request->input('month', date('m'));
        $year = $request->input('year', date('Y'));
        $user = $request->user('sanctum');
        if (!$user) return response()->json(['message' => 'Unauthorized'], 401);

        // 1. Calculate Beginning Balances (Saldo Awal)
        // Sum of all transactions BEFORE the start of this month
        $startDate = "$year-$month-01";
        
        $wallets = \App\Models\Wallet::where('rt_id', $user->rt_id)->get();
        
        $beginningBalances = [];
        $totalBeginningBalance = 0;

        foreach ($wallets as $wallet) {
            // Sum IN
            $incomeBefore = Transaction::where('account_id', $wallet->id)
                ->where('date', '<', $startDate)
                ->where('type', 'IN')
                ->where('status', '!=', 'REJECTED')
                ->sum('amount');
                
            // Sum OUT/EXPENSE
            $expenseBefore = Transaction::where('account_id', $wallet->id)
                ->where('date', '<', $startDate)
                ->whereIn('type', ['OUT', 'EXPENSE'])
                ->where('status', '!=', 'REJECTED')
                ->sum('amount');
            
            $balance = $incomeBefore - $expenseBefore;
            $beginningBalances[] = [
                'id' => $wallet->id,
                'name' => $wallet->name,
                'balance' => $balance
            ];
            $totalBeginningBalance += $balance;
        }

        // 2. Operational Activities (Current Month)
        // Income by Category
        $incomeTransactions = Transaction::whereYear('date', $year)
            ->whereMonth('date', $month)
            ->where('rt_id', $user->rt_id)
            ->where('type', 'IN')
            ->where('status', '!=', 'REJECTED')
            ->selectRaw('category, sum(amount) as total')
            ->groupBy('category')
            ->get();

        // Merge with all available Fees to ensure they appear even if 0
        $fees = Fee::where('rt_id', $user->rt_id)->get();
        $incomeMap = [];
        
        // Initialize with Fees
        foreach ($fees as $fee) {
            $incomeMap[$fee->name] = 0;
        }
        
        // Add actual transactions
        foreach ($incomeTransactions as $tx) {
            $incomeMap[$tx->category] = $tx->total;
        }
        
        // Convert back to collection/array
        $incomeCategories = collect();
        foreach ($incomeMap as $name => $total) {
            $incomeCategories->push(['category' => $name, 'total' => $total]);
        }

        $totalIncome = $incomeCategories->sum('total');

        // Expense by Category
        $expenseTransactions = Transaction::whereYear('date', $year)
            ->whereMonth('date', $month)
            ->where('rt_id', $user->rt_id)
            ->whereIn('type', ['OUT', 'EXPENSE'])
            ->where('status', '!=', 'REJECTED')
            ->selectRaw('category, sum(amount) as total')
            ->groupBy('category')
            ->get();

        // Merge with Activity Categories
        $activities = ActivityCategory::where('rt_id', $user->rt_id)->get();
        $expenseMap = [];

        foreach ($activities as $act) {
            $expenseMap[$act->name] = 0;
        }

        foreach ($expenseTransactions as $tx) {
            $expenseMap[$tx->category] = $tx->total;
        }

        $expenseCategories = collect();
        foreach ($expenseMap as $name => $total) {
            $expenseCategories->push(['category' => $name, 'total' => $total]);
        }

        $totalExpense = $expenseCategories->sum('total');
        
        $netCashFlow = $totalIncome - $totalExpense;

        // 3. Ending Balances (Saldo Akhir)
        // Beginning Balance + Net Flow of this month per wallet
        $endingBalances = [];
        $totalEndingBalance = 0;

        foreach ($wallets as $wallet) {
            // Income this month
            $incomeThisMonth = Transaction::where('account_id', $wallet->id)
                ->whereYear('date', $year)
                ->whereMonth('date', $month)
                ->where('type', 'IN')
                ->where('status', '!=', 'REJECTED')
                ->sum('amount');
                
            // Expense this month
            $expenseThisMonth = Transaction::where('account_id', $wallet->id)
                ->whereYear('date', $year)
                ->whereMonth('date', $month)
                ->whereIn('type', ['OUT', 'EXPENSE'])
                ->where('status', '!=', 'REJECTED')
                ->sum('amount');
            
            // Find beginning balance for this wallet
            $startBal = 0;
            foreach ($beginningBalances as $bb) {
                if ($bb['id'] == $wallet->id) {
                    $startBal = $bb['balance'];
                    break;
                }
            }
            
            $endBal = $startBal + $incomeThisMonth - $expenseThisMonth;
            
            $endingBalances[] = [
                'id' => $wallet->id,
                'name' => $wallet->name,
                'balance' => $endBal
            ];
            $totalEndingBalance += $endBal;
        }

        // Get Mutations (Recent transactions in this period)
        $mutations = Transaction::whereYear('date', $year)
            ->whereMonth('date', $month)
            ->where('rt_id', $user->rt_id)
            ->with(['wallet', 'user'])
            ->orderBy('date', 'desc')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Laporan keuangan berhasil diambil',
            'data' => [
                'month' => (int)$month,
                'year' => (int)$year,
                'beginning_balances' => $beginningBalances,
                'total_beginning_balance' => $totalBeginningBalance,
                'income_categories' => $incomeCategories,
                'total_income' => $totalIncome,
                'expense_categories' => $expenseCategories,
                'total_expense' => $totalExpense,
                'net_cash_flow' => $netCashFlow,
                'ending_balances' => $endingBalances,
                'total_ending_balance' => $totalEndingBalance,
                'mutations' => $mutations
            ]
        ]);
    }

    /**
     * Dues Recap (Laporan Iuran Warga Matrix)
     */
    public function duesRecap(Request $request)
    {
        $user = Auth::user();
        $year = $request->input('year', date('Y'));
        $block = $request->input('block'); // Optional filter by block

        if (!$user->rt_id) {
            return response()->json(['message' => 'User not assigned to RT'], 400);
        }

        $data = $this->getDuesMatrix($user->rt_id, $year, $block);

        return response()->json([
            'success' => true,
            'data' => $data
        ]);
    }

    /**
     * Export Dues Recap to PDF
     */
    public function exportDuesPdf(Request $request)
    {
        $user = null;
        
        // 1. Try to get user from Bearer Token (if Request has header)
        if ($request->bearerToken()) {
            $user = Auth::guard('sanctum')->user();
        }

        // 2. If no header, check query param 'token'
        if (!$user && $request->has('token')) {
            $accessToken = \Laravel\Sanctum\PersonalAccessToken::findToken($request->token);
            if ($accessToken) {
                $user = $accessToken->tokenable;
            }
        }

        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        if (!$user->rt_id) {
            return response()->json(['message' => 'User not assigned to RT'], 400);
        }

        $year = $request->input('year', date('Y'));
        $block = $request->input('block');

        $data = $this->getDuesMatrix($user->rt_id, $year, $block);
        
        // Calculate Totals for Footer
        $monthlyTotals = [];
        $grandTotal = 0;
        
        // Initialize 01-12
        for ($m=1; $m<=12; $m++) {
            $monthlyTotals[sprintf('%02d', $m)] = 0;
        }

        foreach ($data['users'] as $u) {
            $grandTotal += $u['total_year'];
            foreach ($u['months'] as $key => $val) {
                $monthlyTotals[$key] += $val['paid'];
            }
        }

        $data['monthly_totals'] = $monthlyTotals;
        $data['grand_total'] = $grandTotal;
        $data['year'] = $year;
        $data['rt_name'] = $user->rt ? ('RT ' . $user->rt->rt_number . ' / RW ' . $user->rt->rw_number) : 'RT Online';
        $data['filter_block'] = $block && $block !== 'ALL' ? $block : 'Semua Blok';

        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('reports.dues_pdf', $data)
            ->setPaper('a4', 'landscape');

        return $pdf->stream('laporan-iuran-' . $year . '.pdf');
    }

    /**
     * Private helper to generate Matrix Data
     */
    private function getDuesMatrix($rtId, $year, $block = null)
    {
        // 1. Get Users (Warga) in RT
        $query = \App\Models\User::where('rt_id', $rtId)
            ->whereIn('role', ['WARGA', 'warga', 'WARGA_KOST', 'warga_kost', 'ADMIN_RT', 'admin_rt', 'SECRETARY', 'TREASURER']) 
            ->orderBy('block')
            ->orderBy('name');
            
        if ($block && $block !== 'ALL') {
            $query->where('block', $block);
        }

        $users = $query->get();

        // 2. Get Mandatory Monthly Fee Amount
        $mandatoryFees = \App\Models\Fee::where('rt_id', $rtId)
            ->where('is_mandatory', true)
            ->sum('amount');
            
        if ($mandatoryFees == 0) {
            $mandatoryFees = 25000; 
        }

        // 3. Get All Income Transactions for this RT and Year
        $transactions = Transaction::where('rt_id', $rtId)
            ->whereYear('date', $year)
            ->where('type', 'IN')
            ->where('status', '!=', 'REJECTED')
            ->get()
            ->groupBy(function($item) {
                return $item->user_id . '-' . date('m', strtotime($item->date));
            });

        // 4. Build Matrix
        $matrix = [];
        $blocks = [];

        foreach ($users as $u) {
            $userRow = [
                'id' => $u->id,
                'name' => $u->name,
                'block' => $u->block ?? 'Unassigned',
                'photo_url' => $u->photo_url,
                'role' => $u->role,
                'months' => [],
                'total_year' => 0
            ];

            // Collect blocks for tabs
            $b = $u->block ?? 'Unassigned';
            if (!isset($blocks[$b])) {
                $blocks[$b] = 0;
            }
            $blocks[$b]++;

            for ($m = 1; $m <= 12; $m++) {
                $monthKey = sprintf('%02d', $m);
                $key = $u->id . '-' . $monthKey;
                $trxs = $transactions->get($key);

                $paid = 0;
                $details = [];

                if ($trxs) {
                    foreach ($trxs as $t) {
                        $paid += $t->amount;
                        $details[] = [
                            'date' => $t->date->format('d/m/Y'),
                            'amount' => $t->amount,
                            'category' => $t->category,
                            'desc' => $t->description
                        ];
                    }
                }

                $status = 'UNPAID';
                if ($paid >= $mandatoryFees) {
                    $status = 'PAID';
                } elseif ($paid > 0) {
                    $status = 'PARTIAL';
                }

                $userRow['months'][$monthKey] = [
                    'paid' => $paid,
                    'status' => $status,
                    'details' => $details
                ];
                $userRow['total_year'] += $paid;
            }

            $matrix[] = $userRow;
        }

        return [
            'users' => $matrix,
            'blocks' => $blocks,
            'standard_fee' => $mandatoryFees
        ];
    }

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $user = $request->user('sanctum');
        if (!$user) return response()->json(['message' => 'Unauthorized'], 401);

        $query = Report::with('user')->orderBy('created_at', 'desc');

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // Optional: Filter by RT ID of the logged in user
        if ($user->rt_id) {
            $query->where('rt_id', $user->rt_id);
        }

        $reports = $query->paginate(10);

        return response()->json([
            'success' => true,
            'message' => 'Daftar laporan berhasil diambil',
            'data' => $reports
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'required|string',
            'type' => 'required|string',
            'amount' => 'required|numeric',
        ]);

        $user = $request->user();

        $report = Report::create([
            'rt_id' => $user->rt_id,
            'user_id' => $user->id,
            'title' => $request->title,
            'description' => $request->description,
            'type' => $request->type,
            'amount' => $request->amount,
            'status' => 'DRAFT', // Default status
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Laporan berhasil dibuat',
            'data' => $report
        ], 201);
    }
}
