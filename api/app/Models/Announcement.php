<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Auth;
use App\Traits\BelongsToTenant;

class Announcement extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'rt_id',
        'title',
        'content',
        'category',
        'image_url',
        'status',
        'expires_at',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
    ];

    protected $appends = ['is_liked'];

    public function likes(): HasMany
    {
        return $this->hasMany(AnnouncementLike::class);
    }

    public function comments(): HasMany
    {
        return $this->hasMany(AnnouncementComment::class);
    }

    public function getIsLikedAttribute(): bool
    {
        $userId = Auth::guard('sanctum')->id();
        if (!$userId) {
            return false;
        }

        if ($this->relationLoaded('likes')) {
            return $this->likes->where('user_id', $userId)->isNotEmpty();
        }
        
        return $this->likes()->where('user_id', $userId)->exists();
    }

    public function scopePublished($query)
    {
        return $query->where('status', 'PUBLISHED');
    }
}
