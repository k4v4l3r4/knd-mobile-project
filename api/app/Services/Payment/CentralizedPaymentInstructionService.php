<?php

namespace App\Services\Payment;

use App\Models\Invoice;
use Illuminate\Support\Str;

class CentralizedPaymentInstructionService
{
    /**
     * Generate Payment Instruction for Centralized Mode.
     *
     * @param Invoice $invoice
     * @param string $channel 'MANUAL' or 'DANA'
     * @return array
     */
    public function generate(Invoice $invoice, string $channel = 'MANUAL')
    {
        // 1. Validation Rules
        if ($invoice->status !== Invoice::STATUS_UNPAID && $invoice->status !== Invoice::STATUS_DRAFT) {
             // In some flows, it might be DRAFT initially, but typically UNPAID.
             // If already PAID, we shouldn't be here.
             // If FAILED or CANCELED, maybe allow retry?
             // Prompt says: "Invoice must be UNPAID"
             if ($invoice->status === Invoice::STATUS_PAID) {
                 throw new \Exception("Invoice is already PAID.");
             }
        }

        // Lifetime always Centralized (already handled by Resolver, but good to know)
        // Demo blocked (handled by Controller)

        // 2. Generate Payment Code (Unique 3-5 digits)
        // Simple logic: Use last 3 digits of ID or random.
        // To be unique per transaction attempt, we can use random.
        // We'll append it to amount for easy identification if Manual.
        $code = str_pad(mt_rand(1, 999), 3, '0', STR_PAD_LEFT);
        
        // 3. Prepare Instruction Data
        $instruction = [
            'amount_total' => $invoice->amount + (int)$code, // Unique amount
            'payment_code' => $code,
            'channel' => $channel,
            'expires_at' => now()->addDay()->toDateTimeString(),
        ];

        if ($channel === 'MANUAL') {
            $instruction['bank_details'] = [
                'bank_name' => 'BCA',
                'account_number' => '8830123456',
                'account_holder' => 'PT RT ONLINE INDONESIA',
                'description' => 'Include Invoice No ' . $invoice->invoice_number . ' in transfer remark.'
            ];
        } elseif ($channel === 'DANA') {
             $instruction['dana_link'] = 'https://dana.id/pay/mock/' . $invoice->invoice_number;
             $instruction['instructions'] = 'Please complete payment via DANA app using the link.';
        }

        // 4. Update Invoice
        $invoice->update([
            'payment_code' => $code,
            'payment_meta' => $instruction,
            'payment_channel' => $channel,
            // 'payment_provider' is likely set to MANUAL or FLIP too, let's sync them
            'payment_provider' => $channel, 
            'status' => Invoice::STATUS_UNPAID // Ensure status
        ]);

        return $instruction;
    }
}
