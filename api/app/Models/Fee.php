<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\BelongsToTenant;

class Fee extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'rt_id',
        'name',
        'amount',
        'description',
        'is_mandatory',
        'billing_day',
    ];

    protected $casts = [
        'is_mandatory' => 'boolean',
        'amount' => 'decimal:2',
        'billing_day' => 'integer',
    ];

    public function rt()
    {
        return $this->belongsTo(WilayahRt::class, 'rt_id');
    }
}
