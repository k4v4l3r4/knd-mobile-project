<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Traits\BelongsToTenant;

class BansosRecipient extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'rt_id',
        'user_id',
        'no_kk',
        'status',
        'notes',
        'score',
        'tenant_id',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function histories()
    {
        return $this->hasMany(BansosHistory::class, 'recipient_id');
    }
}
