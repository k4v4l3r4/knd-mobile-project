<?php

use App\Models\User;
use App\Models\WilayahRt;
use App\Models\WilayahRw;

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$phone = '081200000001';
$user = User::where('phone', $phone)->first();

if (!$user) {
    echo "User {$phone} NOT FOUND.\n";
    exit(1);
}

echo "User Found: {$user->name} ({$user->role})\n";
echo "ID: {$user->id}\n";
echo "RT ID: " . ($user->rt_id ?? 'NULL') . "\n";
echo "RW ID: " . ($user->rw_id ?? 'NULL') . "\n";
echo "Tenant ID: " . ($user->tenant_id ?? 'NULL') . "\n";
echo "Role ID: " . ($user->role_id ?? 'NULL') . "\n";

if ($user->rt_id) {
    $rt = WilayahRt::find($user->rt_id);
    echo "RT Data: " . ($rt ? "Found ({$rt->rt_name})" : "NOT FOUND") . "\n";
}

if ($user->rw_id) {
    $rw = WilayahRw::find($user->rw_id);
    echo "RW Data: " . ($rw ? "Found ({$rw->name})" : "NOT FOUND") . "\n";
}

// Check tokens
echo "Tokens Count: " . $user->tokens()->count() . "\n";
