<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PasswordOtp extends Model
{
    use HasFactory;

    protected $fillable = [
        'phone',
        'code',
        'expires_at',
        'attempts',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
    ];

    public function scopeForPhone(Builder $query, string $phone): Builder
    {
        return $query->where('phone', $phone);
    }
}

