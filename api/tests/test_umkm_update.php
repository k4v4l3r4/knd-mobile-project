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

echo "Starting UMKM Update Permission Audit...\n";

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
    $warga1 = createUser('Warga 1', 'WARGA_TETAP', 1, 'warga1@test.com');
    $adminRt1 = createUser('Admin RT 1', 'ADMIN_RT', 1, 'adminrt1@test.com');
    $adminRt2 = createUser('Admin RT 2', 'ADMIN_RT', 3, 'adminrt2@test.com');

    // 2. Setup Store & Product for Warga 1
    Store::where('user_id', $warga1->id)->delete();
    $store1 = Store::create([
        'user_id' => $warga1->id,
        'rt_id' => $warga1->rt_id,
        'name' => 'Toko Warga 1',
        'status' => 'verified',
        'contact' => '08123456789'
    ]);

    Product::where('user_id', $warga1->id)->delete();
    $product1 = Product::create([
        'user_id' => $warga1->id,
        'store_id' => $store1->id,
        'rt_id' => $warga1->rt_id,
        'name' => 'Produk Warga 1',
        'description' => 'Desc',
        'price' => 10000,
        'category' => 'FOOD',
        'whatsapp' => '08123456789'
    ]);

    $productController = app()->make(\App\Http\Controllers\Api\ProductController::class);
    $storeController = app()->make(\App\Http\Controllers\Api\StoreController::class);

    // TEST 1: Warga updates own product
    echo "\nTest 1: Warga updates own product...\n";
    Auth::setUser($warga1);
    $req1 = Request::create('/api/products/' . $product1->id, 'PUT', [
        'name' => 'Produk Warga 1 Updated',
        'price' => 15000
    ]);
    $req1->setUserResolver(fn() => $warga1);
    
    $response1 = $productController->update($req1, $product1);
    if ($response1->getStatusCode() === 200) {
        echo "PASS: Warga updated own product.\n";
    } else {
        echo "FAIL: Warga failed to update own product. Status: " . $response1->getStatusCode() . "\n";
    }

    // TEST 2: Admin RT (Same RT) updates Warga's product
    echo "\nTest 2: Admin RT (Same RT) updates Warga's product...\n";
    Auth::setUser($adminRt1);
    $req2 = Request::create('/api/products/' . $product1->id, 'PUT', [
        'name' => 'Produk Warga 1 Moderated',
        'price' => 15000
    ]);
    $req2->setUserResolver(fn() => $adminRt1);

    $response2 = $productController->update($req2, $product1);
    if ($response2->getStatusCode() === 200) {
        echo "PASS: Admin RT updated Warga's product (Fixed behavior).\n";
    } else {
        echo "FAIL: Admin RT failed to update Warga's product (Current behavior). Status: " . $response2->getStatusCode() . "\n";
    }

    // TEST 3: Admin RT (Different RT) updates Warga's product
    echo "\nTest 3: Admin RT (Diff RT) updates Warga's product...\n";
    Auth::setUser($adminRt2);
    $req3 = Request::create('/api/products/' . $product1->id, 'PUT', [
        'name' => 'Produk Warga 1 Hacked',
        'price' => 15000
    ]);
    $req3->setUserResolver(fn() => $adminRt2);

    $response3 = $productController->update($req3, $product1);
    if ($response3->getStatusCode() === 403) {
        echo "PASS: Admin RT (Diff RT) blocked from updating.\n";
    } else {
        echo "FAIL: Admin RT (Diff RT) could update! Status: " . $response3->getStatusCode() . "\n";
    }

    // TEST 4: Admin RT (Same RT) updates Warga's Store
    echo "\nTest 4: Admin RT (Same RT) updates Warga's Store...\n";
    Auth::setUser($adminRt1);
    $req4 = Request::create('/api/stores/' . $store1->id, 'PUT', [
        'name' => 'Toko Warga 1 Moderated',
    ]);
    $req4->setUserResolver(fn() => $adminRt1);

    $response4 = $storeController->update($req4, $store1);
    if ($response4->getStatusCode() === 200) {
        echo "PASS: Admin RT updated Warga's Store (Fixed behavior).\n";
    } else {
        echo "FAIL: Admin RT failed to update Warga's Store (Current behavior). Status: " . $response4->getStatusCode() . "\n";
    }

} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString();
}
