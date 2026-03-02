<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\BelongsToTenant;

use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;

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
        'is_open',
        'operating_hours',
    ];

    protected $casts = [
        'verified_at' => 'datetime',
        'is_open' => 'boolean',
        'operating_hours' => 'array',
    ];

    protected $appends = ['is_open_now', 'logo_url'];

    public function getLogoUrlAttribute()
    {
        if (!$this->image_url) {
            return null;
        }

        if (strpos($this->image_url, 'http') === 0) {
            return $this->image_url;
        }

        // Force API domain as requested
        $baseUrl = 'https://api.afnet.my.id';
        
        // Get the storage URL path (e.g. /storage/stores/filename.jpg)
        $storagePath = Storage::url($this->image_url);
        
        return $baseUrl . $storagePath;
    }

    public function getIsOpenNowAttribute()
    {
        if (!$this->is_open) {
            return false;
        }

        if (empty($this->operating_hours)) {
            return true; // If no hours set, follow manual switch
        }

        $now = now()->setTimezone('Asia/Jakarta');
        $dayOfWeek = strtolower($now->format('l')); // monday, tuesday...

        $hours = $this->operating_hours[$dayOfWeek] ?? null;
        
        if (!$hours || !isset($hours['open']) || !isset($hours['close'])) {
            return false; // If day not configured, assume closed
        }

        if (isset($hours['is_closed']) && $hours['is_closed']) {
            return false;
        }

        $currentTime = $now->format('H:i');
        return $currentTime >= $hours['open'] && $currentTime <= $hours['close'];
    }

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
