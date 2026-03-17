<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Casts\Attribute;
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

    /**
     * The accessors to append to the model's array form
     */
    protected $appends = ['evidence_photo_url'];

    /**
     * Get the full URL for evidence photo
     */
    protected function evidencePhotoUrl(): Attribute
    {
        return Attribute::make(
            get: function ($value, $attributes) {
                if (!$attributes['evidence_photo']) {
                    return null;
                }
                return config('app.url') . '/storage/' . $attributes['evidence_photo'];
            },
        );
    }

    public function recipient()
    {
        return $this->belongsTo(BansosRecipient::class, 'recipient_id');
    }
}
