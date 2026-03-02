<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Tenant;
use App\Services\BillingNotificationService;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class SendTenantBillingReminders extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'billing:send-reminders';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Send billing reminders to tenants whose subscription is expiring soon.';

    protected $notificationService;

    /**
     * Create a new command instance.
     *
     * @param BillingNotificationService $notificationService
     */
    public function __construct(BillingNotificationService $notificationService)
    {
        parent::__construct();
        $this->notificationService = $notificationService;
    }

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Starting billing reminder process...');

        // Days before expiration to send reminders
        $daysToRemind = [7, 3, 1, 0]; 
        
        $today = Carbon::today();

        foreach ($daysToRemind as $days) {
            $targetDate = $today->copy()->addDays($days)->toDateString();
            
            $this->info("Checking for tenants expiring on {$targetDate} ({$days} days from now)");

            $tenants = Tenant::whereDate('subscription_ended_at', $targetDate)
                ->where('status', '!=', Tenant::STATUS_DEMO)
                ->where('billing_mode', Tenant::BILLING_MODE_RT) // Only tenants who pay directly
                ->get();

            foreach ($tenants as $tenant) {
                $this->processTenant($tenant, $days);
            }
        }

        $this->info('Billing reminder process completed.');
    }

    protected function processTenant(Tenant $tenant, int $daysRemaining)
    {
        $admin = $tenant->adminContact;

        if (!$admin) {
            Log::warning("Billing Reminder: No admin contact found for tenant ID {$tenant->id} ({$tenant->name})");
            return;
        }

        if (!$admin->email && !$admin->phone) {
            Log::warning("Billing Reminder: Admin contact for tenant ID {$tenant->id} has no email or phone.");
            return;
        }

        $dueDate = Carbon::parse($tenant->subscription_ended_at)->format('Y-m-d');
        
        // Construct URLs
        // Assuming the admin panel URL is stored in config or env, defaulting to known URL structure
        $baseUrl = config('app.url', 'https://admin.afnet.my.id');
        $paymentUrl = "{$baseUrl}/billing/pay"; // Or a specific payment link
        $supportUrl = "{$baseUrl}/support";

        $this->info("Sending reminder to {$admin->name} (Tenant: {$tenant->name}) - Expiring in {$daysRemaining} days");

        try {
            $this->notificationService->sendDualNotification(
                $admin,
                $dueDate,
                $paymentUrl,
                $supportUrl
            );
        } catch (\Exception $e) {
            Log::error("Billing Reminder: Failed to send notification to Tenant {$tenant->id}. Error: " . $e->getMessage());
        }
    }
}
