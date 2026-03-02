<?php

use App\Models\Wallet;

$accounts = Wallet::all();
echo "Total Accounts: " . $accounts->count() . "\n";
foreach ($accounts as $acc) {
    echo "ID: " . $acc->id . ", Name: " . $acc->name . ", RT ID: " . $acc->rt_id . "\n";
}
