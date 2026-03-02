<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Traits\BelongsToTenant;

class Cctv extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'rt_id',
        'label',
        'stream_url',
        'location',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];
}
