<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Traits\BelongsToTenant;

class PatrolMember extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'patrol_schedule_id',
        'user_id',
        'tenant_id',
    ];

    public function schedule()
    {
        return $this->belongsTo(PatrolSchedule::class, 'patrol_schedule_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
