<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\BelongsToTenant;

class Notification extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'user_id',
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

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
