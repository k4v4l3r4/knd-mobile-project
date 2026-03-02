<?php

use App\Models\User;
use App\Models\Store;
use App\Models\Product;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;
use Tests\TestCase;

use App\Models\WilayahRw;
use App\Models\WilayahRt;

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "Starting UMKM Security Audit...\n";

// Ensure Wilayah exists
try {
    // 1. Create/Get RW
    $rw = WilayahRw::firstOrCreate(
        ['name' => 'RW 01'], 
        [
            'subdistrict_id' => '1101010001' // Mock subdistrict
        ]
    );

    // 2. Create/Get RT 1
    $rt1 = WilayahRt::firstOrCreate(
        ['rt_number' => '001', 'rw_id' => $rw->id],
        ['name' => 'RT 01']
    );

    // 3. Create/Get RT 2
    $rt2 = WilayahRt::firstOrCreate(
        ['rt_number' => '002', 'rw_id' => $rw->id],
        ['name' => 'RT 02']
    );

    $rwId = $rw->id;
    $rt1Id = $rt1->id;
    $rt2Id = $rt2->id;

    echo "Wilayah Setup: RW ID=$rwId, RT1 ID=$rt1Id, RT2 ID=$rt2Id\n";

} catch (\Exception $e) {
    echo "CRITICAL: Wilayah setup failed: " . $e->getMessage() . "\n";
    exit(1);
}

// Helper to create user
function createTestUser($role, $rt, $rw, $name, $email, $phone) {
    // Delete if exists
    User::where('email', $email)->forceDelete();
    User::where('phone', $phone)->forceDelete();
    
    return User::create([
        'name' => $name,
        'email' => $email,
        'phone' => $phone,
        'password' => Hash::make('password'),
        'role' => $role,
        'rt_id' => $rt,
        'rw_id' => $rw,
        'nik' => rand(1000000000000000, 9999999999999999),
        'kk_number' => rand(1000000000000000, 9999999999999999),
    ]);
}

// 1. Setup Data
echo "1. Setting up users and stores...\n";

// RT Admin 1 (RT 1)
$adminRt1 = createTestUser('ADMIN_RT', $rt1Id, $rwId, 'Admin RT 1', 'adminrt1@test.com', '08111111111');
// RT Admin 2 (RT 2)
$adminRt2 = createTestUser('ADMIN_RT', $rt2Id, $rwId, 'Admin RT 2', 'adminrt2@test.com', '08222222222');

// Warga 1 (RT 1)
$warga1 = createTestUser('WARGA_TETAP', $rt1Id, $rwId, 'Warga 1', 'warga1@test.com', '08333333333');
// Warga 2 (RT 2)
$warga2 = createTestUser('WARGA_TETAP', $rt2Id, $rwId, 'Warga 2', 'warga2@test.com', '08444444444');

// Clean up existing stores for these users
Store::where('user_id', $warga1->id)->forceDelete();
Store::where('user_id', $warga2->id)->forceDelete();

// Create Store for Warga 1 (RT 1)
$store1 = Store::create([
    'user_id' => $warga1->id,
    'rt_id' => $rt1Id,
    'name' => 'Store Warga 1',
    'description' => 'Desc 1',
    'contact' => '08333333333',
    'status' => 'pending'
]);
echo "Store 1 created (RT $rt1Id, ID: {$store1->id})\n";

// Create Store for Warga 2 (RT 2)
$store2 = Store::create([
    'user_id' => $warga2->id,
    'rt_id' => $rt2Id,
    'name' => 'Store Warga 2',
    'description' => 'Desc 2',
    'contact' => '08444444444',
    'status' => 'pending'
]);
echo "Store 2 created (RT $rt2Id, ID: {$store2->id})\n";

// 2. Test Cross-RT Verification
echo "\n2. Testing Cross-RT Verification (Admin RT 1 verifying Store 2)...\n";
Auth::login($adminRt1);
$controller = new \App\Http\Controllers\Api\StoreController();
$request = \Illuminate\Http\Request::create("/api/stores/{$store2->id}/verify", 'POST', [
    'status' => 'verified'
]);
$request->setUserResolver(function () use ($adminRt1) { return $adminRt1; });

$response = $controller->verify($request, $store2);
$status = $response->getStatusCode();
echo "Status Code: $status\n";

if ($status == 200) {
    echo "CRITICAL: Admin RT 1 successfully verified Store 2 (Cross-RT Vulnerability)!\n";
} elseif ($status == 403) {
    echo "SUCCESS: Admin RT 1 denied verification for Store 2.\n";
} else {
    echo "Unexpected status: $status\n";
}

// 3. Test Cross-RT Deletion
echo "\n3. Testing Cross-RT Deletion (Admin RT 1 deleting Store 2)...\n";
// Ensure global request has user for request()->user() call inside destroy
$request = \Illuminate\Http\Request::create("/api/stores/{$store2->id}", 'DELETE');
$request->setUserResolver(function () use ($adminRt1) { return $adminRt1; });
app()->instance('request', $request); // Bind to container

$response = $controller->destroy($request, $store2);
$status = $response->getStatusCode();
echo "Status Code: $status\n";

if ($status == 200) {
    echo "CRITICAL: Admin RT 1 successfully deleted Store 2 (Cross-RT Vulnerability)!\n";
} elseif ($status == 403) {
    echo "SUCCESS: Admin RT 1 denied deletion for Store 2.\n";
} else {
    echo "Unexpected status: $status\n";
}

// Cleanup
echo "\nCleaning up...\n";
$store1->forceDelete();
$store2->forceDelete();
$warga1->forceDelete();
$warga2->forceDelete();
$adminRt1->forceDelete();
$adminRt2->forceDelete();

echo "Done.\n";
