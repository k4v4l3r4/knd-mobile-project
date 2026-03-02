<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Subscription extends Model
{
    use HasFactory;

    // Subscription Types
    const TYPE_SUBSCRIPTION = 'SUBSCRIPTION';
    const TYPE_LIFETIME = 'LIFETIME';

    // Statuses
    const STATUS_PENDING = 'PENDING';
    const STATUS_ACTIVE = 'ACTIVE';
    const STATUS_EXPIRED = 'EXPIRED';
    const STATUS_CANCELED = 'CANCELED';
    const STATUS_UNPAID = 'UNPAID';

    // Billing Periods
    const PERIOD_MONTHLY = 'MONTHLY';
    const PERIOD_YEARLY = 'YEARLY';

    // Coverage Scopes
    const SCOPE_RT_ONLY = 'RT_ONLY';
    const SCOPE_RW_ALL = 'RW_ALL';

    // Sources
    const SOURCE_RT_SELF = 'RT_SELF';
    const SOURCE_RW_MASTER = 'RW_MASTER';

    protected $fillable = [
        'tenant_id',
        'plan_code',
        'subscription_type',
        'billing_period',
        'price',
        'starts_at',
        'ends_at',
        'status',
        'payment_reference',
        'covered_scope',
        'source',
    ];

    protected $casts = [
        'starts_at' => 'datetime',
        'ends_at' => 'datetime',
        'price' => 'decimal:2',
    ];

    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }

    public function isLifetime()
    {
        return $this->subscription_type === self::TYPE_LIFETIME;
    }

    public function isActive()
    {
        return $this->status === self::STATUS_ACTIVE;
    }
}
