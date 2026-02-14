<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class TenantFeatureController extends Controller
{
    public function status(Request $request)
    {
        $user = $request->user();
        $tenant = $user->tenant;

        if (!$tenant) {
            return response()->json(['message' => 'No tenant found'], 404);
        }

        $status = $tenant->status;
        $type = $tenant->tenant_type;
        $blockedFeatures = [];
        $isTrial = $status === 'TRIAL';
        $remainingTrialDays = 0;

        // Calculate remaining trial days
        if ($isTrial && $tenant->trial_end_at) {
            $trialEnd = Carbon::parse($tenant->trial_end_at);
            $remainingTrialDays = max(0, now()->diffInDays($trialEnd, false));
            // Round up if there's any time left today
            if (now()->lessThan($trialEnd)) {
                $remainingTrialDays = max(1, ceil(now()->floatDiffInDays($trialEnd, false)));
            }
        }

        // Determine blocked features based on status
        if ($type === 'DEMO') {
            $blockedFeatures = ['export', 'billing', 'integration', 'invite', 'write_operations'];
        } elseif ($status === 'TRIAL') {
            $blockedFeatures = ['billing_warga', 'export'];
            if ($remainingTrialDays <= 0) {
                 // Actually expired
                 $blockedFeatures = ['all_write_operations'];
            }
        } elseif ($status === 'EXPIRED') {
            $blockedFeatures = ['all_write_operations'];
        }

        return response()->json([
            'tenant_name' => $tenant->name,
            'status' => $status,
            'tenant_type' => $type,
            'is_trial' => $isTrial,
            'remaining_trial_days' => (int) $remainingTrialDays,
            'blocked_features' => $blockedFeatures,
            'subscription_message' => $this->getSubscriptionMessage($status, $remainingTrialDays),
        ]);
    }

    private function getSubscriptionMessage($status, $days)
    {
        if ($status === 'EXPIRED') {
            return 'Langganan Anda telah berakhir. Silakan lakukan pembayaran untuk memulihkan akses penuh.';
        }
        if ($status === 'TRIAL') {
            if ($days <= 0) {
                return 'Masa trial telah berakhir. Silakan upgrade ke paket Active.';
            }
            return "Masa trial tersisa {$days} hari.";
        }
        if ($status === 'DEMO') {
            return 'Mode DEMO: Akses terbatas (Read-Only).';
        }
        return 'Paket Active: Akses penuh.';
    }
}
