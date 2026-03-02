<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Traits\BelongsToTenant;

class PollVote extends Model
{
    use BelongsToTenant;

    protected $fillable = ['poll_id', 'poll_option_id', 'user_id', 'tenant_id'];

    public function poll()
    {
        return $this->belongsTo(Poll::class);
    }

    public function option()
    {
        return $this->belongsTo(PollOption::class, 'poll_option_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
