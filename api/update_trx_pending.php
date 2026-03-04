<?php

use App\Models\Transaction;

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$tx = Transaction::find(464);
if ($tx) {
    $tx->status = 'PENDING';
    $tx->save();
    echo "Transaction 464 status updated to PENDING.\n";
} else {
    echo "Transaction 464 not found.\n";
}
