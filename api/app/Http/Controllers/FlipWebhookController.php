<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Invoice;
use App\Models\Tenant;
use Illuminate\Support\Facades\Log;

class FlipWebhookController extends Controller
{
    /**
     * Handle Flip Payment Notification.
     * POST /api/webhooks/flip/payment
     */
    public function handlePayment(Request $request)
    {
        // 1. Verify Signature (Mock logic as per requirement)
        // In production, we would check 'X-Flip-Signature' or similar using the secret key.
        // For now, we simulate basic validation.
        
        $payload = $request->all();
        
        // Basic payload structure expected from Flip (simplified)
        // {
        //   "id": "flip_trx_id",
        //   "amount": 100500,
        //   "status": "SUCCESSFUL",
        //   "sender_bank": "bca",
        //   "bill_link_id": "...", // or invoice ID reference if passed
        //   "external_id": "INV-2026-...", // We usually map this to our invoice number
        // }

        $externalId = $payload['external_id'] ?? null;
        $flipTrxId = $payload['id'] ?? null;
        $status = $payload['status'] ?? null;
        $amount = $payload['amount'] ?? 0;

        if (!$externalId || !$flipTrxId) {
             return response()->json(['message' => 'Invalid payload'], 400);
        }

        // 2. Find Invoice
        // We match external_id to invoice_number or payment_code?
        // Usually Flip allows passing external_id. Let's assume it matches invoice_number.
        $invoice = Invoice::where('invoice_number', $externalId)->first();

        if (!$invoice) {
            // Try matching by payment_code if external_id isn't invoice number?
            // Prompt says: "payment_code matches". 
            // If payment_code was used as part of transfer amount, maybe we check amount?
            // But usually Flip sends a callback with the ID we gave them.
            // Let's assume we gave invoice_number as external_id.
            
            Log::warning("Flip Webhook: Invoice not found for external_id: $externalId");
            return response()->json(['message' => 'Invoice not found'], 404);
        }

        // 3. Block DEMO (Security)
        if ($invoice->tenant->status === 'DEMO') {
            Log::warning("Flip Webhook: Blocked DEMO tenant invoice: {$invoice->invoice_number}");
            return response()->json(['message' => 'DEMO tenant blocked'], 403);
        }

        // 4. Idempotency Check
        if ($invoice->flip_transaction_id === $flipTrxId) {
             // Already processed this transaction
             return response()->json(['message' => 'Already processed'], 200);
        }

        // 5. Status & Amount Validation
        // If invoice is already PAID or PAYMENT_RECEIVED, we might just update ID if missing, or ignore.
        if ($invoice->status === Invoice::STATUS_PAID || $invoice->status === Invoice::STATUS_PAYMENT_RECEIVED) {
            return response()->json(['message' => 'Invoice already processed'], 200);
        }

        if ($invoice->status !== Invoice::STATUS_UNPAID) {
             // If CANCELED/FAILED/DRAFT, typically we reject or investigate.
             // Prompt says: "Validate invoice.status = UNPAID"
             return response()->json(['message' => 'Invoice status invalid'], 400);
        }

        // Check Channel
        // Prompt says: "payment_channel = FLIP"
        // But what if user selected MANUAL and then paid via Flip (unlikely)?
        // Or if we just want to enforce that this webhook only processes Flip invoices?
        if ($invoice->payment_channel !== Invoice::CHANNEL_FLIP) {
             // Strictly following requirement.
             return response()->json(['message' => 'Invoice channel mismatch'], 400);
        }

        // Check Amount
        // Centralized payment usually includes unique code in total.
        // PaymentInstructionService: $instruction['amount_total'] = $invoice->amount + (int)$code;
        // The webhook amount should match this expected total.
        
        $expectedAmount = $invoice->amount;
        if (!empty($invoice->payment_code)) {
            $expectedAmount += (int)$invoice->payment_code;
        }

        // Floating point comparison
        if (abs($amount - $expectedAmount) > 1.0) {
            Log::error("Flip Webhook: Amount mismatch. Expected $expectedAmount, got $amount");
            return response()->json(['message' => 'Amount mismatch'], 400);
        }

        // 6. Action: Mark PAYMENT_RECEIVED
        if ($status === 'SUCCESSFUL') {
            $invoice->update([
                'status' => Invoice::STATUS_PAYMENT_RECEIVED,
                'flip_transaction_id' => $flipTrxId,
                'payment_received_at' => now(),
            ]);

            Log::info("Flip Webhook: Invoice {$invoice->invoice_number} marked as PAYMENT_RECEIVED.");
        } else {
             // Handle failed/pending?
             Log::info("Flip Webhook: Transaction status $status ignored.");
        }

        return response()->json(['success' => true]);
    }
}
