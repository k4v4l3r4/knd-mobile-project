<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use Illuminate\Http\Request;

class SuperAdminTenantController extends Controller
{
    public function index(Request $request)
    {
        $query = Tenant::with(['activeSubscription', 'wilayah_rt', 'wilayah_rw'])
            ->where('tenant_type', '!=', 'DEMO'); // Usually super admin wants to see real tenants

        // Filters
        if ($request->has('status') && $request->status) {
            $query->where('status', $request->status);
        }

        if ($request->has('billing_mode') && $request->billing_mode) {
            $query->where('billing_mode', $request->billing_mode);
        }

        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where('name', 'like', "%{$search}%");
        }

        $tenants = $query->paginate(20);

        // Transform data
        $data = $tenants->getCollection()->map(function ($tenant) {
            $sub = $tenant->activeSubscription;

            $rtRwName = $tenant->billing_mode === 'RW'
                ? ($tenant->wilayah_rw?->name ?? '-')
                : ($tenant->wilayah_rt?->name ?? '-');

            return [
                'id' => $tenant->id,
                'tenant_name' => $tenant->name,
                'rt_rw' => $rtRwName,
                'billing_mode' => $tenant->billing_mode,
                'status' => $tenant->status,
                'plan_code' => $sub ? $sub->plan_code : '-',
                'subscription_type' => $sub ? $sub->subscription_type : '-',
                'ends_at' => $sub ? $sub->ends_at : null,
                'trial_ends_at' => $tenant->trial_end_at,
            ];
        });

        return response()->json([
            'status' => 'success',
            'data' => $data,
            'meta' => [
                'current_page' => $tenants->currentPage(),
                'last_page' => $tenants->lastPage(),
                'per_page' => $tenants->perPage(),
                'total' => $tenants->total(),
            ]
        ]);
    }
}
