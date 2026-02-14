<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Tenant extends Model
{
    use HasFactory, SoftDeletes;

    // Tenant Types
    const TYPE_DEMO = 'DEMO';
    const TYPE_LIVE = 'LIVE';

    // Tenant Statuses
    const STATUS_DEMO = 'DEMO';
    const STATUS_TRIAL = 'TRIAL';
    const STATUS_ACTIVE = 'ACTIVE';
    const STATUS_EXPIRED = 'EXPIRED';

    // Billing Modes
    const BILLING_MODE_RT = 'RT';
    const BILLING_MODE_RW = 'RW';

    protected $fillable = [
        'name',
        'level',
        'parent_tenant_id',
        'billing_owner_id',
        'billing_mode',
        'joined_rw_at',
        'tenant_type',
        'status',
        'trial_start_at',
        'trial_end_at',
        'subscription_started_at',
        'subscription_ended_at',
    ];

    protected $casts = [
        'trial_start_at' => 'datetime',
        'trial_end_at' => 'datetime',
        'subscription_started_at' => 'datetime',
        'subscription_ended_at' => 'datetime',
        'joined_rw_at' => 'datetime',
    ];

    public function parent()
    {
        return $this->belongsTo(Tenant::class, 'parent_tenant_id');
    }

    public function children()
    {
        return $this->hasMany(Tenant::class, 'parent_tenant_id');
    }

    public function users()
    {
        return $this->hasMany(User::class);
    }

    public function wilayah_rt()
    {
        return $this->hasOne(WilayahRt::class);
    }

    public function wilayah_rw()
    {
        return $this->hasOne(WilayahRw::class);
    }

    public function subscriptions()
    {
        return $this->hasMany(Subscription::class);
    }

    public function billingOwner()
    {
        return $this->belongsTo(Tenant::class, 'billing_owner_id');
    }

    // Helpers
    public function isTrial()
    {
        return $this->status === self::STATUS_TRIAL;
    }

    public function isExpired()
    {
        return $this->status === self::STATUS_EXPIRED;
    }

    public function remainingTrialDays()
    {
        if (!$this->trial_end_at || now()->greaterThan($this->trial_end_at)) {
            return 0;
        }
        return now()->diffInDays($this->trial_end_at);
    }

    public function activeSubscription()
    {
        return $this->subscriptions()
            ->where('status', Subscription::STATUS_ACTIVE)
            ->latest()
            ->first();
    }

    public function hasLifetimeAccess()
    {
        return $this->subscriptions()
            ->where('subscription_type', Subscription::TYPE_LIFETIME)
            ->where('status', Subscription::STATUS_ACTIVE)
            ->exists();
    }
}
