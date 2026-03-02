<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use App\Models\Transaction;
use App\Models\Letter;
use App\Models\IssueReport;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

class DashboardController extends Controller
{
    public function index()
    {
        try {
            $user = Auth::user();
            $rtId = $user->rt_id;

            // 1. KPI Stats (Menghitung Data Real-time)
            // Hitung total warga (KK) untuk basis data iuran
            $totalWarga = User::where('rt_id', $rtId)
                              ->whereIn('role', ['WARGA_TETAP', 'WARGA_KOST'])
                              ->count();
            
            // Hitung warga yang sudah bayar iuran bulan ini
            $paidCount = Transaction::where('rt_id', $rtId)
                                    ->whereMonth('created_at', Carbon::now()->month)
                                    ->where('type', 'IN') // Asumsi Iuran masuk ke Income (IN)
                                    ->where('category', 'like', '%Iuran%')
                                    ->count();

            $kpiStats = [
                'pending_letters' => Letter::where('rt_id', $rtId)->where('status', 'PENDING')->count(),
                'active_citizens' => $totalWarga,
                'unresolved_issues' => IssueReport::where('rt_id', $rtId)->whereIn('status', ['PENDING', 'PROCESSED'])->count(),
                'unpaid_houses' => max(0, $totalWarga - $paidCount),
            ];

            // 2. Smart Insights (Kecerdasan Finansial)
            $currentMonth = Carbon::now();
            $lastMonth = Carbon::now()->subMonth();

            $incomeCurrent = Transaction::where('rt_id', $rtId)->where('type', 'IN')->whereMonth('created_at', $currentMonth->month)->sum('amount');
            $expenseCurrent = Transaction::where('rt_id', $rtId)->where('type', 'EXPENSE')->whereMonth('created_at', $currentMonth->month)->sum('amount');
            $incomeLast = Transaction::where('rt_id', $rtId)->where('type', 'IN')->whereMonth('created_at', $lastMonth->month)->sum('amount');

            // Hitung Growth % (Income bulan ini vs bulan lalu)
            $growth = $incomeLast > 0 ? (($incomeCurrent - $incomeLast) / $incomeLast) * 100 : 100;

            // Cari Kategori Pengeluaran Terbesar
            $topExpense = Transaction::where('rt_id', $rtId)
                            ->where('type', 'EXPENSE')
                            ->whereMonth('created_at', $currentMonth->month)
                            ->select('category', DB::raw('sum(amount) as total'))
                            ->groupBy('category')
                            ->orderByDesc('total')
                            ->first();

            // Hitung Saldo Total (Semua Pemasukan - Semua Pengeluaran)
            $totalIncome = Transaction::where('rt_id', $rtId)->where('type', 'IN')->sum('amount');
            $totalExpense = Transaction::where('rt_id', $rtId)->where('type', 'EXPENSE')->sum('amount');

            $smartInsights = [
                'total_balance' => $totalIncome - $totalExpense,
                'cash_status' => $incomeCurrent >= $expenseCurrent ? 'Surplus' : 'Defisit',
                'cash_flow_percentage' => round($growth, 1),
                'biggest_expense_category' => $topExpense ? $topExpense->category : 'Belum ada',
            ];

            // 3. Trend Chart (Data 6 Bulan Terakhir)
            $trendChart = collect(range(5, 0))->map(function ($i) use ($rtId) {
                $date = Carbon::now()->subMonths($i);
                return [
                    'name' => $date->format('M'), // Jan, Feb
                    'income' => (int) Transaction::where('rt_id', $rtId)->where('type', 'IN')->whereMonth('created_at', $date->month)->sum('amount'),
                    'expense' => (int) Transaction::where('rt_id', $rtId)->where('type', 'EXPENSE')->whereMonth('created_at', $date->month)->sum('amount'),
                ];
            })->values();

            // 4. Recent Activities (5 Transaksi Terakhir)
            $recentActivities = Transaction::with('user')
                ->where('rt_id', $rtId)
                ->latest()
                ->take(5)
                ->get()
                ->map(function ($t) {
                    return [
                        'id' => $t->id,
                        'user_name' => $t->user ? $t->user->name : 'Sistem',
                        'description' => $t->description ?? $t->category,
                        'amount' => $t->amount,
                        'type' => $t->type,
                        'date' => $t->created_at->diffForHumans(),
                    ];
                });

            return response()->json([
                'kpi_stats' => $kpiStats,
                'smart_insights' => $smartInsights,
                'trend_chart' => $trendChart,
                'recent_activities' => $recentActivities,
            ]);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error($e);
            file_put_contents(storage_path('logs/dashboard_error.log'), $e->getMessage() . "\n" . $e->getTraceAsString());
            return response()->json([
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString()
            ], 500);
        }
    }
}
