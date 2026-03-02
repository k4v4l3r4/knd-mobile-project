<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\BelongsToTenant;

class EmergencyAlert extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'user_id',
        'rt_id',
        'type',
        'status',
        'latitude',
        'longitude',
        'description',
        'tenant_id',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
