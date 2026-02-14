<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Traits\BelongsToTenant;

class AssetLoan extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'user_id',
        'asset_id',
        'quantity',
        'loan_date',
        'return_date',
        'status',
        'admin_note',
        'tenant_id',
    ];

    protected $casts = [
        'quantity' => 'integer',
        'loan_date' => 'date',
        'return_date' => 'date',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function asset(): BelongsTo
    {
        return $this->belongsTo(Asset::class);
    }
}
