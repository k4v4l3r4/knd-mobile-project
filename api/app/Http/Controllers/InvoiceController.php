<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\Subscription;
use App\Models\Tenant;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

use Barryvdh\DomPDF\Facade\Pdf;

class InvoiceController extends Controller
{
    /**
     * Get the current invoice details.
     * Returns the latest invoice for the tenant (billing owner).
     */
    public function current(Request $request)
    {
        $user = Auth::user();
        
        // Ensure user has a tenant
        if (!$user->tenant) {
            return response()->json(['message' => 'User does not belong to a tenant'], 403);
        }

        // Only ADMIN_RW or ADMIN_RT can view invoices
        if (!in_array($user->userRole->role_code, ['ADMIN_RW', 'ADMIN_RT'])) {
             return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Find the latest invoice for this tenant (billing owner)
        $invoice = Invoice::where('billing_owner_id', $user->tenant->id)
            ->with(['subscription', 'tenant'])
            ->latest()
            ->first();

        if (!$invoice) {
            return response()->json([
                'success' => true,
                'data' => null,
                'message' => 'No invoices found'
            ]);
        }
        
        // Use policy to authorize
        $this->authorize('view', $invoice);

        return response()->json([
            'success' => true,
            'data' => $invoice
        ]);
    }

    /**
     * Mark an invoice as PAID (Manual Admin Confirmation).
     * This endpoint is strictly for Admin use (in a real app, this would be a webhook from Payment Gateway).
     * Since we don't have a PG, we allow manual confirmation by the Admin (Self-Verify for now, or SuperAdmin).
     * NOTE: In a real scenario, a Tenant wouldn't mark their own invoice as PAID. 
     * However, for this task, the requirement is "Manual confirmation (admin only)". 
     * We will assume this is an internal admin action or a "Simulate Payment" button for the Demo.
     */
    public function markPaid(Request $request, Invoice $invoice)
    {
        // 1. Authorization
        $this->authorize('markPaid', $invoice);

        // 2. Validation
        if ($invoice->status !== Invoice::STATUS_UNPAID) {
            return response()->json([
                'success' => false,
                'message' => 'Invoice is not in UNPAID status.'
            ], 400);
        }

        try {
            DB::beginTransaction();

            // 3. Update Invoice
            $invoice->update([
                'status' => Invoice::STATUS_PAID,
                'paid_at' => now(),
                'payment_method' => 'MANUAL_ADMIN',
            ]);

            // 4. Activate Subscription & Update Dates
            $subscription = $invoice->subscription;
            if ($subscription) {
                $now = now();
                $updates = ['status' => Subscription::STATUS_ACTIVE];

                // If it's a subscription (not lifetime), shift dates to start NOW
                if ($subscription->subscription_type === Subscription::TYPE_SUBSCRIPTION) {
                    $originalStart = $subscription->starts_at;
                    $originalEnd = $subscription->ends_at;
                    
                    // Calculate duration (e.g. 1 month)
                    // If originalStart is null (shouldn't be), default to 1 month
                    if ($originalStart && $originalEnd) {
                        $durationInDays = $originalStart->diffInDays($originalEnd);
                        // Shift dates
                        $updates['starts_at'] = $now;
                        $updates['ends_at'] = $now->copy()->addDays($durationInDays);
                        
                        // Also update Invoice service period to match actual service delivered
                        $invoice->update([
                            'service_period_start' => $updates['starts_at'],
                            'service_period_end' => $updates['ends_at']
                        ]);
                    }
                }
                
                $subscription->update($updates);
            }

            // 5. Update Tenant Status
            $tenant = $invoice->tenant;
            $tenant->status = Tenant::STATUS_ACTIVE;
            $tenant->save();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Invoice marked as PAID. Subscription activated.',
                'data' => $invoice->fresh(['subscription', 'tenant'])
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to process payment: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Download Invoice as PDF.
     */
    public function download(Invoice $invoice)
    {
        // 1. Authorization
        $this->authorize('view', $invoice);
        
        // 2. Security Checks
        $user = Auth::user();
        
        // Ensure strictly ADMIN_RW or ADMIN_RT (double check, although Policy usually handles this)
        if (!in_array($user->role->role_code, ['ADMIN_RW', 'ADMIN_RT'])) {
            abort(403, 'Unauthorized. Only Admin RT/RW can download invoices.');
        }

        // Block DEMO tenants from downloading invoices if strict requirement
        // Prompt says "Tenant DEMO ditolak"
        // We assume 'is_demo' flag or checking tenant status if it's strictly 'DEMO'
        // Based on memory: Tenant Feature Gate: DEMO (Read-only, Block Export/Billing/Integration)
        // If tenant status is 'DEMO', we block.
        if ($user->tenant->status === 'DEMO') {
             abort(403, 'DEMO Tenants are not allowed to download invoices.');
        }

        // 3. Load Relationships
        $invoice->load(['tenant', 'subscription', 'billingOwner']);

        // 4. Generate PDF
        $pdf = Pdf::loadView('invoices.invoice_pdf', [
            'invoice' => $invoice,
            'tenant' => $invoice->tenant,
            'subscription' => $invoice->subscription
        ]);

        // 5. Download
        return $pdf->download('invoice-' . $invoice->invoice_number . '.pdf');
    }
}
