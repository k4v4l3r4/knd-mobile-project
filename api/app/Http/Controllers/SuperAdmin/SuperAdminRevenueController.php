<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\Subscription;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SuperAdminRevenueController extends Controller
{
    public function summary()
    {
        $totalRevenue = Invoice::where('status', Invoice::STATUS_PAID)->sum('amount');
        $subscriptionRevenue = Invoice::where('status', Invoice::STATUS_PAID)
            ->where('invoice_type', Invoice::TYPE_SUBSCRIPTION)
            ->sum('amount');
        $lifetimeRevenue = Invoice::where('status', Invoice::STATUS_PAID)
            ->where('invoice_type', Invoice::TYPE_LIFETIME)
            ->sum('amount');
        
        $paidInvoices = Invoice::where('status', Invoice::STATUS_PAID)->count();
        $unpaidInvoices = Invoice::whereIn('status', [Invoice::STATUS_UNPAID, Invoice::STATUS_DRAFT])->count();
        
        $activeSubscriptions = Subscription::where('status', Subscription::STATUS_ACTIVE)->count();
        $lifetimeTenants = Subscription::where('status', Subscription::STATUS_ACTIVE)
            ->where('subscription_type', Subscription::TYPE_LIFETIME)
            ->count();

        return response()->json([
            'status' => 'success',
            'data' => [
                'total_revenue' => (float) $totalRevenue,
                'subscription_revenue' => (float) $subscriptionRevenue,
                'lifetime_revenue' => (float) $lifetimeRevenue,
                'paid_invoices' => $paidInvoices,
                'unpaid_invoices' => $unpaidInvoices,
                'active_subscriptions' => $activeSubscriptions,
                'lifetime_tenants' => $lifetimeTenants,
            ]
        ]);
    }

    public function monthly(Request $request)
    {
        $year = $request->input('year', date('Y'));

        // Use standard EXTRACT function for PostgreSQL/MySQL compatibility
        $monthlyData = Invoice::where('status', Invoice::STATUS_PAID)
            ->whereYear('paid_at', $year)
            ->selectRaw('EXTRACT(MONTH FROM paid_at) as month_num, SUM(amount) as revenue')
            ->groupBy('month_num')
            ->orderBy('month_num')
            ->get();

        // Format for chart: Jan, Feb, etc.
        $months = [
            1 => 'Jan', 2 => 'Feb', 3 => 'Mar', 4 => 'Apr', 5 => 'May', 6 => 'Jun',
            7 => 'Jul', 8 => 'Aug', 9 => 'Sep', 10 => 'Oct', 11 => 'Nov', 12 => 'Dec'
        ];

        $result = [];
        foreach ($months as $num => $name) {
            $found = $monthlyData->firstWhere('month_num', $num);
            $result[] = [
                'month' => $name,
                'revenue' => $found ? (float) $found->revenue : 0
            ];
        }

        return response()->json([
            'status' => 'success',
            'data' => $result
        ]);
    }
}
