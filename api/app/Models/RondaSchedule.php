<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Traits\BelongsToTenant;

class RondaSchedule extends Model
{
    use HasFactory, SoftDeletes, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'rt_id',
        'shift_name',
        'location',
        'start_date',
        'end_date',
        'start_time',
        'end_time',
        'status',
        'schedule_type'
    ];

    public function participants()
    {
        return $this->hasMany(RondaParticipant::class, 'schedule_id');
    }
}
