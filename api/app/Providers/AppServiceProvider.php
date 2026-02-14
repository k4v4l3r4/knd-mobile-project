<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Schema;
use App\Models\Permission;
use App\Models\User;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Register Policies
        Gate::policy(\App\Models\Invoice::class, \App\Policies\InvoicePolicy::class);

        // Super Admin Bypass
        Gate::before(function ($user, $ability) {
            if ($user instanceof User && $user->userRole && $user->userRole->role_code === 'SUPER_ADMIN') {
                return true;
            }
        });

        // Register Gates based on Permissions
        if (Schema::hasTable('permissions')) {
            try {
                // Fetch all permissions and define a Gate for each
                // Using cursor to be memory efficient if there are many permissions
                Permission::chunk(100, function ($permissions) {
                    foreach ($permissions as $permission) {
                        Gate::define($permission->permission_code, function (User $user) use ($permission) {
                            return $user->hasPermission($permission->permission_code);
                        });
                    }
                });
            } catch (\Exception $e) {
                // Migration might be running or DB not ready
            }
        }
    }
}
