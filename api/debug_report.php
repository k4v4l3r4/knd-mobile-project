<?php

use App\Models\Transaction;
use App\Models\User;
use App\Models\Fee;
use App\Models\ActivityCategory;
use Illuminate\Support\Facades\DB;

require __DIR__ . '/vendor/autoload.php';
$app = require __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$rtId = 58;
echo "Debugging RT $rtId...\n";

// 1. Check for Null Categories
$nullCatCount = Transaction::where('rt_id', $rtId)->whereNull('category')->count();
echo "Transactions with NULL category: $nullCatCount\n";

if ($nullCatCount > 0) {
    echo "Found NULL categories! Listing IDs:\n";
    $ids = Transaction::where('rt_id', $rtId)->whereNull('category')->pluck('id');
    echo $ids->implode(', ') . "\n";
}

// 2. Check for Null Dates
$nullDateCount = Transaction::where('rt_id', $rtId)->whereNull('date')->count();
echo "Transactions with NULL date: $nullDateCount\n";

// 3. Simulate ReportController::duesRecap logic (getDuesMatrix)
echo "\nSimulating getDuesMatrix logic...\n";
try {
    $year = date('Y');
    
    // Get Users
    $users = User::where('rt_id', $rtId)->get();
    echo "Users found: " . $users->count() . "\n";

    // Get Transactions
    $transactions = Transaction::where('rt_id', $rtId)
        ->whereYear('date', $year)
        ->where('type', 'IN')
        ->where('status', '!=', 'REJECTED')
        ->get();
    
    echo "Transactions found: " . $transactions->count() . "\n";

    $grouped = $transactions->groupBy(function($item) {
        if (!$item->date) {
            throw new Exception("Transaction ID {$item->id} has NULL date!");
        }
        return $item->user_id . '-' . $item->date->format('m');
    });
    
    echo "Grouping successful. Groups: " . $grouped->count() . "\n";

} catch (\Exception $e) {
    echo "CRASH during simulation: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString();
}

// 4. Check ReportController::summary logic
echo "\nSimulating ReportController::summary logic...\n";
try {
    $incomeTransactions = Transaction::where('rt_id', $rtId)
        ->where('type', 'IN')
        ->selectRaw('category, sum(amount) as total')
        ->groupBy('category')
        ->get();
    
    echo "Income Groups:\n";
    foreach ($incomeTransactions as $tx) {
        echo "  Category: '" . ($tx->category ?? 'NULL') . "' -> Total: " . $tx->total . "\n";
    }

} catch (\Exception $e) {
    echo "CRASH during summary simulation: " . $e->getMessage() . "\n";
}
