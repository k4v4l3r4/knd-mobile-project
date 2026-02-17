<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class TenantFeatureGate
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        // 1. Basic Check: Must be authenticated and have tenant
        if (!$user || !$user->tenant) {
            // Proceed, maybe it's a system admin or public route (though this middleware should be after auth)
            return $next($request);
        }

        $tenant = $user->tenant;
        $status = $tenant->status; // DEMO | TRIAL | ACTIVE | EXPIRED
        $type = $tenant->tenant_type; // DEMO | LIVE

        // =========================================================================
        // STATUS 1: DEMO (tenant_type = DEMO)
        // =========================================================================
        if ($type === 'DEMO') {
            // Rule 1.1: All POST/PUT/DELETE blocked (Read-only)
            if (!$request->isMethod('get')) {
                // Allow logout
                if ($request->routeIs('logout')) {
                    return $next($request);
                }

                return response()->json([
                    'message' => 'Fitur tulis (create/update/delete) tidak tersedia di mode DEMO.',
                    'code' => 'DEMO_READ_ONLY',
                    'tenant_status' => 'DEMO'
                ], 403);
            }

            // Rule 1.2: Block Specific Features (even for GET if sensitive)
            // Export, Billing, Integration, Invite
            // UPDATE: Allowed read-only access (GET) for most features in DEMO mode per user request.
            // Only blocking 'integration' which might rely on external configs.
            if ($this->isRestrictedFeature($request, ['integration'])) {
                return response()->json([
                    'message' => 'Fitur ini diblokir di mode DEMO.',
                    'code' => 'DEMO_RESTRICTED_FEATURE',
                    'tenant_status' => 'DEMO'
                ], 403);
            }
        }

        // =========================================================================
        // STATUS 2: EXPIRED (status = EXPIRED)
        // =========================================================================
        if ($status === 'EXPIRED') {
            // Rule 2.1: Block all non-GET requests
             if (!$request->isMethod('get')) {
                return response()->json([
                    'message' => 'Langganan telah berakhir. Silakan lakukan pembayaran.',
                    'code' => 'SUBSCRIPTION_EXPIRED',
                    'tenant_status' => 'EXPIRED'
                ], 402); // Payment Required
            }
        }

        // =========================================================================
        // STATUS 3: TRIAL (status = TRIAL)
        // =========================================================================
        if ($status === 'TRIAL') {
            // Check if trial actually expired by date (double check)
            if ($tenant->trial_end_at && now()->greaterThan($tenant->trial_end_at)) {
                // Should ideally be handled by a scheduled job to set status=EXPIRED, 
                // but we treat as EXPIRED here just in case.
                 if (!$request->isMethod('get')) {
                    return response()->json([
                        'message' => 'Masa trial telah berakhir. Silakan upgrade ke Active.',
                        'code' => 'TRIAL_EXPIRED',
                        'tenant_status' => 'EXPIRED'
                    ], 402);
                }
            }

            // Rule 3.1: Block Specific Features
            // Billing Warga, Export
            if ($this->isRestrictedFeature($request, ['billing_warga', 'export'])) {
                 return response()->json([
                    'message' => 'Fitur ini tidak tersedia di mode TRIAL.',
                    'code' => 'TRIAL_RESTRICTED_FEATURE',
                    'tenant_status' => 'TRIAL'
                ], 403);
            }
        }

        // =========================================================================
        // STATUS 4: ACTIVE (status = ACTIVE)
        // =========================================================================
        // No restrictions.

        return $next($request);
    }

    /**
     * Check if the request targets a restricted feature.
     * Uses route names (preferred) or path inspection.
     */
    protected function isRestrictedFeature(Request $request, array $restrictedCategories): bool
    {
        $routeName = $request->route() ? $request->route()->getName() : '';
        $path = $request->path();

        foreach ($restrictedCategories as $category) {
            switch ($category) {
                case 'export':
                    // Block export routes, kecuali export Data Warga
                    // Route names often contain 'export' or path contains 'export', 'pdf'
                    if (
                        !(str_contains($routeName, 'warga') || str_contains($path, 'warga/export')) &&
                        (
                            str_contains($routeName, 'export') || 
                            str_contains($path, '/export') || 
                            str_contains($path, '/pdf') || 
                            str_contains($path, 'reports/dues')
                        )
                    ) {
                        return true;
                    }
                    break;

                case 'billing':
                    // General Billing Management (Admin)
                    // Billing generation, payment settings
                    if (str_contains($routeName, 'billing') || 
                        str_contains($path, '/billing') ||
                        str_contains($path, 'reports/dues')) { // Dues report is related to billing
                        return true;
                    }
                    break;
                
                case 'billing_warga':
                    // Specific for Trial: cannot manage billing for warga?
                    // "Billing warga" usually means generating bills.
                    if (str_contains($routeName, 'bill') || 
                        str_contains($path, '/bills')) {
                        return true;
                    }
                    break;

                case 'integration':
                    // Kelurahan integration, webhooks
                    if (str_contains($path, 'kelurahan') || 
                        str_contains($path, 'integration') || 
                        str_contains($path, 'webhook')) {
                        return true;
                    }
                    break;

                case 'invite':
                    // User invitation
                    if (str_contains($routeName, 'invite') || 
                        str_contains($path, '/invite') || 
                        str_contains($path, 'warga/import')) {
                        return true;
                    }
                    break;
            }
        }

        return false;
    }
}
