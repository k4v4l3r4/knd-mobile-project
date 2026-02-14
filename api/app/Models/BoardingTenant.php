<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Traits\BelongsToTenant;

class BoardingTenant extends Model
{
    use HasFactory, SoftDeletes, BelongsToTenant;

    protected $fillable = [
        'boarding_house_id',
        'user_id',
        'room_number',
        'room_price',
        'deposit_amount',
        'deposit_status',
        'deposit_notes',
        'payment_status',
        'start_date',
        'end_date',
        'due_date',
        'status',
        'tenant_id',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'due_date' => 'date',
        'room_price' => 'decimal:2',
        'deposit_amount' => 'decimal:2',
    ];

    public function boardingHouse()
    {
        return $this->belongsTo(BoardingHouse::class, 'boarding_house_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
