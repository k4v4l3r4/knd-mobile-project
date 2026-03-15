<?php

/**
 * Test script to verify the asset loan API endpoint
 * Run this from the api directory: php test_asset_loan.php
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use App\Models\Asset;
use Illuminate\Support\Facades\DB;

echo "=== Testing Asset Loan Endpoint ===\n\n";

// Check if there are any users with WARGA role
echo "1. Checking for WARGA users...\n";
$wargaUsers = User::where('role', 'warga')->orWhere('role', 'WARGA')->get();
if ($wargaUsers->count() === 0) {
    echo "   ❌ No WARGA users found. Please create a WARGA user first.\n\n";
} else {
    echo "   ✓ Found {$wargaUsers->count()} WARGA user(s)\n";
    foreach ($wargaUsers as $user) {
        echo "     - ID: {$user->id}, Name: {$user->name}, Email: {$user->email}\n";
    }
    echo "\n";
}

// Check if there are any assets available
echo "2. Checking available assets...\n";
$assets = Asset::where('available_quantity', '>', 0)->get();
if ($assets->count() === 0) {
    echo "   ❌ No assets with available quantity found.\n\n";
} else {
    echo "   ✓ Found {$assets->count()} available asset(s)\n";
    foreach ($assets as $asset) {
        echo "     - ID: {$asset->id}, Name: {$asset->name}, Available: {$asset->available_quantity}/{$asset->total_quantity}\n";
    }
    echo "\n";
}

// Check authentication middleware
echo "3. Checking authentication setup...\n";
try {
    $sanctumExists = class_exists('Laravel\Sanctum\Sanctum');
    if ($sanctumExists) {
        echo "   ✓ Laravel Sanctum is installed\n";
    } else {
        echo "   ⚠ Laravel Sanctum not found - authentication may not work\n";
    }
} catch (\Exception $e) {
    echo "   ⚠ Error checking Sanctum: " . $e->getMessage() . "\n";
}
echo "\n";

// Test creating a loan directly (simulating what the API does)
echo "4. Testing loan creation logic...\n";
if ($wargaUsers->count() > 0 && $assets->count() > 0) {
    try {
        $user = $wargaUsers->first();
        $asset = $assets->first();
        
        echo "   Using user: {$user->name} (ID: {$user->id})\n";
        echo "   Using asset: {$asset->name} (ID: {$asset->id})\n";
        
        DB::beginTransaction();
        
        // Create a test loan
        $loan = \App\Models\AssetLoan::create([
            'user_id' => $user->id,
            'asset_id' => $asset->id,
            'quantity' => 1,
            'loan_date' => now()->toDateString(),
            'status' => 'PENDING',
        ]);
        
        echo "   ✓ Successfully created test loan with ID: {$loan->id}\n";
        
        // Clean up
        $loan->delete();
        DB::commit();
        echo "   ✓ Test loan cleaned up\n\n";
        
    } catch (\Exception $e) {
        DB::rollBack();
        echo "   ❌ Error creating loan: " . $e->getMessage() . "\n";
        echo "      File: " . $e->getFile() . ":" . $e->getLine() . "\n\n";
    }
} else {
    echo "   ⚠ Skipping test - missing required data\n\n";
}

echo "5. Checking route configuration...\n";
try {
    $route = \Illuminate\Support\Facades\Route::getRoutes()->getByName('assets.loan');
    if ($route) {
        echo "   ✓ Route /assets/loan exists\n";
        echo "     Method: " . implode(', ', $route->methods()) . "\n";
        echo "     Action: " . $route->getActionName() . "\n";
    } else {
        echo "   ⚠ Route /assets/loan not found in named routes\n";
        // Try to find it by path
        $routes = \Illuminate\Support\Facades\Route::getRoutes();
        foreach ($routes as $r) {
            if ($r->uri() === 'assets/loan') {
                echo "   ✓ Found route by path: " . implode(', ', $r->methods()) . " -> " . $r->getActionName() . "\n";
                break;
            }
        }
    }
} catch (\Exception $e) {
    echo "   ⚠ Error checking routes: " . $e->getMessage() . "\n";
}
echo "\n";

echo "=== Test Complete ===\n\n";

echo "Next Steps:\n";
echo "1. Make sure you have at least one WARGA user\n";
echo "2. Make sure you have at least one asset with available quantity\n";
echo "3. Ensure the mobile app user is properly authenticated\n";
echo "4. Check Laravel logs at storage/logs/laravel.log for detailed error messages\n";
echo "5. Try submitting a loan request again and check the network response\n";
echo "\n";
