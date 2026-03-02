<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class WilayahRw extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'wilayah_rw';

    protected $fillable = [
        'tenant_id',
        'name',
        'code',
        'address',
        'subscription_status',
        'subscription_end_date',
        'expired_at',
    ];

    protected $casts = [
        'subscription_end_date' => 'date',
        'expired_at' => 'datetime',
    ];

    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }
}
