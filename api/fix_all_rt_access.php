<?php
// Simpan file ini di folder root project API (sejajar dengan artisan)
// Beri nama: fix_all_rt_access.php
// Jalankan dengan: php fix_all_rt_access.php

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

// Target Roles to Fix
$roles = ['ADMIN_RT', 'RT', 'RW', 'ADMIN_RW', 'SUPER_ADMIN'];
$defaultPassword = 'password123';

echo "=================================================================\n";
echo "       FIX ALL RT/RW ADMIN ACCESS (Phone Format & Password)      \n";
echo "=================================================================\n";

$users = User::withTrashed()->whereIn('role', $roles)->get();

$count = 0;
$fixed = 0;

echo str_pad("NAME", 25) . " | " . str_pad("ROLE", 15) . " | " . str_pad("OLD PHONE", 15) . " | " . str_pad("NEW PHONE", 15) . " | " . "STATUS\n";
echo str_repeat("-", 90) . "\n";

foreach ($users as $user) {
    $originalPhone = $user->phone;
    $cleanPhone = preg_replace('/[^0-9]/', '', $originalPhone);
    $newPhone = $cleanPhone;
    $status = [];

    // 1. Format Phone to 62...
    if (substr($cleanPhone, 0, 2) === '08') {
        $newPhone = '62' . substr($cleanPhone, 1);
    } elseif (substr($cleanPhone, 0, 1) === '8') {
        $newPhone = '62' . $cleanPhone;
    }

    // 2. Check for Duplicates
    if ($newPhone !== $originalPhone) {
        $existing = User::withTrashed()->where('phone', $newPhone)->where('id', '!=', $user->id)->first();
        if ($existing) {
            // If target number already exists, we have a conflict.
            // Strategy: Rename the OTHER user if this user is the "main" one? 
            // Or skip this user?
            // Safer: Skip update and mark as CONFLICT
            $status[] = "CONFLICT (Target exists)";
            $newPhone = $originalPhone; // Revert
        } else {
            $user->phone = $newPhone;
            $status[] = "Phone Updated";
        }
    }

    // 3. Reset Password
    // Always reset to ensure access
    $user->password = Hash::make($defaultPassword);
    $status[] = "Pass Reset";

    // 4. Restore if Deleted
    if ($user->trashed()) {
        $user->restore();
        $status[] = "Restored";
    }

    // Save
    if ($user->isDirty() || $user->trashed()) { // check trashed again just in case
        try {
            $user->save();
            $fixed++;
        } catch (\Exception $e) {
            $status[] = "ERROR: " . $e->getMessage();
        }
    } else {
        // Even if not dirty, we reset password above so it should be dirty.
        // Unless it was already correct.
    }

    echo str_pad(substr($user->name, 0, 24), 25) . " | " . 
         str_pad(substr($user->role, 0, 14), 15) . " | " . 
         str_pad(substr($originalPhone, 0, 14), 15) . " | " . 
         str_pad(substr($newPhone, 0, 14), 15) . " | " . 
         implode(", ", $status) . "\n";
    
    $count++;
}

echo str_repeat("-", 90) . "\n";
echo "Processed: $count users\n";
echo "Fixed/Updated: $fixed users\n";
echo "All passwords reset to: $defaultPassword\n";
echo "=================================================================\n";
