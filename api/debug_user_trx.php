<?php

use App\Models\Transaction;
use App\Models\User;

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$rtId = 58;
$userId = 468; // Based on previous finding

echo "Checking transactions for User $userId (RT $rtId)...\n";

$txs = Transaction::where('user_id', $userId)
    ->orderBy('date', 'desc')
    ->get();

foreach ($txs as $tx) {
    echo "ID: {$tx->id} | Date: {$tx->date} | Amount: {$tx->amount} | Status: {$tx->status} | Category: {$tx->category}\n";
}

echo "\nChecking ALL PENDING transactions for RT $rtId:\n";
$pending = Transaction::where('rt_id', $rtId)->where('status', 'PENDING')->get();
if ($pending->count() == 0) {
    echo "No PENDING transactions found.\n";
} else {
    foreach ($pending as $p) {
        echo "PENDING: ID {$p->id} | User: {$p->user_id} | Amount: {$p->amount} | Date: {$p->date}\n";
    }
}
