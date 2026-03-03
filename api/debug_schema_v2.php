<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

require __DIR__.'/vendor/autoload.php';
$app = require __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

try {
    echo "Checking 'notifications' table schema...\n";
    $columns = Schema::getColumnListing('notifications');
    echo "Columns: " . implode(', ', $columns) . "\n";
    
    echo "\nColumn Types:\n";
    foreach ($columns as $col) {
        $type = Schema::getColumnType('notifications', $col);
        echo "- $col: $type\n";
    }

} catch (\Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
