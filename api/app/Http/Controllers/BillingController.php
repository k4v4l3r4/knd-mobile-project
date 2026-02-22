<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Tenant;
use App\Models\Subscription;
use App\Models\Role;
use App\Services\RWJoinService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Carbon\Carbon;

use App\Models\Invoice;
use App\Services\Payment\PaymentResolverService;

class BillingController extends Controller
{
    protected $paymentResolver;

    public function __construct(PaymentResolverService $paymentResolver)
    {
        $this->paymentResolver = $paymentResolver;
    }

    /**
     * Process Payment for an Invoice.
     * POST /api/payments/pay
     */
    public function pay(Request $request)
    {
        $request->validate([
            'invoice_id' => 'required|exists:invoices,id'
        ]);

        $invoice = Invoice::findOrFail($request->invoice_id);
        $user = Auth::user();

        // 1. Authorization & Policy Check
        $this->authorize('view', $invoice); // Ensure user owns/can manage this invoice

        // 2. Block DEMO (Double Check)
        if ($user->tenant && $user->tenant->status === 'DEMO') {
            return response()->json(['message' => 'DEMO tenants cannot perform payments.'], 403);
        }

        // 3. Resolve Strategy
        try {
            $strategy = $this->paymentResolver->resolve($invoice);
            
            // 4. Execute Payment
            $result = $strategy->pay($invoice);

            return response()->json([
                'success' => true,
                'status' => $result->status,
                'payment_mode' => $result->paymentMode,
                'provider' => $result->provider,
                'instruction' => $result->instruction
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Payment processing failed: ' . $e->getMessage()
            ], 500);
        }
    }

    public function subscribe(Request $request, RWJoinService $rwJoinService)
    {
        $user = Auth::user();
        $tenant = $user->tenant;

        // 1. Validations
        if (!$tenant) {
            return response()->json(['message' => 'Tenant not found'], 404);
        }

        // Check if DEMO
        if ($tenant->tenant_type === Tenant::TYPE_DEMO) {
            return response()->json(['message' => 'Demo tenant cannot subscribe'], 403);
        }

        // RULE 5: RT dengan billing_mode = RW tidak boleh subscribe sendiri
        if ($tenant->billing_mode === Tenant::BILLING_MODE_RW) {
            return response()->json(['message' => 'Your billing is managed by your RW. You cannot subscribe individually.'], 403);
        }

        // Check Role (Must be ADMIN_RW or ADMIN_RT depending on level)
        $roleCode = $user->userRole ? $user->userRole->role_code : null;
        
        if (strtoupper($tenant->level) === 'RW') {
            if ($roleCode !== 'ADMIN_RW') {
                return response()->json(['message' => 'Only ADMIN_RW can perform billing actions'], 403);
            }
        } elseif (strtoupper($tenant->level) === 'RT') {
             if ($roleCode !== 'ADMIN_RT') {
                return response()->json(['message' => 'Only ADMIN_RT can perform billing actions'], 403);
            }
        }

        // Validate Input
        $request->validate([
            'plan_code' => 'required|string',
            'subscription_type' => 'required|in:' . Subscription::TYPE_SUBSCRIPTION . ',' . Subscription::TYPE_LIFETIME,
            'billing_period' => 'required_if:subscription_type,' . Subscription::TYPE_SUBSCRIPTION . '|in:' . Subscription::PERIOD_MONTHLY . ',' . Subscription::PERIOD_YEARLY,
            'price' => 'required|numeric|min:0', 
        ]);

        $price = $request->input('price', 0);
        
        DB::beginTransaction();
        try {
            // 2. Logic
            $now = now();
            $startsAt = $now;
            $endsAt = null;

            if ($request->subscription_type === Subscription::TYPE_SUBSCRIPTION) {
                if ($request->billing_period === Subscription::PERIOD_MONTHLY) {
                    $endsAt = $now->copy()->addMonth();
                } else {
                    $endsAt = $now->copy()->addYear();
                }
            }
            // LIFETIME: endsAt remains null

            // Do NOT deactivate previous subscriptions yet.
            // Only deactivate when invoice is PAID.
            
            // Create new Subscription (PENDING/UNPAID)
            $subscription = Subscription::create([
                'tenant_id' => $tenant->id,
                'plan_code' => $request->plan_code,
                'subscription_type' => $request->subscription_type,
                'billing_period' => $request->subscription_type === Subscription::TYPE_LIFETIME ? null : $request->billing_period,
                'price' => $price,
                'starts_at' => $startsAt,
                'ends_at' => $endsAt,
                'status' => Subscription::STATUS_UNPAID, // Changed from ACTIVE
                'payment_reference' => null, // Will be set when paid
                'covered_scope' => strtoupper($tenant->level) === 'RW' ? Subscription::SCOPE_RW_ALL : Subscription::SCOPE_RT_ONLY,
                'source' => strtoupper($tenant->level) === 'RW' ? Subscription::SOURCE_RW_MASTER : Subscription::SOURCE_RT_SELF,
            ]);

            // Create Invoice
            $invoice = Invoice::create([
                'invoice_number' => 'INV-' . date('Y') . '-' . str_pad(mt_rand(1, 999999), 6, '0', STR_PAD_LEFT), // Logic should be better, but acceptable for now
                'tenant_id' => $tenant->id,
                'billing_owner_id' => $tenant->id, // Payer is self (RW or independent RT)
                'invoice_type' => $request->subscription_type === Subscription::TYPE_LIFETIME ? Invoice::TYPE_LIFETIME : Invoice::TYPE_SUBSCRIPTION,
                'plan_code' => $request->plan_code,
                'subscription_id' => $subscription->id,
                'amount' => $price,
                'status' => Invoice::STATUS_UNPAID,
                'service_period_start' => $startsAt,
                'service_period_end' => $endsAt,
                'issued_at' => $now,
                'payment_method' => 'MANUAL', // Default
                'notes' => $request->subscription_type === Subscription::TYPE_LIFETIME 
                    ? "Lifetime access granted as long as the RT–RW Digital System operates." 
                    : null,
            ]);

            DB::commit();

            return response()->json([
                'message' => 'Invoice created. Please make payment.',
                'invoice' => $invoice,
                'subscription' => $subscription
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Subscription failed: ' . $e->getMessage()], 500);
        }
    }

    public function plans(Request $request)
    {
        $defaultPlans = [
            'BASIC_RW_MONTHLY' => [
                'price' => 150000,
                'discount_percent' => 0,
            ],
            'BASIC_RW_YEARLY' => [
                'price' => 1500000,
                'discount_percent' => 0,
            ],
            'LIFETIME_RW' => [
                'price' => 5000000,
                'discount_percent' => 0,
            ],
        ];

        $storedPlans = [];

        if (Storage::disk('local')->exists('payment_settings.json')) {
            $settings = json_decode(Storage::disk('local')->get('payment_settings.json'), true);
            if (isset($settings['plans']) && is_array($settings['plans'])) {
                $storedPlans = $settings['plans'];
            }
        }

        $plans = [];

        foreach ($defaultPlans as $code => $planDefaults) {
            $config = isset($storedPlans[$code]) && is_array($storedPlans[$code]) ? $storedPlans[$code] : [];

            $price = isset($config['price']) ? (float) $config['price'] : $planDefaults['price'];
            $discountPercent = isset($config['discount_percent']) ? (float) $config['discount_percent'] : $planDefaults['discount_percent'];

            if ($discountPercent < 0) {
                $discountPercent = 0;
            }

            if ($discountPercent > 100) {
                $discountPercent = 100;
            }

            $plans[] = [
                'id' => $code,
                'price' => $price,
                'discount_percent' => $discountPercent,
            ];
        }

        return response()->json([
            'success' => true,
            'data' => $plans,
        ]);
    }

    public function hierarchy(Request $request)
    {
        $user = Auth::user();
        $tenant = $user->tenant;

        if (!$tenant) {
            return response()->json(['message' => 'Tenant not found'], 404);
        }

        $data = [
            'tenant_id' => $tenant->id,
            'name' => $tenant->name,
            'level' => $tenant->level,
            'billing_mode' => $tenant->billing_mode,
            'billing_owner_id' => $tenant->billing_owner_id,
            'status' => $tenant->status,
        ];

        if ($tenant->billing_owner_id) {
            $owner = Tenant::find($tenant->billing_owner_id);
            if ($owner) {
                $data['billing_owner_name'] = $owner->name;
                $data['billing_owner_status'] = $owner->status;
            }
        }

        if (strtoupper($tenant->level) === 'RW') {
            // Show covered RTs
            $data['covered_rts'] = Tenant::where('billing_owner_id', $tenant->id)
                ->where('billing_mode', Tenant::BILLING_MODE_RW)
                ->get()
                ->map(function ($rt) {
                    return [
                        'id' => $rt->id,
                        'name' => $rt->name,
                        'status' => $rt->status,
                        'is_lifetime' => $rt->subscriptions()
                                        ->where('subscription_type', Subscription::TYPE_LIFETIME)
                                        ->where('status', Subscription::STATUS_ACTIVE)
                                        ->exists()
                    ];
                });
        }

        return response()->json($data);
    }

    public function current(Request $request)
    {
        $user = Auth::user();
        $tenant = $user->tenant;

        if (!$tenant) {
            return response()->json(['message' => 'Tenant not found'], 404);
        }

        $tenantStatus = $tenant->status ?: Tenant::STATUS_DEMO;
        $billingMode = $tenant->billing_mode ?: Tenant::BILLING_MODE_RT;

        $activeSub = $tenant->activeSubscription;
        $isLifetime = $tenant->hasLifetimeAccess();
        $remainingDays = null;

        if ($activeSub && !$isLifetime && $activeSub->ends_at) {
            $remainingDays = now()->diffInDays($activeSub->ends_at, false);
            if ($remainingDays < 0) {
                $remainingDays = 0;
            }
        }

        $subscriptionData = null;

        if ($activeSub) {
            $planNames = [
                'BASIC_RW_MONTHLY' => 'Paket Basic Bulanan',
                'BASIC_RW_YEARLY' => 'Paket Basic Tahunan',
                'LIFETIME_RW' => 'Paket Lifetime',
            ];

            $planName = $planNames[$activeSub->plan_code] ?? $activeSub->plan_code;

            if ($activeSub->subscription_type === Subscription::TYPE_LIFETIME) {
                $type = 'LIFETIME';
            } else {
                $type = $activeSub->billing_period === Subscription::PERIOD_YEARLY ? 'YEARLY' : 'MONTHLY';
            }

            $start = $activeSub->starts_at ?? $tenant->subscription_started_at ?? now();
            $end = $activeSub->ends_at ?? $tenant->subscription_ended_at;

            $subscriptionData = [
                'id' => $activeSub->id,
                'plan_name' => $planName,
                'type' => $type,
                'status' => $activeSub->status,
                'start_date' => $start->toIso8601String(),
                'end_date' => $end ? $end->toIso8601String() : null,
                'remaining_days' => $remainingDays,
            ];
        }

        $pendingInvoice = Invoice::where('tenant_id', $tenant->id)
            ->whereIn('status', [Invoice::STATUS_UNPAID, Invoice::STATUS_PAYMENT_RECEIVED])
            ->latest('issued_at')
            ->first();

        $pendingInvoiceData = null;

        if ($pendingInvoice) {
            $createdAt = $pendingInvoice->issued_at ?: $pendingInvoice->created_at;
            $dueAt = $pendingInvoice->due_at ?: $pendingInvoice->service_period_end;

            $pendingInvoiceData = [
                'id' => $pendingInvoice->id,
                'invoice_number' => $pendingInvoice->invoice_number,
                'status' => $pendingInvoice->status,
                'amount' => (float) $pendingInvoice->amount,
                'total_amount' => (float) $pendingInvoice->amount,
                'invoice_type' => $pendingInvoice->invoice_type,
                'payment_mode' => $pendingInvoice->payment_mode ?: Invoice::PAYMENT_MODE_CENTRALIZED,
                'payment_channel' => $pendingInvoice->payment_channel,
                'payment_code' => $pendingInvoice->payment_code,
                'payment_instruction' => null,
                'created_at' => $createdAt ? $createdAt->toIso8601String() : null,
                'due_date' => $dueAt ? $dueAt->toIso8601String() : null,
            ];
        }

        $userRoleModel = $user->userRole;
        $roleCode = $userRoleModel ? $userRoleModel->role_code : (is_string($user->role) ? $user->role : null);

        $canSubscribe = false;
        $message = null;

        if ($tenantStatus !== Tenant::STATUS_DEMO) {
            if ($billingMode === Tenant::BILLING_MODE_RW && strtoupper((string) $tenant->level) === 'RT') {
                $canSubscribe = false;
                $message = 'Billing dikelola oleh RW. Anda tidak perlu membayar.';
            } else {
                if (in_array($roleCode, ['ADMIN_RW', 'ADMIN_RT', 'SUPER_ADMIN'], true) && !$pendingInvoice) {
                    $canSubscribe = true;
                }
            }
        }

        return response()->json([
            'tenant_status' => $tenantStatus,
            'billing_mode' => $billingMode,
            'subscription' => $subscriptionData,
            'pending_invoice' => $pendingInvoiceData,
            'can_subscribe' => $canSubscribe,
            'message' => $message,
        ]);
    }
}
