<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Traits\BelongsToTenant;

class RondaFine extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'rt_id',
        'user_id',
        'ronda_schedule_id',
        'fine_type',
        'amount',
        'status',
        'generated_at',
        'paid_at',
        'tenant_id',
    ];

    protected $casts = [
        'generated_at' => 'datetime',
        'paid_at' => 'datetime',
        'amount' => 'integer',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function schedule()
    {
        return $this->belongsTo(RondaSchedule::class, 'ronda_schedule_id');
    }

    public function kasTransaction()
    {
        return $this->hasOne(KasTransaction::class, 'source_id')->where('source_type', 'DENDA');
    }
}
