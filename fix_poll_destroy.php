<?php
// Fix script to clear Laravel route cache and verify PollController routes
require __DIR__ . '/api/vendor/autoload.php';

$app = require_once __DIR__ . '/api/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "=== Clearing Laravel Caches ===\n\n";

// Clear all caches
echo "1. Clearing application cache...\n";
exec('cd api && php artisan cache:clear', $output, $returnCode);
echo "   Cache cleared (return code: $returnCode)\n\n";

echo "2. Clearing config cache...\n";
exec('cd api && php artisan config:clear', $output, $returnCode);
echo "   Config cleared (return code: $returnCode)\n\n";

echo "3. Clearing route cache...\n";
exec('cd api && php artisan route:clear', $output, $returnCode);
echo "   Route cleared (return code: $returnCode)\n\n";

echo "4. Clearing view cache...\n";
exec('cd api && php artisan view:clear', $output, $returnCode);
echo "   View cleared (return code: $returnCode)\n\n";

echo "5. Optimizing routes...\n";
exec('cd api && php artisan route:cache', $output, $returnCode);
echo "   Routes cached (return code: $returnCode)\n\n";

echo "=== Verifying Poll Routes ===\n\n";

$routes = app('router')->getRoutes();
$pollRoutes = [];

foreach ($routes as $route) {
    if (strpos($route->uri, 'polls') !== false) {
        $methods = implode(',', $route->methods);
        $action = $route->getActionName();
        echo "✓ {$route->uri} [$methods] => $action\n";
    }
}

echo "\n=== Checking PollController Methods ===\n\n";

$controllerClass = 'App\Http\Controllers\Api\PollController';
if (class_exists($controllerClass)) {
    $methods = get_class_methods($controllerClass);
    echo "PollController methods found:\n";
    foreach ($methods as $method) {
        echo "  - $method\n";
    }
    
    if (in_array('destroy', $methods)) {
        echo "\n✓ destroy method EXISTS in PollController\n";
    } else {
        echo "\n✗ destroy method NOT FOUND in PollController\n";
    }
} else {
    echo "✗ PollController class not found!\n";
}

echo "\n=== Fix Complete ===\n";
echo "\nNext steps:\n";
echo "1. Test the DELETE /api/polls/{id} endpoint\n";
echo "2. If still failing, check web server (Apache/Nginx) configuration\n";
echo "3. Ensure .htaccess is present in api/public/ directory\n";
