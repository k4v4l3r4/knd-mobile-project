<?php

namespace App\Services\Payment;

use App\Models\Invoice;
use App\Models\InvoiceRevenueSplit;

class SplitPaymentStrategy implements PaymentStrategy
{
    public function pay(Invoice $invoice): PaymentResult
    {
        // 1. Set Payment Mode (Provider determined by config/logic, here mocking Xendit)
        $invoice->update([
            'payment_mode' => Invoice::PAYMENT_MODE_SPLIT,
            'payment_provider' => Invoice::PROVIDER_XENDIT, // Mock provider
            'status' => Invoice::STATUS_UNPAID,
        ]);

        // 2. Generate Split Rules
        $splits = $this->calculateSplits($invoice);
        $this->saveSplits($invoice, $splits);

        // 3. Call Gateway API (Mock)
        // In real world: Xendit::createInvoice(...) with splits
        $gatewayResponse = $this->mockGatewayCall($invoice, $splits);

        // 4. Return Result
        return new PaymentResult(
            'PENDING',
            Invoice::PAYMENT_MODE_SPLIT,
            Invoice::PROVIDER_XENDIT,
            [
                'payment_url' => $gatewayResponse['invoice_url'],
                'expiry_date' => $gatewayResponse['expiry_date'],
                'splits_applied' => $splits
            ]
        );
    }

    private function calculateSplits(Invoice $invoice)
    {
        // Logic:
        // If RT pays RW: Platform takes 5% fee, RW gets 95%.
        // If Direct/RW pays Platform: Platform 100%.
        
        $splits = [];
        $amount = $invoice->amount;

        if ($invoice->tenant_id !== $invoice->billing_owner_id) {
            // RT paying RW
            $platformFee = $amount * 0.05; // 5% fee
            $rwAmount = $amount - $platformFee;

            $splits[] = [
                'type' => 'PLATFORM',
                'id' => null,
                'amount' => $platformFee
            ];
            $splits[] = [
                'type' => 'RW',
                'id' => $invoice->billing_owner_id,
                'amount' => $rwAmount
            ];
        } else {
            // Self-paying (RW paying Platform)
            $splits[] = [
                'type' => 'PLATFORM',
                'id' => null,
                'amount' => $amount
            ];
        }

        return $splits;
    }

    private function saveSplits(Invoice $invoice, array $splits)
    {
        $invoice->revenueSplits()->delete();

        foreach ($splits as $split) {
            InvoiceRevenueSplit::create([
                'invoice_id' => $invoice->id,
                'target_type' => $split['type'],
                'target_tenant_id' => $split['id'],
                'amount' => $split['amount'],
            ]);
        }
    }

    private function mockGatewayCall(Invoice $invoice, array $splits)
    {
        return [
            'id' => 'xen_' . uniqid(),
            'external_id' => $invoice->invoice_number,
            'status' => 'PENDING',
            'invoice_url' => 'https://checkout-staging.xendit.co/web/' . uniqid(),
            'expiry_date' => now()->addDay()->toIso8601String(),
        ];
    }
}
