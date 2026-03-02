<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\BelongsToTenant;

class KasTransaction extends Model
{
    use HasFactory, BelongsToTenant;

    protected $guarded = ['id'];

    protected $casts = [
        'amount' => 'integer',
        'rt_id' => 'integer',
        'source_id' => 'integer',
    ];

    public function scopeRt($query, $rtId)
    {
        return $query->where('rt_id', $rtId);
    }
}
