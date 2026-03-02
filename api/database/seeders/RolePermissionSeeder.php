<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Role;
use App\Models\Permission;
use Illuminate\Support\Facades\DB;

class RolePermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // 1. Create Permissions
        $permissions = [
            'dashboard.view',
            'warga.view', 'warga.create', 'warga.update', 'warga.delete',
            'kas.view', 'kas.create', 'kas.update', 'kas.delete',
            'iuran.view', 'iuran.generate', 'iuran.pay',
            'laporan.view', 'laporan.export',
            'billing.manage',
            'tenant.manage',
            'user.invite',
            'settings.update',
        ];

        foreach ($permissions as $code) {
            Permission::firstOrCreate(['permission_code' => $code]);
        }

        // 2. Create Roles and Map Permissions
        $roleMap = [
            'SUPER_ADMIN' => [
                'scope' => 'SYSTEM',
                'label' => 'Super Admin',
                'permissions' => $permissions // All permissions
            ],
            'ADMIN_RW' => [
                'scope' => 'TENANT',
                'label' => 'Admin RW',
                'permissions' => [
                    'dashboard.view', 'tenant.manage', 'warga.view',
                    'kas.view', 'iuran.view', 'laporan.view', 'laporan.export',
                    'billing.manage', 'user.invite', 'settings.update'
                ]
            ],
            'ADMIN_RT' => [
                'scope' => 'TENANT',
                'label' => 'Admin RT',
                'permissions' => [
                    'dashboard.view', 'warga.view', 'warga.create', 'warga.update', 'warga.delete',
                    'kas.view', 'kas.create', 'kas.update', 'kas.delete',
                    'iuran.view', 'iuran.generate', 'laporan.view', 'laporan.export',
                    'user.invite', 'settings.update'
                ]
            ],
            'BENDAHARA_RT' => [
                'scope' => 'TENANT',
                'label' => 'Bendahara RT',
                'permissions' => [
                    'dashboard.view', 'kas.view', 'kas.create', 'kas.update',
                    'iuran.view', 'laporan.view'
                ]
            ],
            'SEKRETARIS_RT' => [
                'scope' => 'TENANT',
                'label' => 'Sekretaris RT',
                'permissions' => [
                    'dashboard.view', 'warga.view', 'warga.create', 'warga.update',
                    'iuran.view', 'laporan.view'
                ]
            ],
            'WARGA' => [
                'scope' => 'TENANT',
                'label' => 'Warga',
                'permissions' => [
                    'dashboard.view', 'warga.view', 'iuran.view', 'iuran.pay', 'kas.view'
                ]
            ],
            'WARGA_TETAP' => [
                'scope' => 'TENANT',
                'label' => 'Warga Tetap',
                'permissions' => [
                    'dashboard.view', 'warga.view', 'iuran.view', 'iuran.pay', 'kas.view'
                ]
            ],
            'WARGA_KOST' => [
                'scope' => 'TENANT',
                'label' => 'Warga Kost',
                'permissions' => [
                    'dashboard.view', 'warga.view', 'iuran.view', 'iuran.pay', 'kas.view'
                ]
            ],
            'GUEST' => [
                'scope' => 'TENANT',
                'label' => 'Guest',
                'permissions' => [
                    'dashboard.view', 'warga.view', 'kas.view', 'iuran.view', 'laporan.view'
                ]
            ],
        ];

        foreach ($roleMap as $roleCode => $details) {
            $role = Role::firstOrCreate(
                ['role_code' => $roleCode],
                [
                    'scope' => $details['scope'],
                    'label' => $details['label'],
                ]
            );

            // Sync permissions
            $permissionIds = Permission::whereIn('permission_code', $details['permissions'])->pluck('id');
            $role->permissions()->sync($permissionIds);
        }

        // 3. Migrate Existing Users
        $users = \App\Models\User::whereNull('role_id')->whereNotNull('role')->get();
        foreach ($users as $user) {
            $roleCode = $user->role;
            // Map old role names if necessary (e.g. if they differ from new codes)
            // Assuming strict match for now based on previous system
            
            $role = Role::where('role_code', $roleCode)->first();
            if ($role) {
                $user->role_id = $role->id;
                $user->saveQuietly(); // Avoid triggering events if any
            }
        }
    }
}
