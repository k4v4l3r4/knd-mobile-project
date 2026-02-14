<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\BelongsToTenant;

class RondaLocation extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'rt_id',
        'name',
        'latitude',
        'longitude',
        'radius_meters',
        'qr_token',
        'token_expires_at',
        'tenant_id',
    ];

    protected $casts = [
        'latitude' => 'decimal:8',
        'longitude' => 'decimal:8',
        'radius_meters' => 'integer',
        'token_expires_at' => 'datetime',
    ];

    public function rt()
    {
        return $this->belongsTo(WilayahRt::class, 'rt_id');
    }
}
