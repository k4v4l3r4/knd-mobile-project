<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Traits\BelongsToTenant;

class Asset extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'rt_id',
        'name',
        'description',
        'image_url',
        'total_quantity',
        'available_quantity',
        'condition',
    ];

    protected $casts = [
        'total_quantity' => 'integer',
        'available_quantity' => 'integer',
    ];

    public function loans(): HasMany
    {
        return $this->hasMany(AssetLoan::class);
    }
    
    public function rt(): BelongsTo
    {
        return $this->belongsTo(WilayahRt::class, 'rt_id');
    }
}
