<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Traits\BelongsToTenant;

class BansosHistory extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'recipient_id',
        'program_name',
        'date_received',
        'amount',
        'evidence_photo',
        'tenant_id',
    ];

    public function recipient()
    {
        return $this->belongsTo(BansosRecipient::class, 'recipient_id');
    }
}
