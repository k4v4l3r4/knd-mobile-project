#!/usr/bin/env php
<?php
/**
 * Quick Fix Script for PollController::destroy Error
 * 
 * Usage: php quick_fix_poll.php
 * 
 * This script will:
 * 1. Clear all Laravel caches
 * 2. Regenerate autoload files
 * 3. Verify routes are working
 */

echo "\n";
echo "╔════════════════════════════════════════════╗\n";
echo "║  PollController Destroy Method Fix        ║\n";
echo "╚════════════════════════════════════════════╝\n";
echo "\n";

// Check if we're in the right directory
if (!file_exists(__DIR__ . '/vendor/autoload.php')) {
    echo "❌ Error: Please run this script from the api directory\n";
    exit(1);
}

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "Step 1/6: Clearing application cache...\n";
Illuminate\Support\Facades\Artisan::call('cache:clear');
echo "   ✓ Done\n\n";

echo "Step 2/6: Clearing config cache...\n";
Illuminate\Support\Facades\Artisan::call('config:clear');
echo "   ✓ Done\n\n";

echo "Step 3/6: Clearing route cache...\n";
Illuminate\Support\Facades\Artisan::call('route:clear');
echo "   ✓ Done\n\n";

echo "Step 4/6: Clearing view cache...\n";
Illuminate\Support\Facades\Artisan::call('view:clear');
echo "   ✓ Done\n\n";

echo "Step 5/6: Optimizing configuration...\n";
Illuminate\Support\Facades\Artisan::call('config:cache');
echo "   ✓ Done\n\n";

echo "Step 6/6: Caching routes...\n";
Illuminate\Support\Facades\Artisan::call('route:cache');
echo "   ✓ Done\n\n";

echo "═══════════════════════════════════════════\n";
echo "Verifying Poll Routes:\n";
echo "═══════════════════════════════════════════\n\n";

$routes = app('router')->getRoutes();
$pollRoutesFound = false;

foreach ($routes as $route) {
    if (strpos($route->uri, 'polls') !== false) {
        $methods = implode(',', $route->methods);
        $action = $route->getActionName();
        
        // Highlight DELETE route
        if (strpos($methods, 'DELETE') !== false) {
            echo "✓ {$route->uri} [$methods] => $action ⭐\n";
        } else {
            echo "✓ {$route->uri} [$methods] => $action\n";
        }
        
        $pollRoutesFound = true;
    }
}

if (!$pollRoutesFound) {
    echo "❌ No poll routes found!\n";
    exit(1);
}

echo "\n";
echo "═══════════════════════════════════════════\n";
echo "Checking Controller Methods:\n";
echo "═══════════════════════════════════════════\n\n";

$controllerClass = 'App\Http\Controllers\Api\PollController';
if (class_exists($controllerClass)) {
    $methods = get_class_methods($controllerClass);
    
    $requiredMethods = ['index', 'show', 'store', 'update', 'destroy', 'vote'];
    $allPresent = true;
    
    foreach ($requiredMethods as $method) {
        if (in_array($method, $methods)) {
            echo "✓ $method() - OK\n";
        } else {
            echo "✗ $method() - MISSING\n";
            $allPresent = false;
        }
    }
    
    if ($allPresent) {
        echo "\n✅ All required methods present!\n";
    } else {
        echo "\n❌ Some methods are missing!\n";
        exit(1);
    }
} else {
    echo "❌ PollController class not found!\n";
    exit(1);
}

echo "\n";
echo "═══════════════════════════════════════════\n";
echo "✅ FIX COMPLETED SUCCESSFULLY!\n";
echo "═══════════════════════════════════════════\n";
echo "\n";
echo "Next Steps:\n";
echo "1. Test deleting a poll from the mobile app\n";
echo "2. Monitor error logs at: storage/logs/laravel.log\n";
echo "3. If issues persist, check .htaccess file\n";
echo "\n";
echo "Script finished at: " . now()->format('Y-m-d H:i:s') . "\n";
echo "\n";
