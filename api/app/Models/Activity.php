<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\BelongsToTenant;

class Activity extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'rt_id',
        'title',
        'description',
        'start_date',
        'end_date',
        'location',
        'status',
        'category_id'
    ];

    protected $casts = [
        'start_date' => 'datetime',
        'end_date' => 'datetime',
    ];

    public function category()
    {
        return $this->belongsTo(ActivityCategory::class);
    }
}
