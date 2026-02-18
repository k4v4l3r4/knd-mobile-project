<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class WilayahRt extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'wilayah_rt';

    protected $fillable = [
        'tenant_id',
        'rw_id',
        'rt_number',
        'rt_name',
        'complex_name',
        'address',
        'province',
        'city',
        'district', // Kecamatan
        'subdistrict', // Kelurahan
        'postal_code',
        'logo_url',
        'structure_image_url',
        'kas_balance',
        'invite_code',
    ];

    public function rw()
    {
        return $this->belongsTo(WilayahRw::class, 'rw_id');
    }

    public function users()
    {
        return $this->hasMany(User::class, 'rt_id');
    }

    public function wallets()
    {
        return $this->hasMany(Wallet::class, 'rt_id');
    }

    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }
}
