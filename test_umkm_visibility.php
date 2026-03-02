<?php

require __DIR__ . '/api/vendor/autoload.php';

use App\Models\User;
use App\Models\Store;
use App\Models\Product;
use App\Models\WilayahRt;
use App\Models\WilayahRw;
use App\Support\PaymentSettings;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Http\Request;

$app = require __DIR__ . '/api/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "Starting UMKM Visibility Audit...\n";

// Backup Payment Settings
$originalSettings = null;
if (Storage::disk('local')->exists('payment_settings.json')) {
    $originalSettings = Storage::disk('local')->get('payment_settings.json');
}

try {
    // Clean up previous test data
    User::where('email', 'like', 'audit_vis_%')->forceDelete();
    Store::where('name', 'like', 'Audit Vis Store%')->delete();
    // Clean up RTs and RWs created for test (if any)
    // Be careful deleting RT/RW as other tests might use them, but we will create specific ones.

    // Create RWs
    $rw1 = WilayahRw::create([
        'code' => 'RW_VIS_01',
        'name' => 'RW Visibility 01',
        'subscription_status' => 'ACTIVE',
        // 'subscription_end_date' => now()->addYear(),
        // 'expired_at' => now()->addYear(),
    ]);

    $rw2 = WilayahRw::create([
        'code' => 'RW_VIS_02',
        'name' => 'RW Visibility 02',
        'subscription_status' => 'ACTIVE',
        // 'subscription_end_date' => now()->addYear(),
        // 'expired_at' => now()->addYear(),
    ]);

    echo "Created RWs: {$rw1->id}, {$rw2->id}\n";

    // Create RTs
    $rt1 = WilayahRt::create(['rw_id' => $rw1->id, 'rt_number' => '001', 'rt_name' => 'RT Vis 1']);
    $rt2 = WilayahRt::create(['rw_id' => $rw1->id, 'rt_number' => '002', 'rt_name' => 'RT Vis 2']);
    $rt3 = WilayahRt::create(['rw_id' => $rw2->id, 'rt_number' => '003', 'rt_name' => 'RT Vis 3']);

    echo "Created RTs: {$rt1->id}, {$rt2->id}, {$rt3->id}\n";

    // Create Users
    function createVisUser($rt, $rw, $suffix) {
        return User::create([
            'name' => "Audit Vis User $suffix",
            'email' => "audit_vis_$suffix@example.com",
            'password' => Hash::make('password'),
            'rt_id' => $rt->id,
            'rw_id' => $rw->id,
            'role' => 'WARGA_TETAP',
            'phone' => '08999999' . rand(100, 999),
        ]);
    }

    $user1 = createVisUser($rt1, $rw1, '1');
    $user2 = createVisUser($rt2, $rw1, '2');
    $user3 = createVisUser($rt3, $rw2, '3');

    echo "Created Users: {$user1->id}, {$user2->id}, {$user3->id}\n";

    // Create Stores & Products
    function createVisStoreProduct($user, $rt, $suffix) {
        $store = Store::create([
            'user_id' => $user->id,
            'rt_id' => $rt->id,
            'name' => "Audit Vis Store $suffix",
            'status' => 'verified',
            'verified_at' => now(),
            'contact' => '08123456789',
            'is_open' => true,
        ]);
        
        $product = Product::create([
                    'store_id' => $store->id,
                    'user_id' => $user->id,
                    'name' => "Audit Vis Product $suffix",
                    'description' => "Description for Audit Vis Product $suffix",
                    'price' => 10000,
                    'stock' => 10,
                    'is_available' => true,
                    'category' => 'FOOD', // Required field
                    'whatsapp' => '08123456789',
                ]);

        return [$store, $product];
    }

    [$store1, $prod1] = createVisStoreProduct($user1, $rt1, '1');
    [$store2, $prod2] = createVisStoreProduct($user2, $rt2, '2');
    [$store3, $prod3] = createVisStoreProduct($user3, $rt3, '3');

    echo "Created Stores & Products\n";

    // Test 1: Scope GLOBAL
    echo "\n--- Testing Scope: GLOBAL ---\n";
    Storage::disk('local')->put('payment_settings.json', json_encode(['umkm_scope' => 'GLOBAL']));
    
    // Clear cache/reload settings logic if needed (Settings are read from file each time in static::all())

    $controller = new \App\Http\Controllers\Api\ProductController();
    
    // Simulate Request from User 1
    $request = Request::create('/api/products', 'GET');
    $request->setUserResolver(fn() => $user1);
    
    $response = $controller->index($request);
    $data = $response->getData()->data;
    
    echo "Found " . count($data) . " products.\n";
    $ids = array_map(fn($p) => $p->id, $data);
    
    if (in_array($prod1->id, $ids) && in_array($prod2->id, $ids) && in_array($prod3->id, $ids)) {
        echo "[PASS] All products visible in GLOBAL scope.\n";
    } else {
        echo "[FAIL] Missing products in GLOBAL scope. Found: " . implode(', ', $ids) . "\n";
    }

    // Test 2: Scope RW
    echo "\n--- Testing Scope: RW ---\n";
    Storage::disk('local')->put('payment_settings.json', json_encode(['umkm_scope' => 'RW']));
    
    // Simulate Request from User 1 (RW1)
    $response = $controller->index($request);
    $data = $response->getData()->data;
    
    echo "Found " . count($data) . " products.\n";
    $ids = array_map(fn($p) => $p->id, $data);
    
    $seenProd1 = in_array($prod1->id, $ids); // Same RT, Same RW
    $seenProd2 = in_array($prod2->id, $ids); // Diff RT, Same RW
    $seenProd3 = in_array($prod3->id, $ids); // Diff RT, Diff RW
    
    if ($seenProd1 && $seenProd2 && !$seenProd3) {
        echo "[PASS] Correctly filtered by RW scope (Saw Same RW, Hidden Diff RW).\n";
    } else {
        echo "[FAIL] Incorrect visibility in RW scope.\n";
        echo "  Saw Prod 1 (Same RT): " . ($seenProd1 ? 'YES' : 'NO') . "\n";
        echo "  Saw Prod 2 (Diff RT, Same RW): " . ($seenProd2 ? 'YES' : 'NO') . "\n";
        echo "  Saw Prod 3 (Diff RW): " . ($seenProd3 ? 'YES' : 'NO') . "\n";
    }

} catch (\Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString() . "\n";
} finally {
    // Restore Settings
    if ($originalSettings) {
        Storage::disk('local')->put('payment_settings.json', $originalSettings);
        echo "\nRestored Payment Settings.\n";
    } else {
        // If it didn't exist, maybe delete it? Or leave default?
        // Let's leave it as GLOBAL default just in case
        Storage::disk('local')->put('payment_settings.json', json_encode(['umkm_scope' => 'GLOBAL']));
        echo "\nRestored Payment Settings to Default (GLOBAL).\n";
    }
    
    // Cleanup Data
    if (isset($user1)) $user1->forceDelete();
    if (isset($user2)) $user2->forceDelete();
    if (isset($user3)) $user3->forceDelete();
    if (isset($rt1)) $rt1->forceDelete();
    if (isset($rt2)) $rt2->forceDelete();
    if (isset($rt3)) $rt3->forceDelete();
    if (isset($rw1)) $rw1->forceDelete();
    if (isset($rw2)) $rw2->forceDelete();
    
    // Store/Product deletions (cascading or manual?)
    // Stores use soft deletes? No, Store model doesn't use SoftDeletes trait.
    // So forceDelete on User might have cascaded if foreign keys set, but better safe.
    Store::where('name', 'like', 'Audit Vis Store%')->delete();
    Product::where('name', 'like', 'Audit Vis Product%')->delete();
    
    echo "Cleanup Complete.\n";
}
