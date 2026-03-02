<?php

namespace App\Services\Payment;

use App\Models\Invoice;
use App\Models\InvoiceRevenueSplit;

class CentralizedPaymentStrategy implements PaymentStrategy
{
    public function pay(Invoice $invoice): PaymentResult
    {
        // 1. Set Payment Mode & Provider
        $invoice->update([
            'payment_mode' => Invoice::PAYMENT_MODE_CENTRALIZED,
            'payment_provider' => Invoice::PROVIDER_MANUAL, // Defaulting to Manual as per "current setup"
            'status' => Invoice::STATUS_UNPAID, // Ensure it's unpaid
        ]);

        // 2. Generate Revenue Splits (Ledger Only)
        // For Centralized, the money goes to the Billing Owner (RW or Admin).
        // We record it as if it will be settled manually.
        $this->generateLedgerSplits($invoice);

        // 3. Generate Instruction
        $instruction = [
            'bank_name' => 'BCA',
            'account_number' => '1234567890',
            'account_holder' => 'RT Online Treasury',
            'amount' => $invoice->amount,
            'reference' => $invoice->invoice_number,
            'note' => 'Please include invoice number in transfer description.'
        ];

        return new PaymentResult(
            'PENDING',
            Invoice::PAYMENT_MODE_CENTRALIZED,
            Invoice::PROVIDER_MANUAL,
            $instruction
        );
    }

    private function generateLedgerSplits(Invoice $invoice)
    {
        // Clear existing splits
        $invoice->revenueSplits()->delete();

        // Logic:
        // If Billing Owner is RW, then RW gets the money.
        // If Billing Owner is Platform (Super Admin?), Platform gets it.
        // We assume Billing Owner ID is the target.
        
        // Check if billing owner is effectively the platform (e.g. if we had a concept of platform tenant)
        // For now, simpler: 100% to Billing Owner.
        
        // However, prompt mentions "target_type ENUM('PLATFORM','RW')".
        // If Billing Owner is RW, target_type = RW.
        // If Invoice is for RW (paid to system?), target_type = PLATFORM.
        
        $targetType = 'RW'; // Default
        $targetId = $invoice->billing_owner_id;

        // If the invoice is FOR an RW (meaning RW is paying the Platform), then money goes to Platform.
        // How do we know if Billing Owner is Platform?
        // Usually, Subscription Invoice for RW -> Billing Owner is NULL or System?
        // In our system, `billing_owner_id` is a Tenant ID.
        // If `billing_owner_id` == `tenant_id` (Self-paying?), it usually means they pay the Platform.
        // Let's assume:
        // - If Tenant is RT and Billing Owner is RW: Money goes to RW.
        // - If Tenant is RW (or RT with independent billing?) and Billing Owner is Self: Money goes to Platform.
        
        if ($invoice->tenant_id === $invoice->billing_owner_id) {
            $targetType = 'PLATFORM';
            $targetId = null; // Platform
        }

        InvoiceRevenueSplit::create([
            'invoice_id' => $invoice->id,
            'target_type' => $targetType,
            'target_tenant_id' => $targetId,
            'amount' => $invoice->amount, // 100%
        ]);
    }
}
