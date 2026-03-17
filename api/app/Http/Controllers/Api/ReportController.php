<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Report;
use App\Models\Transaction;
use App\Models\Fee;
use App\Models\ActivityCategory;
use App\Models\User;
use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use App\Services\WhatsAppService;
use Carbon\Carbon;

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
        $user = $request->user('sanctum');
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $year = $request->input('year', date('Y'));
        $block = $request->input('block');

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

        // Manual Permission Check (since route is public for window.open)
        if (!$user->can('laporan.export')) {
             return response()->json(['message' => 'Forbidden: You do not have permission to export reports.'], 403);
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
        $data['rt_name'] = $user->rt ? ('RT ' . $user->rt->rt_number . ' / RW ' . ($user->rt->rw ? $user->rt->rw->code : '-')) : 'RT Online';
        $data['filter_block'] = $block && $block !== 'ALL' ? $block : 'Semua Blok';

        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('reports.dues_pdf', $data)
            ->setPaper('a4', 'landscape');

        return $pdf->stream('laporan-iuran-' . $year . '.pdf');
    }

    /**
     * Send single WhatsApp reminder to a specific resident.
     */
    public function sendDuesReminder(Request $request, WhatsAppService $whatsAppService)
    {
        $user = $request->user('sanctum');
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }
        if (!$user->can('laporan.view')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $request->validate([
            'user_id' => 'required|integer|exists:users,id'
        ]);

        $target = User::where('id', $request->input('user_id'))
            ->where('rt_id', $user->rt_id)
            ->first();

        if (!$target) {
            return response()->json(['message' => 'Target user not found in your RT'], 404);
        }
        if (!$target->phone) {
            return response()->json(['message' => 'Target user has no phone number'], 422);
        }

        $now = Carbon::now();
        $monthName = $now->translatedFormat('F');
        $year = $now->year;

        $mandatoryFees = Fee::where('rt_id', $user->rt_id)
            ->where('is_mandatory', true)
            ->sum('amount');
        if ($mandatoryFees <= 0) {
            $mandatoryFees = 25000;
        }
        $formattedAmount = 'Rp ' . number_format($mandatoryFees, 0, ',', '.');

        $rtNumber = $user->rt && $user->rt->rt_number ? str_pad($user->rt->rt_number, 3, '0', STR_PAD_LEFT) : '???';

        $message = "Halo {$target->name}, iuran RT {$rtNumber} bulan ini sebesar {$formattedAmount} belum tercatat. Mohon segera melakukan pembayaran. Terima kasih.";

        try {
            $whatsAppService->sendMessage($target->phone, $message);
            return response()->json([
                'success' => true,
                'message' => 'Pengingat berhasil dikirim'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal mengirim pengingat: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Send bulk WhatsApp reminders to all residents with UNPAID status for current month.
     */
    public function sendDuesBulkReminders(Request $request, WhatsAppService $whatsAppService)
    {
        $user = $request->user('sanctum');
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }
        if (!$user->can('laporan.view')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }
        if (!$user->rt_id) {
            return response()->json(['message' => 'User not assigned to RT'], 400);
        }

        $year = $request->input('year', date('Y'));
        $userIds = $request->input('user_ids'); // Optional list of specific users to remind

        $matrix = $this->getDuesMatrix($user->rt_id, $year);
        $currentMonthKey = Carbon::now()->format('m');
        $mandatoryFees = $matrix['standard_fee'] ?? 0;
        if ($mandatoryFees <= 0) {
            $mandatoryFees = 25000;
        }
        $formattedAmount = 'Rp ' . number_format($mandatoryFees, 0, ',', '.');
        $rtNumber = $user->rt && $user->rt->rt_number ? str_pad($user->rt->rt_number, 3, '0', STR_PAD_LEFT) : '???';

        $sent = 0;
        $skipped = 0;

        foreach ($matrix['users'] as $u) {
            // If specific user_ids provided, skip users not in the list
            if (is_array($userIds) && !empty($userIds) && !in_array($u['id'], $userIds)) {
                continue;
            }

            $monthData = $u['months'][$currentMonthKey] ?? null;
            $status = $monthData['status'] ?? 'UNPAID';

            if ($status === 'PAID') {
                $skipped++;
                continue;
            }
            if (empty($u['phone'])) {
                $skipped++;
                continue;
            }

            $message = "Halo {$u['name']}, iuran RT {$rtNumber} bulan ini sebesar {$formattedAmount} belum tercatat. Mohon segera melakukan pembayaran. Terima kasih.";

            try {
                $whatsAppService->sendMessage($u['phone'], $message);
                $sent++;
            } catch (\Exception $e) {
                $skipped++;
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Blast pengingat selesai',
            'data' => [
                'sent' => $sent,
                'skipped' => $skipped
            ]
        ]);
    }

    /**
     * Private helper to generate Matrix Data
     */
    private function getDuesMatrix($rtId, $year, $block = null)
    {
        // 1. Get Users (Warga) in RT - FILTER BY KEPALA KELUARGA
        // User requested Left Join logic: Get All Heads of Family first, then map transactions.
        // REMOVED ROLE FILTER to ensure ALL Heads of Family appear regardless of role (WARGA, WARGA_TETAP, etc.)
        $query = \App\Models\User::where('rt_id', $rtId)
            ->where('status_in_family', 'KEPALA_KELUARGA') 
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
                // $item->date is cast to Carbon instance in model
                return $item->user_id . '-' . $item->date->format('m');
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
                'phone' => $u->phone,
                'status_in_family' => $u->status_in_family,
                'is_kepala_keluarga' => $u->status_in_family === 'KEPALA_KELUARGA',
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
                $pending = 0;
                $details = [];

                if ($trxs) {
                    foreach ($trxs as $t) {
                        if ($t->status === 'PAID') {
                            $paid += $t->amount;
                        } else if ($t->status === 'PENDING') {
                            $pending += $t->amount;
                        }
                        
                        $details[] = [
                            'id' => $t->id,
                            'date' => $t->date->format('d/m/Y'),
                            'amount' => $t->amount,
                            'category' => $t->category ?? 'Umum', // Handle null category
                            'desc' => $t->description,
                            'status' => $t->status,
                            'proof_url' => $t->proof_url
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
                    'pending' => $pending,
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
            $status = strtoupper($request->input('status'));
            $map = ['PROCESSED' => 'PROCESS', 'DONE' => 'RESOLVED'];
            $normalized = $map[$status] ?? $status;
            $query->whereIn('status', ['PENDING','PROCESS','RESOLVED','REJECTED'])
                  ->where('status', $normalized);
        }

        // Visibility rules:
        // - TenantScope already handles tenant isolation.
        // - We rely on TenantScope to filter data by tenant_id.
        // - Removing manual rt_id filter to avoid conflict with TenantScope logic if rt_id is null/different context.
        
        // if ($user->rt_id) {
        //    $query->where('rt_id', $user->rt_id);
        // } else {
        //    $query->where('user_id', $user->id);
        // }

        $reports = $query->paginate(10);

        // --- DEBUG INFO (TEMPORARY) ---
        // Force inject debug metadata into pagination response
        $reports->getCollection()->transform(function ($item) {
            return $item;
        });
        
        $debug = [
            'user_id' => $user->id,
            'user_role' => $user->role,
            'user_rt_id' => $user->rt_id,
            'user_tenant_id' => $user->tenant_id,
            'query_sql' => $query->toSql(),
            'query_bindings' => $query->getBindings(),
            'count' => $reports->count(),
            'total' => $reports->total(),
        ];
        
        return response()->json([
            'success' => true,
            'message' => 'Daftar laporan berhasil diambil',
            'data' => $reports,
            'debug' => $debug
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        \Illuminate\Support\Facades\Log::info('ReportController@store called', [
            'user_id' => $request->user()->id,
            'all_data' => $request->all(),
            'has_file_images' => $request->hasFile('images'),
            'has_file_photo' => $request->hasFile('photo')
        ]);

        // Normalize category sent from mobile (Indonesian labels) to backend enum
        if ($request->has('category')) {
            $rawCat = trim((string)$request->input('category'));
            $catUpper = strtoupper($rawCat);
            $map = [
                'KEAMANAN' => 'SECURITY',
                'KEBERSIHAN' => 'CLEANLINESS',
                'INFRASTRUKTUR' => 'INFRASTRUCTURE',
            ];
            $normalized = $map[$catUpper] ?? (in_array($catUpper, ['SECURITY','CLEANLINESS','INFRASTRUCTURE','OTHER']) ? $catUpper : 'OTHER');
            $request->merge(['category' => $normalized]);
        }

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'required|string',
            // Allow Indonesian category names for Warga App
            'category' => 'required|string', 
            'location' => 'nullable|string',
            'images' => 'nullable|array', // Frontend may send 'images' array
            'images.*' => 'image|max:2048', // Max 2MB per image
            'is_anonymous' => 'boolean',
            'photo' => 'nullable|image|max:2048', // Mobile may send single 'photo' field
        ]);

        $report = new Report();
        $report->title = $validated['title'];
        $report->description = $validated['description'];
        
        // Auto-map Indonesian categories to Enum (Fix for Warga App)
        $categoryMap = [
            'KEAMANAN' => 'SECURITY',
            'KEBERSIHAN' => 'CLEANLINESS',
            'INFRASTRUKTUR' => 'INFRASTRUCTURE',
            'LAINNYA' => 'OTHER'
        ];
        $inputCategory = strtoupper($validated['category']);
        $report->category = $categoryMap[$inputCategory] ?? $validated['category'];
        
        // Use correct column name: user_id
        // Ensure we use the authenticated user's ID
        $report->user_id = Auth::id(); // Use Auth facade directly for reliability
        $report->rt_id = $request->user()->rt_id;
        
        // Default status
        $report->status = 'PENDING';
        
        // Force Tenant ID from User (Critical for Multi-tenant visibility)
        $report->tenant_id = $request->user()->tenant_id;
        
        // Handle single image upload (mapping to photo_url)
        // Since DB schema only has photo_url string, we take the first image
        if ($request->hasFile('images')) {
            $images = $request->file('images');
            if (is_array($images) && count($images) > 0) {
                // Take the first image
                $path = $images[0]->store('reports', 'public');
                $report->photo_url = $path;
            }
        } elseif ($request->hasFile('photo')) {
            $path = $request->file('photo')->store('reports', 'public');
            $report->photo_url = $path;
        } elseif ($request->input('photo') instanceof \Illuminate\Http\UploadedFile) {
             // Fallback for direct object injection if FormData sends it oddly
             $path = $request->input('photo')->store('reports', 'public');
             $report->photo_url = $path;
        }

        $report->save();

        // Notify all RT Admins about new report
        $rtAdmins = User::where('rt_id', $request->user()->rt_id)
            ->whereIn('role', ['ADMIN_RT', 'RT'])
            ->get();

        foreach ($rtAdmins as $admin) {
            Notification::create([
                'notifiable_id' => $admin->id,
                'notifiable_type' => User::class,
                'title' => 'Laporan Baru dari Warga',
                'message' => "Laporan baru: {$report->title} oleh " . ($report->is_anonymous ? 'Warga Anonim' : $report->user->name),
                'type' => 'REPORT',
                'related_id' => $report->id,
                'url' => '/mobile/report/detail/' . $report->id,
                'is_read' => false,
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Laporan berhasil dibuat',
            'data' => $report,
        ], 201);
    }

    /**
     * Update the status of the specified report.
     */
    public function updateStatus(Request $request, string $id)
    {
        $validated = $request->validate([
            'status' => 'required|in:PENDING,PROCESS,RESOLVED,REJECTED',
            'admin_note' => 'nullable|string'
        ]);

        $report = Report::findOrFail($id);

        // Authorization check: Only RT or ADMIN_RT can update status
        $user = $request->user();
        if (!in_array($user->role, ['RT', 'ADMIN_RT'])) {
             return response()->json([
                'success' => false,
                'message' => 'Unauthorized. Only RT or ADMIN_RT can update report status.'
            ], 403);
        }

        // Update status
        $report->status = $validated['status'];
        if (isset($validated['admin_note'])) {
            $report->admin_note = $validated['admin_note'];
        }
        $report->save();

        // Create Notification for the Reporter (Warga)
        if ($report->user_id && $report->user_id !== $user->id) {
            $title = 'Status Laporan Diperbarui';
            $message = "Laporan Anda '{$report->title}' telah diperbarui menjadi " . $validated['status'];
            
            \App\Models\Notification::create([
                // 'id' is auto-generated by HasUuids
                'type' => 'REPORT',
                'notifiable_type' => \App\Models\User::class,
                'notifiable_id' => $report->user_id,
                'title' => $title,
                'message' => $message,
                'related_id' => $report->id,
                'url' => '/report/detail',
                'data' => [
                    'report_id' => $report->id,
                    'status' => $validated['status'],
                    'click_action' => 'REPORT_DETAIL'
                ],
                'is_read' => false
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Status laporan berhasil diperbarui',
            'data' => $report
        ]);
    }
}
