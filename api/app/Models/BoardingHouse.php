<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Traits\BelongsToTenant;

class BoardingHouse extends Model
{
    use HasFactory, SoftDeletes, BelongsToTenant;

    protected $fillable = [
        'owner_id',
        'name',
        'address',
        'total_rooms',
        'total_floors',
        'floor_config',
        'tenant_id',
    ];

    protected $casts = [
        'floor_config' => 'array',
    ];

    public function owner()
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function tenants()
    {
        return $this->hasMany(BoardingTenant::class, 'boarding_house_id');
    }
}
