<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Traits\BelongsToTenant;

class Poll extends Model
{
    use BelongsToTenant;

    protected $fillable = ['tenant_id', 'rt_id', 'title', 'description', 'start_date', 'end_date', 'status'];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
    ];

    public function options()
    {
        return $this->hasMany(PollOption::class);
    }

    public function votes()
    {
        return $this->hasMany(PollVote::class);
    }

    public function rt()
    {
        return $this->belongsTo(WilayahRt::class, 'rt_id');
    }
}
