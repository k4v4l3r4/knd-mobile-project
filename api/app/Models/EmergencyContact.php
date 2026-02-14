<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\BelongsToTenant;

class EmergencyContact extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'rt_id',
        'name',
        'number',
        'icon',
        'type',
        'tenant_id',
    ];
}
