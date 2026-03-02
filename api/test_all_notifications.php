<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use App\Models\WilayahRt;
use App\Models\WilayahRw;
use App\Models\Fee;
use App\Models\BoardingHouse;
use App\Models\BoardingTenant;
use App\Services\WhatsAppService;
use Carbon\Carbon;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;

// Configuration
$tagihanPhone = '6289678861393';
$mobilePhone = '08999720110'; // 08999720110

echo "\n";
echo "========================================================\n";
echo "  COMPREHENSIVE NOTIFICATION TEST SCRIPT\n";
echo "========================================================\n";

$service = new WhatsAppService();

// Helper to log
function logOutput($msg) {
    echo $msg . "\n";
}

// ---------------------------------------------------------
// 1. CHECK / CREATE USERS
// ---------------------------------------------------------
logOutput("\n[1] CHECKING USERS...");

// Get RT
$rt = WilayahRt::first();
if (!$rt) {
    $rw = WilayahRw::firstOrCreate(['code' => 'RW001'], ['name' => 'RW 001', 'subscription_status' => 'ACTIVE']);
    $rt = WilayahRt::create(['rw_id' => $rw->id, 'rt_number' => '001', 'rt_name' => 'RT 001', 'kas_balance' => 0, 'invite_code' => 'TEST01']);
}

// Check Mobile User
$mobileUser = User::where('phone', $mobilePhone)->first();
if (!$mobileUser) {
    logOutput(" - Creating Mobile User ($mobilePhone)...");
    $mobileUser = User::create([
        'name' => 'Mobile User Test', 'phone' => $mobilePhone, 'password' => Hash::make('password'),
        'rt_id' => $rt->id, 'rw_id' => $rt->rw_id, 'role' => 'WARGA_TETAP'
    ]);
} else {
    logOutput(" - Mobile User found: {$mobileUser->name} ({$mobileUser->phone})");
}

// Check Tagihan User
$tagihanUser = User::where('phone', $tagihanPhone)->first();
if (!$tagihanUser) {
    logOutput(" - Creating Tagihan User ($tagihanPhone)...");
    $tagihanUser = User::create([
        'name' => 'Tagihan User Test', 'phone' => $tagihanPhone, 'password' => Hash::make('password'),
        'rt_id' => $rt->id, 'rw_id' => $rt->rw_id, 'role' => 'WARGA_TETAP'
    ]);
} else {
    logOutput(" - Tagihan User found: {$tagihanUser->name} ({$tagihanUser->phone})");
}


// ---------------------------------------------------------
// 2. TEST OTP SENDING (to Mobile User)
// ---------------------------------------------------------
logOutput("\n[2] TESTING OTP NOTIFICATION (to $mobilePhone)...");
$otpCode = (string) random_int(100000, 999999);
logOutput(" - Sending OTP: $otpCode");
try {
    $sent = $service->sendOtp($mobilePhone, $otpCode);
    if ($sent) {
        logOutput(" - SUCCESS: OTP sent to $mobilePhone");
    } else {
        logOutput(" - FAILED: OTP sending failed.");
    }
} catch (Exception $e) {
    logOutput(" - ERROR: " . $e->getMessage());
}


// ---------------------------------------------------------
// 3. TEST IURAN TAGIHAN (to Tagihan User)
// ---------------------------------------------------------
logOutput("\n[3] TESTING IURAN TAGIHAN NOTIFICATION (to $tagihanPhone)...");

// Ensure Fee
$fee = Fee::where('rt_id', $rt->id)->first();
if (!$fee) {
    $fee = Fee::create(['rt_id' => $rt->id, 'name' => 'Iuran Wajib Test', 'amount' => 50000, 'is_mandatory' => true]);
}

$today = Carbon::today();
$monthName = $today->translatedFormat('F');
$year = $today->year;
$formattedAmount = 'Rp ' . number_format($fee->amount, 0, ',', '.');
$senderName = "Pengurus " . ($rt->rt_name ?? "RT");

$message = "Yth. Bapak/Ibu {$tagihanUser->name},\n\n" .
             "Kami informasikan tagihan iuran bulanan Anda untuk periode *{$monthName} {$year}* sebagai berikut:\n\n" .
             "*Total Tagihan: {$formattedAmount}*\n\n" .
             "Mohon kesediaan Bapak/Ibu untuk melakukan pembayaran melalui aplikasi RT Online.\n\n" .
             "Terima kasih atas perhatian dan kerjasamanya.\n\n" .
             "Salam,\n" .
             "{$senderName}";

logOutput(" - Sending Iuran Tagihan Message...");
try {
    $sent = $service->sendMessage($tagihanPhone, $message);
    if ($sent) {
        logOutput(" - SUCCESS: Iuran Tagihan sent to $tagihanPhone");
    } else {
        logOutput(" - FAILED: Iuran Tagihan sending failed.");
    }
} catch (Exception $e) {
    logOutput(" - ERROR: " . $e->getMessage());
}


// ---------------------------------------------------------
// 4. TEST KOST TAGIHAN (to Tagihan User)
// ---------------------------------------------------------
logOutput("\n[4] TESTING KOST TAGIHAN NOTIFICATION (to $tagihanPhone)...");

// Ensure Boarding House & Tenant
$boardingHouse = BoardingHouse::where('owner_id', $tagihanUser->id)->first();
if (!$boardingHouse) {
    $boardingHouse = BoardingHouse::create([
        'owner_id' => $tagihanUser->id,
        'name' => 'Kost Sejahtera',
        'address' => 'Jl. Test No. 1',
        'total_rooms' => 10,
        'total_floors' => 1,
        'floor_config' => [],
        'tenant_id' => $rt->tenant_id ?? null,
    ]);
}

$tenant = BoardingTenant::where('user_id', $tagihanUser->id)->first();
if (!$tenant) {
    // Note: User can't be owner and tenant usually, but for test logic it's fine or we use another user.
    // Let's use tagihanUser as tenant for simplicity of receiving message.
    $tenant = BoardingTenant::create([
        'boarding_house_id' => $boardingHouse->id,
        'user_id' => $tagihanUser->id,
        'room_number' => '101',
        'room_price' => 750000,
        'start_date' => $today->copy()->subMonth(),
        'due_date' => $today, // Due today
        'status' => 'ACTIVE',
        'tenant_id' => $rt->tenant_id ?? null,
    ]);
} else {
    // Update due date to today for logic consistency
    $tenant->due_date = $today;
    $tenant->save();
}

$kostAmount = 'Rp ' . number_format($tenant->room_price, 0, ',', '.');
$kostMonthName = $today->translatedFormat('F Y');
$kostSenderName = "Pengurus " . $boardingHouse->name;

$kostMessage = "Yth. {$tagihanUser->name},\n\n" .
             "Kami informasikan tagihan sewa kost Anda untuk periode *{$kostMonthName}* telah jatuh tempo.\n\n" .
             "*Detail Tagihan:*\n" .
             "Kost: {$boardingHouse->name}\n" .
             "Kamar: {$tenant->room_number}\n" .
             "Jatuh Tempo: {$today->translatedFormat('d F Y')}\n" .
             "Total: *{$kostAmount}*\n\n" .
             "Mohon segera melakukan pembayaran melalui aplikasi atau hubungi pengurus kost.\n\n" .
             "Terima kasih.\n\n" .
             "Salam,\n" .
             "{$kostSenderName}";

logOutput(" - Sending Kost Tagihan Message...");
try {
    $sent = $service->sendMessage($tagihanPhone, $kostMessage);
    if ($sent) {
        logOutput(" - SUCCESS: Kost Tagihan sent to $tagihanPhone");
    } else {
        logOutput(" - FAILED: Kost Tagihan sending failed.");
    }
} catch (Exception $e) {
    logOutput(" - ERROR: " . $e->getMessage());
}

logOutput("\n========================================================");
logOutput("  ALL TESTS COMPLETED");
logOutput("========================================================\n");
