<?php
require __DIR__ . '/vendor/autoload.php';
$app = require __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "--- Activity Categories (RT 58) ---\n";
try {
    $cats = \App\Models\ActivityCategory::where('rt_id', 58)->get();
    foreach ($cats as $c) {
        echo "ID: $c->id | Name: $c->name\n";
    }
} catch (\Exception $e) {
    echo "ActivityCategory model or table not found/accessible.\n";
}

echo "\n--- Distinct Transaction Categories (RT 58) ---\n";
$transCats = \App\Models\Transaction::where('rt_id', 58)->distinct()->pluck('category');
foreach ($transCats as $c) {
    echo "$c\n";
}

echo "\n--- Wallets (RT 58) ---\n";
$wallets = \App\Models\Wallet::where('rt_id', 58)->get();
foreach ($wallets as $w) {
    echo "ID: $w->id | Name: $w->name | Type: $w->type\n";
}

echo "\n--- Fees (RT 58) ---\n";
$fees = \App\Models\Fee::where('rt_id', 58)->get();
foreach ($fees as $f) {
    echo "ID: $f->id | Name: $f->name\n";
}
