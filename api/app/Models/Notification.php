<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\BelongsToTenant;

class Notification extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'notifiable_id',
        'notifiable_type',
        'title',
        'message',
        'type',
        'related_id',
        'url',
        'is_read',
        'tenant_id',
    ];

    protected $casts = [
        'is_read' => 'boolean',
    ];

    /**
     * Get the owning notifiable model.
     */
    public function notifiable()
    {
        return $this->morphTo();
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
