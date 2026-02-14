<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\BelongsToTenant;

class Letter extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'rt_id',
        'user_id',
        'type',
        'purpose',
        'status',
        'admin_note',
        'file_url',
        'letter_number',
        'qr_code_path',
        'verification_code',
        'approved_at',
        'approver_id',
    ];

    protected $casts = [
        'approved_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function rt()
    {
        return $this->belongsTo(WilayahRt::class, 'rt_id');
    }
}
