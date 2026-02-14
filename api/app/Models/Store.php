<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\BelongsToTenant;

class Store extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'user_id',
        'rt_id',
        'name',
        'description',
        'image_url',
        'status', // pending, verified, rejected
        'verified_at',
        'category',
        'contact',
        'address',
        'tenant_id',
    ];

    protected $casts = [
        'verified_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function rt()
    {
        return $this->belongsTo(WilayahRt::class, 'rt_id');
    }

    public function products()
    {
        return $this->hasMany(Product::class);
    }
}
