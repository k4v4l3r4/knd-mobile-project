<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\WilayahRt;

class DevUserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // 1. Get SUPER_ADMIN role
        $superAdminRole = Role::where('role_code', 'SUPER_ADMIN')->first();
        
        if (!$superAdminRole) {
            $this->command->error('Role SUPER_ADMIN not found. Please run RolePermissionSeeder first.');
            return;
        }

        // 2. Create/Get Live Tenant (Full Access)
        $liveTenant = Tenant::firstOrCreate(
            ['name' => 'Development Tenant'],
            [
                'level' => 'RT',
                'tenant_type' => 'LIVE',
                'status' => 'ACTIVE',
                'billing_mode' => 'RT',
                'subscription_started_at' => now(),
                // No end date or far future for lifetime/dev access
                'subscription_ended_at' => now()->addYears(100), 
            ]
        );
        
        // Ensure it is ACTIVE if it already existed but was different
        if ($liveTenant->status !== 'ACTIVE' || $liveTenant->tenant_type !== 'LIVE') {
            $liveTenant->update([
                'status' => 'ACTIVE',
                'tenant_type' => 'LIVE',
                'subscription_ended_at' => now()->addYears(100),
            ]);
        }
        
        $this->command->info('Live Tenant ensured: ' . $liveTenant->name);

        // 3. Ensure RT 000 and RW 000 exist and are linked to this Tenant
        $rw = \App\Models\WilayahRw::firstOrCreate(
            ['name' => 'RW 000'],
            [
                'tenant_id' => $liveTenant->id,
                'code' => 'RW000',
                'subscription_status' => 'ACTIVE',
            ]
        );

        $rt = WilayahRt::firstOrCreate(
            ['rt_number' => '000'],
            [
                'tenant_id' => $liveTenant->id,
                'rw_id' => $rw->id,
                'rt_name' => 'RT Development',
                'address' => 'Development HQ',
                'province' => 'Dev Province',
                'city' => 'Dev City',
                'district' => 'Dev District',
                'subdistrict' => 'Dev Subdistrict',
                'postal_code' => '00000',
                'rw_number' => '000', // Redundant but present in schema
            ]
        );
        
        // Ensure tenant link
        $rt->update(['tenant_id' => $liveTenant->id, 'rw_id' => $rw->id]);
        $this->command->info('RT 000 & RW 000 ensured and linked to Live Tenant.');

        // 4. Create/Update Dev User
        $devPhone = '089678861393'; // Updated phone number
        
        // Find by new phone OR old phone to update
        $user = User::where('phone', $devPhone)
                    ->orWhere('phone', '081299999999')
                    ->first();
        
        if (!$user) {
            User::create([
                'name' => 'Super Admin Dev',
                'email' => 'dev_superadmin@example.com',
                'phone' => $devPhone,
                'password' => 'password', // Auto hashed by model cast
                'role_id' => $superAdminRole->id,
                'role' => 'SUPER_ADMIN', // Keep for legacy compatibility
                'tenant_id' => $liveTenant->id, // Assign to Live Tenant
                'rt_id' => $rt->id, // Assign to RT 000
                'rw_id' => $rw->id, // Assign to RW 000
                'nik' => '9999999999999999',
                'is_bansos_eligible' => false,
            ]);
            $this->command->info('Dev Super Admin created with Full Access (RT 000): Phone: ' . $devPhone . ' Password: password');
        } else {
             $user->update([
                'phone' => $devPhone, // Update phone
                'role_id' => $superAdminRole->id,
                'role' => 'SUPER_ADMIN',
                'tenant_id' => $liveTenant->id, // Update to Live Tenant
                'rt_id' => $rt->id, // Assign to RT 000
                'rw_id' => $rw->id, // Assign to RW 000
            ]);
            $this->command->info('Dev Super Admin updated with Full Access (RT 000) & New Phone.');
        }
    }
}
