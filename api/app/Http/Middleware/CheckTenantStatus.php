<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Support\Facades\Auth;
use App\Models\Tenant;
use App\Models\Subscription;

class CheckTenantStatus
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = Auth::user();
        
        if (!$user || !$user->tenant) {
            // No tenant context
            return $next($request);
        }

        $tenant = $user->tenant;

        // --- HIERARCHICAL STATUS CHECK (STEP 4) ---

        // 0. Check for Lifetime (Always Active)
        // If tenant has any active LIFETIME subscription, they are ACTIVE regardless of RW status
        $hasLifetime = $tenant->subscriptions()
            ->where('subscription_type', Subscription::TYPE_LIFETIME)
            ->where('status', Subscription::STATUS_ACTIVE)
            ->exists();

        if ($hasLifetime) {
            if ($tenant->status !== Tenant::STATUS_ACTIVE) {
                $tenant->status = Tenant::STATUS_ACTIVE;
                $tenant->save();
            }
            // Proceed to standard checks (skip expiration logic for lifetime)
        } else {
            // 1. Check for Expiration (Auto-Update)
            
            // A. TRIAL / DEMO Expiry
            if (($tenant->status === Tenant::STATUS_TRIAL || $tenant->status === Tenant::STATUS_DEMO) 
                && $tenant->trial_end_at 
                && now()->greaterThan($tenant->trial_end_at)) {
                
                $tenant->status = Tenant::STATUS_EXPIRED;
                $tenant->save();
            }

            // B. ACTIVE Subscription Expiry (Own Subscription)
            if ($tenant->status === Tenant::STATUS_ACTIVE 
                && $tenant->subscription_ended_at !== null 
                && now()->greaterThan($tenant->subscription_ended_at)) {
                
                // If billing_mode is RW, check RW status before expiring
                if ($tenant->billing_mode === Tenant::BILLING_MODE_RW && $tenant->billing_owner_id) {
                     // Logic continues below
                } else {
                    $tenant->status = Tenant::STATUS_EXPIRED;
                    $tenant->save();
                }
            }
        }

        // C. Check RW Status Inheritance (if billing_mode = RW and NOT Lifetime)
        if (!$hasLifetime 
            && $tenant->billing_mode === Tenant::BILLING_MODE_RW 
            && $tenant->billing_owner_id) {
            
            // If tenant has their own valid subscription, respect it until it expires
            // Rule 3a: RT Subscription: Tetap aktif sampai expired
            $hasOwnValidSub = $tenant->status === Tenant::STATUS_ACTIVE 
                              && ($tenant->subscription_ended_at === null || now()->lessThan($tenant->subscription_ended_at));

            if (!$hasOwnValidSub) {
                // Inherit from RW
                $rwTenant = Tenant::find($tenant->billing_owner_id);
                if ($rwTenant) {
                    if ($rwTenant->status === Tenant::STATUS_ACTIVE) {
                        // RW is active, so RT is active
                        if ($tenant->status !== Tenant::STATUS_ACTIVE) {
                            $tenant->status = Tenant::STATUS_ACTIVE;
                            $tenant->save();
                        }
                    } elseif ($rwTenant->status === Tenant::STATUS_EXPIRED) {
                        // RW is expired, so RT is expired
                        if ($tenant->status !== Tenant::STATUS_EXPIRED) {
                            $tenant->status = Tenant::STATUS_EXPIRED;
                            $tenant->save();
                        }
                    }
                    // If RW is TRIAL, RT might be TRIAL or EXPIRED depending on policy.
                    // Assuming inherit TRIAL too?
                    elseif ($rwTenant->status === Tenant::STATUS_TRIAL) {
                         if ($tenant->status !== Tenant::STATUS_TRIAL) {
                            $tenant->status = Tenant::STATUS_TRIAL;
                             // Inherit trial end date? 
                             // Simplified: Just match status.
                            $tenant->save();
                        }
                    }
                }
            }
        }

        // --- END HIERARCHICAL CHECKS ---

        // 2. DEMO Tenant Rules
        if ($tenant->tenant_type === Tenant::TYPE_DEMO) {
            // Read-only: Block POST/PUT/DELETE/PATCH
            if (!$request->isMethod('get')) {
                // Allow logout
                if ($request->routeIs('logout')) {
                     return $next($request);
                }
                
                return response()->json([
                    'message' => 'Mode DEMO bersifat read-only. Aksi ini tidak diizinkan.',
                    'code' => 'DEMO_READ_ONLY'
                ], 403);
            }
        }

        // 3. EXPIRED Tenant Rules
        if ($tenant->status === Tenant::STATUS_EXPIRED) {
            // Block all non-GET requests
            // Also block if accessing specific paid features (if implemented)
            // For now, strict block on write operations
            if (!$request->isMethod('get')) {
                // Allow logout
                if ($request->routeIs('logout')) {
                     return $next($request);
                }

                // Allow billing, invoices, and payments endpoints (to renew subscription)
                if ($request->routeIs('billing.*') || $request->routeIs('invoices.*') || $request->routeIs('payments.*')) {
                    return $next($request);
                }

                return response()->json([
                    'message' => 'Masa berlangganan telah berakhir. Silakan lakukan pembayaran.',
                    'code' => 'SUBSCRIPTION_EXPIRED'
                ], 402); // Payment Required
            }
        }

        return $next($request);
    }
}
