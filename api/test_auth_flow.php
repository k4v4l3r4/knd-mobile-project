<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Services\WhatsAppService;
use App\Models\User;
use App\Models\PasswordOtp;
use Illuminate\Support\Facades\Log;

// TARGET PHONE
$phone = '08999720110'; // The number that was failing

echo "TESTING AUTH FLOW FOR: $phone\n";
echo "======================================\n";

// Override Log to see output in console
Log::listen(function ($message) {
    echo "[LOG] " . $message->message . "\n";
});

// 1. FIND USER
$user = User::where('phone', $phone)->first();
if (!$user) {
    echo "ERROR: User not found in database!\n";
    exit(1);
}
echo "SUCCESS: User found: {$user->name} (ID: {$user->id})\n";

// 2. GENERATE OTP
$plainCode = (string) random_int(100000, 999999);
echo "Generated OTP: $plainCode\n";

// 3. STORE OTP
PasswordOtp::forPhone($phone)->delete();
PasswordOtp::create([
    'phone' => $phone,
    'code' => $plainCode,
    'expires_at' => now()->addMinutes(10),
]);
echo "OTP stored in database.\n";

// 4. SEND VIA WHATSAPP SERVICE
$service = new WhatsAppService();
echo "Attempting to send OTP via WhatsAppService...\n";

$sent = $service->sendOtp($phone, $plainCode);

if ($sent) {
    echo "SUCCESS: OTP sent via WhatsAppService.\n";
} else {
    echo "FAILED: WhatsAppService returned false.\n";
    // Check logs for why
}

echo "\nDone.\n";
