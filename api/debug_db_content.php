<?php

use Illuminate\Support\Facades\DB;

require __DIR__.'/vendor/autoload.php';
$app = require __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

try {
    $row = DB::table('notifications')->first();
    if ($row) {
        echo "ID: " . $row->id . " (Type: " . gettype($row->id) . ")\n";
        echo "Row Data: " . json_encode($row) . "\n";
    } else {
        echo "No notifications found.\n";
    }
} catch (\Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
