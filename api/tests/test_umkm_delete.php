<?php

namespace Tests;

use App\Models\User;
use App\Models\Store;
use App\Models\Product;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;
use Illuminate\Http\Request;
use Exception;

require __DIR__ . '/../vendor/autoload.php';

$app = require __DIR__ . '/../bootstrap/app.php';

$kernel = $app->make(\Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "=== START UMKM DELETE AUDIT ===\n";

$storeController = new \App\Http\Controllers\Api\StoreController();

// Helper to create user
function createUser($name, $role, $rt_id, $email) {
    User::where('email', $email)->forceDelete();
    return User::create([
        'name' => $name,
        'email' => $email,
        'password' => Hash::make('password'),
        'role' => $role,
        'rt_id' => $rt_id,
        'rw_id' => 1,
        'phone' => '08' . rand(100000000, 999999999)
    ]);
}

try {
    // 1. Setup Users
    echo "Creating users...\n";
    $warga1 = createUser('Warga 1', 'WARGA_TETAP', 3, 'warga1_del@test.com');
    $adminRt1 = createUser('Admin RT 1', 'ADMIN_RT', 3, 'adminrt1_del@test.com');
    $adminRt2 = createUser('Admin RT 2', 'ADMIN_RT', 1, 'adminrt2_del@test.com');

    // 2. Setup Data (Store & Product) for Warga 1
    echo "Creating Store and Product for Warga 1...\n";
    Store::where('user_id', $warga1->id)->delete();
    $store1 = Store::create([
        'user_id' => $warga1->id,
        'rt_id' => $warga1->rt_id,
        'name' => 'Toko Warga 1 Delete',
        'description' => 'Desc',
        'status' => 'verified'
    ]);
    Product::where('store_id', $store1->id)->delete();
    $product1 = Product::create([
        'store_id' => $store1->id,
        'user_id' => $warga1->id,
        'rt_id' => $warga1->rt_id,
        'name' => 'Produk 1',
        'price' => 10000,
        'category' => 'food',
        'description' => 'Test Description',
        'whatsapp' => '08123456789'
    ]);

    // TEST 1: Admin RT (Diff RT) tries to delete Warga's store (Should FAIL)
    echo "\nTest 1: Admin RT (Diff RT) tries to delete Warga's store...\n";
    Auth::setUser($adminRt2);
    $req1 = Request::create('/api/stores/' . $store1->id, 'DELETE');
    $req1->setUserResolver(fn() => $adminRt2);

    $response1 = $storeController->destroy($req1, $store1);
    if ($response1->getStatusCode() === 403) {
        echo "PASS: Admin RT (Diff RT) cannot delete store.\n";
    } else {
        echo "FAIL: Admin RT (Diff RT) got status " . $response1->getStatusCode() . "\n";
    }

    // TEST 2: Admin RT (Same RT) tries to delete Warga's store (Should PASS)
    echo "\nTest 2: Admin RT (Same RT) tries to delete Warga's store...\n";
    Auth::setUser($adminRt1);
    $req2 = Request::create('/api/stores/' . $store1->id, 'DELETE');
    $req2->setUserResolver(fn() => $adminRt1);

    $response2 = $storeController->destroy($req2, $store1);
    if ($response2->getStatusCode() === 200) {
        echo "PASS: Admin RT (Same RT) deleted store.\n";
        
        // Verify store is deleted
        if (!Store::find($store1->id)) {
            echo "PASS: Store record deleted.\n";
        } else {
            echo "FAIL: Store record still exists.\n";
        }

        // Verify products are deleted (cascade or manual cleanup)
        if (!Product::find($product1->id)) {
            echo "PASS: Associated product deleted.\n";
        } else {
            echo "FAIL: Associated product still exists.\n";
        }

    } else {
        echo "FAIL: Admin RT (Same RT) failed to delete. Status: " . $response2->getStatusCode() . "\n";
        // echo "Message: " . json_encode($response2->getData()) . "\n";
    }

    // Reset Data for Owner Test
    echo "\nRe-creating Store for Owner Test...\n";
    $store2 = Store::create([
        'user_id' => $warga1->id,
        'rt_id' => $warga1->rt_id,
        'name' => 'Toko Warga 1 Owner',
        'description' => 'Desc',
        'status' => 'verified'
    ]);

    // TEST 3: Owner tries to delete own store (Should PASS)
    echo "\nTest 3: Owner tries to delete own store...\n";
    Auth::setUser($warga1);
    $req3 = Request::create('/api/stores/' . $store2->id, 'DELETE');
    $req3->setUserResolver(fn() => $warga1);

    $response3 = $storeController->destroy($req3, $store2);
    if ($response3->getStatusCode() === 200) {
        echo "PASS: Owner deleted own store.\n";
    } else {
        echo "FAIL: Owner failed to delete own store. Status: " . $response3->getStatusCode() . "\n";
    }

} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString();
}

// Cleanup
echo "\nCleaning up...\n";
User::whereIn('email', ['warga1_del@test.com', 'adminrt1_del@test.com', 'adminrt2_del@test.com'])->forceDelete();
if (isset($store1)) Store::find($store1->id)?->delete();
if (isset($store2)) Store::find($store2->id)?->delete();

echo "=== DONE ===\n";
