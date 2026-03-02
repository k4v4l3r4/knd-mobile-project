<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Traits\BelongsToTenant;

class Report extends Model
{
    use HasFactory, SoftDeletes, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'rt_id',
        'user_id',
        'title',
        'description',
        'category',
        'photo_url',
        'status',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
