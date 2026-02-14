<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\BelongsToTenant;

class Product extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'rt_id',
        'user_id',
        'store_id',
        'name',
        'description',
        'price',
        'discount_price',
        'image_url',
        'images',
        'whatsapp', // Optional, kept for compatibility
        'shopee_url',
        'tokopedia_url',
        'facebook_url',
        'instagram_url',
        'tiktok_url',
        'category', // Optional, kept for compatibility
        'is_available',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'discount_price' => 'decimal:2',
        'images' => 'array',
        'is_available' => 'boolean',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function store()
    {
        return $this->belongsTo(Store::class);
    }
    
    public function rt()
    {
        return $this->belongsTo(WilayahRt::class, 'rt_id');
    }
}
