<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;

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
        'latitude',
        'longitude',
        'contact_phone',
        'logo_url',
        'structure_image_url',
        'sk_image_url',
        'kas_balance',
        'invite_code',
    ];

    public function getLogoUrlAttribute($value)
    {
        if ($value) {
            if (strpos($value, 'http') === 0) {
                return $value;
            }
            if (!Storage::disk('public')->exists($value)) {
                Log::error('Logo file not found in storage: ' . $value);
            }
            return asset(Storage::url($value));
        }
        return null;
    }

    public function getStructureImageUrlAttribute($value)
    {
        if ($value) {
            if (strpos($value, 'http') === 0) {
                return $value;
            }
            if (!Storage::disk('public')->exists($value)) {
                Log::error('Structure image file not found in storage: ' . $value);
            }
            return asset(Storage::url($value));
        }
        return null;
    }

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
