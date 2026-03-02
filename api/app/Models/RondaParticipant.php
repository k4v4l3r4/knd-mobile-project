<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Traits\BelongsToTenant;

class RondaParticipant extends Model
{
    use HasFactory, SoftDeletes, BelongsToTenant;

    protected $fillable = [
        'schedule_id',
        'user_id',
        'status', // PRESENT, ABSENT, PENDING
        'attendance_at',
        'is_fined',
        'fine_amount',
        'notes',
        'attendance_lat',
        'attendance_long',
        'attendance_method',
        'attendance_distance',
        'ronda_location_id',
        'tenant_id',
    ];

    protected $casts = [
        'attendance_at' => 'datetime',
        'is_fined' => 'boolean',
        'attendance_lat' => 'decimal:8',
        'attendance_long' => 'decimal:8',
        'attendance_distance' => 'float',
    ];

    public function schedule()
    {
        return $this->belongsTo(RondaSchedule::class, 'schedule_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function rondaLocation()
    {
        return $this->belongsTo(RondaLocation::class, 'ronda_location_id');
    }
}
