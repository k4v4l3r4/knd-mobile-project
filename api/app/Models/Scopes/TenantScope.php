<?php

namespace App\Models\Scopes;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;
use Illuminate\Support\Facades\Auth;

class TenantScope implements Scope
{
    /**
     * Apply the scope to a given Eloquent query builder.
     *
     * @param  \Illuminate\Database\Eloquent\Builder  $builder
     * @param  \Illuminate\Database\Eloquent\Model  $model
     * @return void
     */
    public function apply(Builder $builder, Model $model)
    {
        if (Auth::hasUser()) {
            $user = Auth::user();

            // 1. SUPER_ADMIN Bypass
            // Checks if role exists and is SUPER_ADMIN
            if ($user->userRole && $user->userRole->role_code === 'SUPER_ADMIN') {
                return;
            }

            // 2. Tenant Isolation
            if ($user->tenant) {
                // RW Level: Can see own data AND data from child RTs
                if ($user->tenant->level === 'RW') {
                    $builder->where(function($query) use ($user, $model) {
                        // Data directly owned by RW
                        $query->where($model->getTable() . '.tenant_id', $user->tenant_id)
                              // OR Data owned by child RTs
                              ->orWhereIn($model->getTable() . '.tenant_id', function($subQuery) use ($user) {
                                  $subQuery->select('id')
                                           ->from('tenants')
                                           ->where('parent_tenant_id', $user->tenant_id);
                              });
                    });
                } else {
                    // RT Level (or others): Strict isolation
                    $builder->where($model->getTable() . '.tenant_id', $user->tenant_id);
                }
            } else {
                // If user has no tenant (e.g. system user not super admin?), usually shouldn't happen for regular users.
                // But if it happens, maybe block access or allow nothing?
                // For safety, if not super admin and no tenant, show nothing.
                $builder->whereNull($model->getTable() . '.tenant_id'); // Likely 0 results
            }
        }
    }
}
