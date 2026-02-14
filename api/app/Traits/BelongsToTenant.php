<?php

namespace App\Traits;

use App\Models\Scopes\TenantScope;
use App\Models\Tenant;
use Illuminate\Support\Facades\Auth;

trait BelongsToTenant
{
    /**
     * The "booted" method of the model.
     */
    protected static function bootBelongsToTenant()
    {
        static::addGlobalScope(new TenantScope);

        static::creating(function ($model) {
            if (Auth::check()) {
                $user = Auth::user();
                
                // Super Admin bypass
                $isSuperAdmin = ($user->userRole && $user->userRole->role_code === 'SUPER_ADMIN') 
                                || $user->role === 'SUPER_ADMIN';
                
                if ($isSuperAdmin) {
                    return;
                }

                // Auto-inject tenant_id from authenticated user
                if ($user->tenant_id) {
                    $model->tenant_id = $user->tenant_id;
                }
            }
        });

        static::updating(function ($model) {
            static::enforceWriteProtection($model);
        });

        static::deleting(function ($model) {
            static::enforceWriteProtection($model);
        });
    }

    protected static function enforceWriteProtection($model)
    {
        if (Auth::check()) {
            $user = Auth::user();
            
            // Super Admin bypass
            if ($user->userRole && $user->userRole->role_code === 'SUPER_ADMIN') {
                return;
            }

            // Enforce: RW cannot edit RT data (Child Tenant)
            // User can only edit data that belongs to their own tenant_id
            if ($user->tenant_id && $model->tenant_id != $user->tenant_id) {
                abort(403, 'Anda tidak memiliki hak akses untuk mengubah data ini (Cross-Tenant Modification Prohibited).');
            }
        }
    }

    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }
}
