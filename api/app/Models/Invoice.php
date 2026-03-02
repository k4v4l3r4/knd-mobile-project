<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Invoice extends Model
{
    use HasFactory;

    // Invoice Types
    const TYPE_SUBSCRIPTION = 'SUBSCRIPTION';
    const TYPE_LIFETIME = 'LIFETIME';

    // Payment Channels
    const CHANNEL_MANUAL = 'MANUAL';
    const CHANNEL_FLIP = 'FLIP';

    // Statuses
    const STATUS_DRAFT = 'DRAFT';
    const STATUS_UNPAID = 'UNPAID';
    const STATUS_PAYMENT_RECEIVED = 'PAYMENT_RECEIVED'; // Money in, but not activated
    const STATUS_PAID = 'PAID'; // Activated
    const STATUS_CANCELED = 'CANCELED';
    const STATUS_REFUNDED = 'REFUNDED';
    const STATUS_FAILED = 'FAILED';

    // Payment Modes
    const PAYMENT_MODE_SPLIT = 'SPLIT';
    const PAYMENT_MODE_CENTRALIZED = 'CENTRALIZED';

    // Payment Providers
    const PROVIDER_FLIP = 'FLIP';
    const PROVIDER_XENDIT = 'XENDIT';
    const PROVIDER_MIDTRANS = 'MIDTRANS';
    const PROVIDER_MANUAL = 'MANUAL';

    protected $fillable = [
        'invoice_number',
        'tenant_id',
        'billing_owner_id',
        'invoice_type',
        'plan_code',
        'subscription_id',
        'amount',
        'currency',
        'status',
        'payment_mode',
        'payment_provider',
        'payment_channel',
        'payment_code',
        'payment_meta',
        'flip_transaction_id',
        'payment_received_at',
        'service_period_start',
        'service_period_end',
        'issued_at',
        'due_at',
        'paid_at',
        'payment_method',
        'payment_reference',
        'notes',
    ];

    protected $casts = [
        'service_period_start' => 'datetime',
        'service_period_end' => 'datetime',
        'issued_at' => 'datetime',
        'due_at' => 'datetime',
        'paid_at' => 'datetime',
        'payment_received_at' => 'datetime',
        'payment_meta' => 'array',
    ];

    // Relationships
    public function tenant()
    {
        return $this->belongsTo(Tenant::class, 'tenant_id');
    }

    public function billingOwner()
    {
        return $this->belongsTo(Tenant::class, 'billing_owner_id');
    }

    public function subscription()
    {
        return $this->belongsTo(Subscription::class, 'subscription_id');
    }

    public function revenueSplits()
    {
        return $this->hasMany(InvoiceRevenueSplit::class);
    }

    // Helpers
    public function isPaid()
    {
        return $this->status === self::STATUS_PAID;
    }

    public function isLifetime()
    {
        return $this->invoice_type === self::TYPE_LIFETIME;
    }

    public function isSubscription()
    {
        return $this->invoice_type === self::TYPE_SUBSCRIPTION;
    }

    public function isOverdue()
    {
        return $this->status === self::STATUS_UNPAID && 
               $this->due_at && 
               now()->greaterThan($this->due_at);
    }
}
