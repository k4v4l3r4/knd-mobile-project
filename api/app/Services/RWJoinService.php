<?php

namespace App\Services;

use App\Models\Tenant;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class RWJoinService
{
    /**
     * Handle logic when an RW tenant activates a subscription (joins/becomes active).
     *
     * @param Tenant $rwTenant
     * @return void
     */
    public function handleRwActivation(Tenant $rwTenant)
    {
        // Ensure this is actually an RW tenant
        if (strtoupper($rwTenant->level) !== 'RW') {
            return;
        }

        // Get all child RTs (tenants where parent_id is this RW's ID)
        $childRts = Tenant::where('parent_tenant_id', $rwTenant->id)
            ->where('level', 'RT')
            ->get();

        if ($childRts->isEmpty()) {
            return;
        }

        DB::transaction(function () use ($rwTenant, $childRts) {
            $now = Carbon::now();

            foreach ($childRts as $rt) {
                // Rule 2: Semua RT di bawah RW: billing_owner_id = RW
                // Rule 4: RT yang belum pernah bayar -> Otomatis ikut status RW
                // Rule 3b: RT Lifetime -> Lifetime TIDAK HILANG (logic handled in Middleware, but here we set hierarchy)

                // Update hierarchy
                $rt->billing_owner_id = $rwTenant->id;
                $rt->billing_mode = Tenant::BILLING_MODE_RW;
                
                // Set joined_rw_at if not set
                if (!$rt->joined_rw_at) {
                    $rt->joined_rw_at = $now;
                }

                $rt->save();
            }
        });
    }
}
