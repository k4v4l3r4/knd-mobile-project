<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Traits\BelongsToTenant;

class RondaFineSetting extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'rt_id',
        'fine_type',
        'amount',
        'tolerance_minutes',
        'is_active',
        'tenant_id',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'amount' => 'integer',
        'tolerance_minutes' => 'integer',
    ];

    public function rt()
    {
        return $this->belongsTo(WilayahRt::class, 'rt_id');
    }
}
