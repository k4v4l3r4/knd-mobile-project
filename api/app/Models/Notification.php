<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use App\Traits\BelongsToTenant;

class Notification extends Model
{
    use HasFactory, BelongsToTenant, HasUuids;

    protected $fillable = [
        'notifiable_id',
        'notifiable_type',
        'title',
        'message',
        'type',
        'related_id',
        'url',
        'is_read',
        'read_at',
        'data',
        'tenant_id',
    ];

    protected $casts = [
        'is_read' => 'boolean',
        'read_at' => 'datetime',
        'data' => 'array',
    ];

    /**
     * Get the owning notifiable model.
     */
    public function notifiable()
    {
        return $this->morphTo();
    }

    /**
     * Convert the model instance to an array.
     * Ensure compatibility with frontend expecting 'data' object.
     */
    public function toArray()
    {
        $array = parent::toArray();

        // Ensure 'data' exists and contains title/message/id if not already present
        if (!isset($array['data'])) {
            $array['data'] = [];
        }
        
        // Merge top-level fields into data for frontend convenience
        $array['data'] = array_merge([
            'title' => $this->title,
            'message' => $this->message,
            'text' => $this->message, // Alias for text
            'id' => $this->id,
            'url' => $this->url,
            'type' => $this->type,
        ], $array['data'] ?? []);

        return $array;
    }

    /**
     * Backward compatibility accessor for user_id
     */
    public function getUserIdAttribute()
    {
        return $this->notifiable_id;
    }

    /**
     * Backward compatibility mutator for user_id
     */
    public function setUserIdAttribute($value)
    {
        $this->attributes['notifiable_id'] = $value;
        $this->attributes['notifiable_type'] = User::class;
    }
}
