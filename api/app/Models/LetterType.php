<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Traits\BelongsToTenant;

class LetterType extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'rt_id',
        'name',
        'code',
        'description',
        'is_active',
        'tenant_id',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function rt()
    {
        return $this->belongsTo(WilayahRt::class, 'rt_id');
    }
}
