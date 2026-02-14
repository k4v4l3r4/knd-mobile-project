<?php

namespace App\Console\Commands;

use App\Models\Invoice;
use App\Models\Subscription;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class GenerateRecurringInvoices extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'billing:recurring-check';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Generate renewal invoices for subscriptions expiring soon (7 days)';

    /**
     * Pricing Config (Should match BillingController)
     */
    protected $prices = [
        'MONTHLY' => 150000,
        'YEARLY' => 1500000,
        'LIFETIME' => 3000000
    ];

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Starting recurring invoice check...');

        // 1. Find Active Subscriptions expiring within next 7 days
        // AND not LIFETIME
        $targetDate = Carbon::now()->addDays(7)->endOfDay();
        
        $expiringSubscriptions = Subscription::where('status', Subscription::STATUS_ACTIVE)
            ->where('subscription_type', '!=', Subscription::TYPE_LIFETIME)
            ->whereDate('ends_at', '<=', $targetDate)
            ->whereDate('ends_at', '>', Carbon::now()) // Don't process already expired ones blindly (could have other logic)
            ->get();

        $this->info("Found {$expiringSubscriptions->count()} expiring subscriptions.");

        foreach ($expiringSubscriptions as $sub) {
            $this->processSubscription($sub);
        }

        $this->info('Recurring invoice check completed.');
    }

    protected function processSubscription(Subscription $sub)
    {
        // Check if an UNPAID invoice already exists for the NEXT period
        // Logic: Check if there is an invoice linked to this sub (or tenant) 
        // with service_period_start > current sub ends_at
        
        // Note: Our current model links Invoice -> Subscription.
        // A renewal invoice usually implies extending the SAME subscription or creating a new one.
        // For simplicity in this system: We create a NEW Invoice linked to the SAME Subscription.
        // When paid, the Subscription dates are updated.
        
        $existingInvoice = Invoice::where('subscription_id', $sub->id)
            ->where('status', Invoice::STATUS_UNPAID)
            ->where('service_period_start', '>=', $sub->ends_at->format('Y-m-d'))
            ->first();

        if ($existingInvoice) {
            $this->line("Skipping Subscription #{$sub->id}: Invoice {$existingInvoice->invoice_number} already pending.");
            return;
        }

        // Calculate Next Period
        $currentEnd = $sub->ends_at; // Carbon instance
        $nextStart = $currentEnd->copy()->addSecond(); // Start right after end
        
        $nextEnd = $nextStart->copy();
        if ($sub->plan_code === 'YEARLY') {
            $nextEnd->addYear();
        } else {
            $nextEnd->addMonth();
        }

        // Determine Price
        $price = $this->prices[$sub->plan_code] ?? 0;
        if ($price === 0) {
            $this->error("Unknown plan code {$sub->plan_code} for Subscription #{$sub->id}");
            return;
        }

        try {
            DB::transaction(function () use ($sub, $nextStart, $nextEnd, $price) {
                $invoice = Invoice::create([
                    'invoice_number' => 'INV-REN-' . date('Y') . '-' . str_pad(mt_rand(1, 999999), 6, '0', STR_PAD_LEFT),
                    'tenant_id' => $sub->tenant_id,
                    'billing_owner_id' => $sub->tenant_id, // Assuming self-billed for now (RW logic might require check)
                    'invoice_type' => Invoice::TYPE_SUBSCRIPTION,
                    'plan_code' => $sub->plan_code,
                    'subscription_id' => $sub->id,
                    'amount' => $price,
                    'status' => Invoice::STATUS_UNPAID,
                    'service_period_start' => $nextStart,
                    'service_period_end' => $nextEnd,
                    'issued_at' => Carbon::now(),
                    'payment_method' => 'MANUAL',
                    'notes' => "Automatic Renewal for period " . $nextStart->format('Y-m-d') . " to " . $nextEnd->format('Y-m-d'),
                ]);
                
                $this->info("Created Invoice {$invoice->invoice_number} for Subscription #{$sub->id}");
            });
        } catch (\Exception $e) {
            $this->error("Failed to create invoice for Subscription #{$sub->id}: " . $e->getMessage());
        }
    }
}
