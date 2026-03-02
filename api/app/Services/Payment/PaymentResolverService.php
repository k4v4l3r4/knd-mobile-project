<?php

namespace App\Services\Payment;

use App\Models\Invoice;
use App\Models\Tenant;
use App\Services\Payment\PaymentStrategy;
use App\Services\Payment\CentralizedPaymentStrategy;
use App\Services\Payment\SplitPaymentStrategy;

class PaymentResolverService
{
    public function resolve(Invoice $invoice): PaymentStrategy
    {
        // 1. Block DEMO
        if ($invoice->tenant->status === 'DEMO') {
            throw new \Exception("DEMO tenants cannot perform payments.");
        }

        // 2. Lifetime -> ALWAYS Centralized
        if ($invoice->isLifetime()) {
            return new CentralizedPaymentStrategy();
        }

        // 3. Subscription
        // Logic:
        // - If RW is active and Gateway supports split -> Split.
        // - Else -> Centralized.
        
        // Check Billing Owner Status
        $billingOwner = $invoice->billingOwner;
        
        // If paying to Platform (Self-Billing), use Split (Platform supports it).
        if ($invoice->tenant_id === $invoice->billing_owner_id) {
            return new SplitPaymentStrategy();
        }

        // If paying to RW (RT -> RW)
        // Check if RW is ACTIVE.
        if ($billingOwner && $billingOwner->status === Tenant::STATUS_ACTIVE) {
            // Assume Active RW supports Split (or Platform handles it for them via Split)
            return new SplitPaymentStrategy();
        }

        // Default to Centralized (Manual/Flip)
        return new CentralizedPaymentStrategy();
    }
}
