<?php

use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Illuminate\Http\Request;
use App\Models\User;

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

// Simulate Login
$phone = '081200000001';
$password = 'password';

if (!Auth::attempt(['phone' => $phone, 'password' => $password])) {
    echo "Login Failed!\n";
    exit(1);
}

$user = Auth::user();
echo "Logged in as: {$user->name} ({$user->role})\n";
echo "Token created (simulated)\n\n";

// Helper to simulate request
function simulateGet($uri, $user) {
    echo "GET {$uri} ... ";
    try {
        $request = Request::create($uri, 'GET');
        $request->setUserResolver(function () use ($user) {
            return $user;
        });
        
        $response = app()->handle($request);
        
        echo $response->getStatusCode() . "\n";
        if ($response->getStatusCode() !== 200) {
            echo "Response: " . $response->getContent() . "\n";
        }
    } catch (\Exception $e) {
        echo "Exception: " . $e->getMessage() . "\n";
    }
}

simulateGet('/api/me', $user);
simulateGet('/api/announcements', $user);

if (in_array($user->role, ['ADMIN_RT', 'SECRETARY', 'TREASURER'])) {
    simulateGet('/api/rt/invite-code', $user);
}
