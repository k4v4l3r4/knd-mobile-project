<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SuperAdminTenantController extends Controller
{
    public function index(Request $request)
    {
        $query = Tenant::with(['activeSubscription', 'wilayah_rt', 'wilayah_rw']);

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

        $data = $tenants->getCollection()->map(function ($tenant) {
            $sub = $tenant->activeSubscription;

            $rtRwName = $tenant->billing_mode === 'RW'
                ? ($tenant->wilayah_rw?->name ?? '-')
                : ($tenant->wilayah_rt?->name ?? '-');

            $tenantCode = $tenant->billing_mode . '-' . $tenant->id;

            return [
                'id' => $tenant->id,
                'tenant_name' => $tenant->name,
                'tenant_code' => $tenantCode,
                'rt_rw' => $rtRwName,
                'city' => $tenant->wilayah_rt?->city ?? '-',
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

    public function duplicates(Request $request)
    {
        $query = Tenant::query()
            ->leftJoin('wilayah_rt', 'wilayah_rt.tenant_id', '=', 'tenants.id')
            ->select([
                'tenants.name',
                'tenants.level',
                'tenants.billing_mode',
                'wilayah_rt.city',
                DB::raw('COUNT(tenants.id) as duplicate_count'),
                DB::raw('MIN(tenants.id) as first_tenant_id'),
            ])
            ->groupBy('tenants.name', 'tenants.level', 'tenants.billing_mode', 'wilayah_rt.city')
            ->having('duplicate_count', '>', 1)
            ->orderByDesc('duplicate_count');

        if ($request->has('level') && $request->level) {
            $query->where('tenants.level', $request->level);
        }

        $duplicates = $query->get();

        return response()->json([
            'status' => 'success',
            'data' => $duplicates,
        ]);
    }
}
