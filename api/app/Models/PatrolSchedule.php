<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Traits\BelongsToTenant;

class PatrolSchedule extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'rt_id',
        'day_of_week',
        'week_number',
        'start_time',
        'end_time',
        'tenant_id',
    ];

    public function members()
    {
        return $this->hasMany(PatrolMember::class, 'patrol_schedule_id');
    }
}
