<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Traits\BelongsToTenant;

class PollOption extends Model
{
    use BelongsToTenant;

    protected $fillable = ['poll_id', 'name', 'description', 'image_url', 'vote_count', 'tenant_id'];

    public function poll()
    {
        return $this->belongsTo(Poll::class);
    }

    public function votes()
    {
        return $this->hasMany(PollVote::class);
    }
}
