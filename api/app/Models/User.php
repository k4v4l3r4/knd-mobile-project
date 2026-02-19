<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use App\Traits\BelongsToTenant;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes, BelongsToTenant;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'tenant_id',
        'role_id', // Added role_id
        'name',
        'email',
        'phone',
        'password',
        'role', // Deprecated string role column but still used in code
        'rt_id',
        'rw_id',
        'nik',
        'kk_number',
        'gender',
        'place_of_birth',
        'date_of_birth',
        'address',
        'block',
        'gang',
        'address_rt',
        'address_rw',
        'address_ktp',
        'postal_code',
        'religion',
        'marital_status',
        'occupation',
        'status_in_family',
        'is_bansos_eligible',
        'photo_url',
        'avatar',
        'ktp_image_path',
        'kk_image_path',
        'fcm_token',
        'signature_type',
        'signature_image',
        'province_code',
        'city_code',
        'district_code',
        'village_code',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_bansos_eligible' => 'boolean',
            'date_of_birth' => 'date',
        ];
    }

    /**
     * Get the family members associated with the user's KK number.
     */
    public function family()
    {
        return $this->hasMany(User::class, 'kk_number', 'kk_number');
    }

    public function store()
    {
        return $this->hasOne(Store::class);
    }

    public function userRole()
    {
        return $this->belongsTo(Role::class, 'role_id');
    }

    public function hasPermission($permissionCode)
    {
        if (!$this->userRole) return false;
        
        // Super Admin Bypass
        if ($this->userRole->role_code === 'SUPER_ADMIN') {
            return true;
        }

        return $this->userRole->permissions()->where('permission_code', $permissionCode)->exists();
    }

    public function rt()
    {
        return $this->belongsTo(WilayahRt::class, 'rt_id');
    }

    public function rw()
    {
        return $this->belongsTo(WilayahRw::class, 'rw_id');
    }
}
