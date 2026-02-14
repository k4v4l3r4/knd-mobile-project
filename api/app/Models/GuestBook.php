<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\BelongsToTenant;

class GuestBook extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'rt_id',
        'host_user_id',
        'guest_name',
        'guest_phone',
        'origin',
        'purpose',
        'visit_date',
        'id_card_photo',
        'status',
        'tenant_id',
    ];

    protected $casts = [
        'visit_date' => 'datetime',
    ];

    public function host()
    {
        return $this->belongsTo(User::class, 'host_user_id');
    }

    public function rt()
    {
        return $this->belongsTo(WilayahRt::class, 'rt_id', 'id');
    }
}
