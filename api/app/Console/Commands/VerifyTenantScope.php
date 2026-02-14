<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use App\Models\Tenant;
use App\Models\Role;
use App\Models\Product;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class VerifyTenantScope extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'verify:tenant-scope';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Verify Tenant Scope Isolation';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Starting Tenant Scope Verification...');
        
        DB::beginTransaction();
        try {
            // 1. Setup Data
            $this->info('Setting up test data...');
            
            // Create Tenants
            $tenantRW = Tenant::create(['name' => 'RW 01', 'level' => 'RW', 'tenant_type' => 'LIVE', 'status' => 'ACTIVE']);
            $tenantRT1 = Tenant::create(['name' => 'RT 01', 'level' => 'RT', 'tenant_type' => 'LIVE', 'status' => 'ACTIVE', 'parent_tenant_id' => $tenantRW->id]);
            $tenantRT2 = Tenant::create(['name' => 'RT 02', 'level' => 'RT', 'tenant_type' => 'LIVE', 'status' => 'ACTIVE', 'parent_tenant_id' => $tenantRW->id]);
            $tenantOther = Tenant::create(['name' => 'Other RW', 'level' => 'RW', 'tenant_type' => 'LIVE', 'status' => 'ACTIVE']);

            // Create Users
            $userRW = User::factory()->create(['name' => 'User RW', 'email' => 'rw@test.com', 'tenant_id' => $tenantRW->id]);
            $userRT1 = User::factory()->create(['name' => 'User RT1', 'email' => 'rt1@test.com', 'tenant_id' => $tenantRT1->id]);
            $userRT2 = User::factory()->create(['name' => 'User RT2', 'email' => 'rt2@test.com', 'tenant_id' => $tenantRT2->id]);
            $userSuper = User::factory()->create(['name' => 'Super Admin', 'email' => 'super@test.com']);
            
            // Assign Roles (Assuming Roles exist or we create dummy ones)
            $roleSuper = Role::firstOrCreate(['role_code' => 'SUPER_ADMIN'], ['scope' => 'SYSTEM', 'label' => 'Super Admin']);
            $roleRW = Role::firstOrCreate(['role_code' => 'ADMIN_RW'], ['scope' => 'TENANT', 'label' => 'Admin RW']);
            $roleRT = Role::firstOrCreate(['role_code' => 'ADMIN_RT'], ['scope' => 'TENANT', 'label' => 'Admin RT']);

            $userSuper->role_id = $roleSuper->id; $userSuper->save();
            $userRW->role_id = $roleRW->id; $userRW->save();
            $userRT1->role_id = $roleRT->id; $userRT1->save();
            $userRT2->role_id = $roleRT->id; $userRT2->save();

            // Create Products as RT1 User
            Auth::login($userRT1);
            $productRT1 = Product::create([
                'name' => 'Product RT1', 
                'rt_id' => 1, 
                'user_id' => $userRT1->id,
                'description' => 'Test Description',
                'price' => 10000,
                'whatsapp' => '08123456789',
                'category' => 'General'
            ]); // rt_id dummy
            $this->info('Created Product RT1 with tenant_id: ' . $productRT1->tenant_id);

            // Create Products as RT2 User
            Auth::login($userRT2);
            $productRT2 = Product::create([
                'name' => 'Product RT2', 
                'rt_id' => 2, 
                'user_id' => $userRT2->id,
                'description' => 'Test Description 2',
                'price' => 20000,
                'whatsapp' => '08123456789',
                'category' => 'General'
            ]);
            $this->info('Created Product RT2 with tenant_id: ' . $productRT2->tenant_id);

            // 2. Verify Isolation
            $this->info('Verifying Isolation...');

            // Test 1: RT1 User should only see Product RT1
            Auth::login($userRT1);
            $count = Product::count();
            if ($count === 1 && Product::first()->id === $productRT1->id) {
                $this->info('PASS: RT1 User sees only own data.');
            } else {
                $this->error('FAIL: RT1 User sees ' . $count . ' items. Expected 1.');
            }

            // Test 2: RT2 User should only see Product RT2
            Auth::login($userRT2);
            $count = Product::count();
            if ($count === 1 && Product::first()->id === $productRT2->id) {
                $this->info('PASS: RT2 User sees only own data.');
            } else {
                $this->error('FAIL: RT2 User sees ' . $count . ' items. Expected 1.');
            }

            // Test 3: RW User should see BOTH (Own + Children)
            Auth::login($userRW);
            $count = Product::count();
            if ($count === 2) {
                $this->info('PASS: RW User sees children data (2 items).');
            } else {
                $this->error('FAIL: RW User sees ' . $count . ' items. Expected 2.');
            }

            // Test 4: Super Admin should see ALL
            Auth::login($userSuper);
            $count = Product::count();
            // Assuming no other products in DB, or at least >= 2
            if ($count >= 2) {
                $this->info('PASS: Super Admin sees all data.');
            } else {
                $this->error('FAIL: Super Admin sees ' . $count . ' items.');
            }

            // Test 5: Creation Auto-Tenant
            Auth::login($userRT1);
            $p = Product::create([
                'name' => 'Auto Tenant Test', 
                'rt_id' => 1, 
                'user_id' => $userRT1->id,
                'description' => 'Auto Desc',
                'price' => 5000,
                'whatsapp' => '08123456789',
                'category' => 'General'
            ]);
            if ($p->tenant_id === $tenantRT1->id) {
                $this->info('PASS: Auto-assigned tenant_id correct.');
            } else {
                $this->error('FAIL: Auto-assigned tenant_id incorrect. Got ' . $p->tenant_id);
            }

            // Test 6: RW Write Protection (Cannot Update RT Data)
            $this->info('Verifying RW Write Protection...');
            Auth::login($userRW);
            // RW can see RT1 product
            $productToUpdate = Product::find($productRT1->id);
            if ($productToUpdate) {
                try {
                    $productToUpdate->update(['name' => 'Hacked by RW']);
                    $this->error('FAIL: RW User was able to update RT data.');
                } catch (\Symfony\Component\HttpKernel\Exception\HttpException $e) {
                    if ($e->getStatusCode() === 403) {
                        $this->info('PASS: RW User blocked from updating RT data (403 Forbidden).');
                    } else {
                        $this->error('FAIL: Exception caught but not 403. ' . $e->getMessage());
                    }
                } catch (\Exception $e) {
                     // In console, abort(403) throws Symfony\Component\HttpKernel\Exception\HttpException
                     // But strictly, it might vary depending on context. 
                     // Let's catch generic and check message or class.
                     if (strpos($e->getMessage(), 'Cross-Tenant') !== false || $e->getCode() === 403) {
                         $this->info('PASS: RW User blocked from updating RT data (' . $e->getMessage() . ').');
                     } else {
                         $this->error('FAIL: Unexpected exception: ' . $e->getMessage());
                     }
                }
            } else {
                 $this->error('FAIL: RW User could not find RT data to test update.');
            }

        } catch (\Exception $e) {
            echo "ERROR MSG: " . $e->getMessage() . "\n";
            // echo $e->getTraceAsString();
        } finally {
            DB::rollBack();
            $this->info('Rolled back transaction.');
        }
    }
}
