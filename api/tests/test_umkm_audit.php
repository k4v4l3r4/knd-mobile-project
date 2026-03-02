<?php

require __DIR__ . '/../vendor/autoload.php';

use App\Models\User;
use App\Models\Store;
use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

$app = require __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "Starting UMKM (Store/Product) Audit...\n\n";

// Helper to create user
function createUser($name, $role, $rt_id, $email) {
    // Delete if exists
    User::where('email', $email)->forceDelete();
    
    return User::create([
        'name' => $name,
        'email' => $email,
        'password' => Hash::make('password'),
        'role' => $role,
        'rt_id' => $rt_id,
        'rw_id' => 1, // Assume same RW for simplicity unless testing cross-RW
        'phone' => '08' . rand(100000000, 999999999) // Random phone
    ]);
}

// 1. Setup Users
// RT 1
$adminRt1 = createUser('Admin RT 1', 'ADMIN_RT', 1, 'adminrt1_umkm@test.com');
$warga1 = createUser('Warga 1', 'WARGA_TETAP', 1, 'warga1_umkm@test.com');
$warga2 = createUser('Warga 2', 'WARGA_TETAP', 1, 'warga2_umkm@test.com');

// RT 2 (Using ID 3 as 2 might not exist)
$adminRt2 = createUser('Admin RT 2', 'ADMIN_RT', 3, 'adminrt2_umkm@test.com');
$warga3 = createUser('Warga 3', 'WARGA_TETAP', 3, 'warga3_umkm@test.com');

echo "--- Users Created ---\n";

// Cleanup existing stores for these users
Store::whereIn('user_id', [$warga1->id, $warga2->id, $warga3->id])->delete();

// 2. Warga Creates Store
echo "\n--- Warga Creates Store ---\n";
try {
    $response = app()->make(\App\Http\Controllers\Api\StoreController::class)->store(
        Illuminate\Http\Request::create('/api/stores', 'POST', [
            'name' => 'Toko Warga 1',
            'description' => 'Desc Warga 1',
            'contact' => '08123456789',
            'is_open' => true
        ])->setUserResolver(fn() => $warga1)
    );
    
    $store1 = json_decode($response->getContent())->data;
    echo "Warga 1 Created Store ID: " . $store1->id . " - OK\n";
    
    // Check status is pending
    if ($store1->status === 'pending') {
        echo "Store 1 Status is PENDING - OK\n";
    } else {
        echo "Store 1 Status is " . $store1->status . " - FAIL\n";
    }
} catch (\Exception $e) {
    echo "Warga 1 Failed to Create Store: " . $e->getMessage() . "\n";
}

// Create Store for Warga 3 (RT 2)
try {
    $response = app()->make(\App\Http\Controllers\Api\StoreController::class)->store(
        Illuminate\Http\Request::create('/api/stores', 'POST', [
            'name' => 'Toko Warga 3',
            'description' => 'Desc Warga 3',
            'contact' => '08123456789',
            'is_open' => true
        ])->setUserResolver(fn() => $warga3)
    );
    $store3 = json_decode($response->getContent())->data;
    echo "Warga 3 Created Store ID: " . $store3->id . " - OK\n";
} catch (\Exception $e) {
    echo "Warga 3 Failed to Create Store: " . $e->getMessage() . "\n";
}

// 3. Admin RT Verifies Store
echo "\n--- Admin RT Verifies Store ---\n";

// Admin RT 2 trying to verify Store 1 (RT 1) - Should Fail
try {
    $storeModel1 = Store::find($store1->id);
    $response = app()->make(\App\Http\Controllers\Api\StoreController::class)->verify(
        Illuminate\Http\Request::create('/api/stores/' . $store1->id . '/verify', 'POST', [
            'status' => 'verified'
        ])->setUserResolver(fn() => $adminRt2),
        $storeModel1
    );
    
    if ($response->getStatusCode() === 403) {
        echo "Admin RT 2 Cannot Verify Store 1 (RT 1) - OK (Status: 403)\n";
    } else {
        echo "Admin RT 2 Verified Store 1 - FAIL (Status: " . $response->getStatusCode() . ")\n";
    }
} catch (\Exception $e) {
    echo "Admin RT 2 Verification Error: " . $e->getMessage() . "\n";
}

// Admin RT 1 verifying Store 1 (RT 1) - Should Pass
try {
    $storeModel1 = Store::find($store1->id);
    $response = app()->make(\App\Http\Controllers\Api\StoreController::class)->verify(
        Illuminate\Http\Request::create('/api/stores/' . $store1->id . '/verify', 'POST', [
            'status' => 'verified'
        ])->setUserResolver(fn() => $adminRt1),
        $storeModel1
    );
    
    $updatedStore = json_decode($response->getContent())->data;
    if ($updatedStore->status === 'verified') {
        echo "Admin RT 1 Verified Store 1 - OK\n";
    } else {
        echo "Admin RT 1 Failed to Verify Store 1 - FAIL\n";
    }
} catch (\Exception $e) {
    echo "Admin RT 1 Verification Error: " . $e->getMessage() . "\n";
}

// 4. Product Creation
echo "\n--- Product Creation ---\n";

// Warga 1 (Verified Store) creates product - Should Pass
try {
    // Need to reload user relations as store status changed
    $warga1 = User::with('store')->find($warga1->id);
    
    $response = app()->make(\App\Http\Controllers\Api\ProductController::class)->store(
        Illuminate\Http\Request::create('/api/products', 'POST', [
            'name' => 'Product Warga 1',
            'description' => 'Desc',
            'price' => 10000,
            'stock' => 10,
            'category' => 'FOOD' // Required by DB
        ])->setUserResolver(fn() => $warga1)
    );
    
    if ($response->getStatusCode() === 201) {
        $product1 = json_decode($response->getContent())->data;
        echo "Warga 1 Created Product ID: " . $product1->id . " - OK\n";
    } else {
        echo "Warga 1 Failed to Create Product - FAIL (Status: " . $response->getStatusCode() . ")\n";
        echo "Message: " . json_decode($response->getContent())->message . "\n";
    }
} catch (\Exception $e) {
    echo "Warga 1 Product Creation Error: " . $e->getMessage() . "\n";
}

// Warga 3 (Pending Store) creates product - Should Fail
try {
    $warga3 = User::with('store')->find($warga3->id);
    
    $response = app()->make(\App\Http\Controllers\Api\ProductController::class)->store(
        Illuminate\Http\Request::create('/api/products', 'POST', [
            'name' => 'Product Warga 3',
            'description' => 'Desc',
            'price' => 10000,
            'stock' => 10
        ])->setUserResolver(fn() => $warga3)
    );
    
    if ($response->getStatusCode() === 403) {
        echo "Warga 3 (Pending Store) Cannot Create Product - OK (Status: 403)\n";
    } else {
        echo "Warga 3 Created Product - FAIL (Status: " . $response->getStatusCode() . ")\n";
    }
} catch (\Exception $e) {
    echo "Warga 3 Product Creation Error: " . $e->getMessage() . "\n";
}

// 5. Update/Delete Restrictions
echo "\n--- Update/Delete Restrictions ---\n";

// Warga 2 trying to update Warga 1's Store - Should Fail
try {
    $storeModel1 = Store::find($store1->id);
    $response = app()->make(\App\Http\Controllers\Api\StoreController::class)->update(
        Illuminate\Http\Request::create('/api/stores/' . $store1->id, 'POST', [ // Using POST for update often requires _method=PUT or just mapped to update
             'name' => 'Hacked Name'
        ])->setUserResolver(fn() => $warga2),
        $storeModel1
    );
    
    if ($response->getStatusCode() === 403) {
        echo "Warga 2 Cannot Update Warga 1's Store - OK (Status: 403)\n";
    } else {
        echo "Warga 2 Updated Warga 1's Store - FAIL (Status: " . $response->getStatusCode() . ")\n";
    }
} catch (\Exception $e) {
    echo "Warga 2 Update Error: " . $e->getMessage() . "\n";
}

// Admin RT 2 trying to delete Warga 1's Store (RT 1) - Should Fail
try {
    $storeModel1 = Store::find($store1->id);
    if (!$storeModel1) {
        echo "Store Model 1 Not Found!\n";
    }
    
    // Note: destroy expects route model binding, but calling controller method directly requires passing model
    // However, Laravel's request injection in destroy might need setting user resolver on the global request()
    // Let's Mock request user
    \Illuminate\Support\Facades\Auth::setUser($adminRt2);
    request()->setUserResolver(fn() => $adminRt2);
    
    $response = app()->make(\App\Http\Controllers\Api\StoreController::class)->destroy(request(), $storeModel1);
    
    if ($response->getStatusCode() === 403) {
        echo "Admin RT 2 Cannot Delete Warga 1's Store - OK (Status: 403)\n";
    } else {
        echo "Admin RT 2 Deleted Warga 1's Store - FAIL (Status: " . $response->getStatusCode() . ")\n";
    }
} catch (\Exception $e) {
    echo "Admin RT 2 Delete Error: " . $e->getMessage() . "\n";
}

// Admin RT 1 deleting Warga 1's Store (RT 1) - Should Pass
try {
    \Illuminate\Support\Facades\Auth::setUser($adminRt1);
    request()->setUserResolver(fn() => $adminRt1);
    $storeModel1 = Store::find($store1->id);
    
    $response = app()->make(\App\Http\Controllers\Api\StoreController::class)->destroy(request(), $storeModel1);
    
    if ($response->getStatusCode() === 200) {
        echo "Admin RT 1 Deleted Warga 1's Store - OK\n";
    } else {
        echo "Admin RT 1 Failed to Delete Store - FAIL (Status: " . $response->getStatusCode() . ")\n";
    }
} catch (\Exception $e) {
    echo "Admin RT 1 Delete Error: " . $e->getMessage() . "\n";
}

echo "\nAudit Complete.\n";
