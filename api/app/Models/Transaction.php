<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Traits\BelongsToTenant;

class Transaction extends Model
{
    use HasFactory, SoftDeletes, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'rt_id',
        'account_id',
        'user_id',
        'type',
        'amount',
        'category',
        'description',
        'items',
        'date',
        'proof_url',
        'status',
    ];

    protected $casts = [
        'items' => 'array',
        'date' => 'date',
    ];

    public function wallet()
    {
        return $this->belongsTo(Wallet::class, 'account_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
