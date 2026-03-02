<?php

use App\Models\User;
use App\Models\RondaSchedule;
use App\Models\RondaLocation;
use App\Models\RondaFine;
use App\Models\RondaFineSetting;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

require __DIR__ . '/../vendor/autoload.php';

$app = require __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "Starting Full Ronda Audit...\n";

// Setup Users
$rt1 = User::where('email', 'rt1@example.com')->first();
if (!$rt1) {
    $rt1 = User::create([
        'name' => 'RT 1 Admin',
        'email' => 'rt1@example.com',
        'password' => bcrypt('password'),
        'role' => 'ADMIN_RT',
        'rt_id' => 1,
    ]);
}

$rt2 = User::where('email', 'rt2@example.com')->first();
if (!$rt2) {
    $rt2 = User::create([
        'name' => 'RT 2 Admin',
        'email' => 'rt2@example.com',
        'password' => bcrypt('password'),
        'role' => 'ADMIN_RT',
        'rt_id' => 3,
    ]);
}

$warga1 = User::where('email', 'warga1@example.com')->first();
if (!$warga1) {
    $warga1 = User::create([
        'name' => 'Warga 1',
        'email' => 'warga1@example.com',
        'password' => bcrypt('password'),
        'role' => 'WARGA_TETAP',
        'rt_id' => 1,
    ]);
}

// Clean up previous test data
RondaLocation::where('name', 'LIKE', 'Test Loc%')->forceDelete();
RondaFineSetting::where('rt_id', 1)->delete();
RondaFineSetting::where('rt_id', 3)->delete();
RondaFine::where('fine_type', 'TEST_FINE')->forceDelete();

// 1. Location Audit
echo "\n--- Auditing Locations ---\n";
Auth::login($rt1);
$controller = app()->make(\App\Http\Controllers\Api\RondaLocationController::class);

// RT1 Create Location
$req = new \Illuminate\Http\Request();
$req->merge([
    'name' => 'Test Loc RT1',
    'latitude' => -6.2,
    'longitude' => 106.8,
    'radius_meters' => 50
]);
$res = $controller->store($req);
$loc1 = $res->getData()->data;
echo "RT1 Created Location ID: " . $loc1->id . " - OK\n";

// RT2 Try to Update RT1 Location
Auth::login($rt2);
$req = new \Illuminate\Http\Request();
$req->merge([
    'name' => 'HACKED LOC',
]);
$res = $controller->update($req, $loc1->id);
if ($res->status() == 404 || $res->status() == 403) {
    echo "RT2 Cannot Update RT1 Location - OK (Status: " . $res->status() . ")\n";
} else {
    echo "CRITICAL: RT2 Updated RT1 Location! (Status: " . $res->status() . ")\n";
}

// RT2 Try to Delete RT1 Location
$res = $controller->destroy($loc1->id);
if ($res->status() == 404 || $res->status() == 403) {
    echo "RT2 Cannot Delete RT1 Location - OK (Status: " . $res->status() . ")\n";
} else {
    echo "CRITICAL: RT2 Deleted RT1 Location! (Status: " . $res->status() . ")\n";
}

// Warga1 View Locations
Auth::login($warga1);
$req = new \Illuminate\Http\Request();
$res = $controller->index($req);
$data = $res->getData()->data;
$found = false;
foreach ($data as $loc) {
    if ($loc->id == $loc1->id) $found = true;
}
if ($found) {
    echo "Warga1 Can View RT1 Location - OK\n";
} else {
    echo "Warga1 Cannot View RT1 Location - FAILED\n";
}

// 2. Fine Settings Audit
echo "\n--- Auditing Fine Settings ---\n";
Auth::login($rt1);
$controller = app()->make(\App\Http\Controllers\Api\RondaFineSettingController::class);

// RT1 Update Settings
$req = new \Illuminate\Http\Request();
$req->merge([
    'settings' => [
        [
            'fine_type' => 'TIDAK_HADIR',
            'amount' => 50000,
            'is_active' => true
        ]
    ]
]);
$res = $controller->store($req);
echo "RT1 Updated Settings - OK\n";

// Verify RT2 Settings are Empty or Default (not affected)
Auth::login($rt2);
$res = $controller->index();
$data = $res->getData()->data;
if (count($data) == 0 || $data[0]->amount != 50000) {
    echo "RT2 Settings Independent - OK\n";
} else {
    echo "WARNING: RT2 Settings Affected!\n";
}

// 3. Fines Audit
echo "\n--- Auditing Fines ---\n";
// Create dummy schedule
$schedule1 = RondaSchedule::create([
    'rt_id' => 1,
    'shift_name' => 'Test Shift',
    'start_date' => now(),
    'start_time' => '20:00',
    'end_time' => '23:00',
    'status' => 'ACTIVE'
]);

// Manually create fine for RT1
$fine1 = RondaFine::create([
    'rt_id' => 1,
    'user_id' => $warga1->id,
    'ronda_schedule_id' => $schedule1->id,
    'fine_type' => 'TEST_FINE',
    'amount' => 50000,
    'status' => 'UNPAID',
    'generated_at' => now()
]);

Auth::login($rt1);
$controller = app()->make(\App\Http\Controllers\Api\RondaFineController::class);

// RT1 View Fines
$req = new \Illuminate\Http\Request();
$res = $controller->index($req);
$data = $res->getData()->data->data; // Paginated
$found = false;
foreach ($data as $f) {
    if ($f->id == $fine1->id) $found = true;
}
if ($found) {
    echo "RT1 Can View Fine - OK\n";
} else {
    echo "RT1 Cannot View Fine - FAILED\n";
}

// RT2 Try to View RT1 Fines
Auth::login($rt2);
$res = $controller->index($req);
$data = $res->getData()->data->data;
$found = false;
foreach ($data as $f) {
    if ($f->id == $fine1->id) $found = true;
}
if (!$found) {
    echo "RT2 Cannot View RT1 Fine - OK\n";
} else {
    echo "CRITICAL: RT2 Can View RT1 Fine!\n";
}

// RT2 Try to Pay RT1 Fine
$res = $controller->markAsPaid($fine1->id);
if ($res->status() == 404 || $res->status() == 403) {
    echo "RT2 Cannot Pay RT1 Fine - OK (Status: " . $res->status() . ")\n";
} else {
    echo "CRITICAL: RT2 Paid RT1 Fine!\n";
}

// RT1 Pay Fine
Auth::login($rt1);
$res = $controller->markAsPaid($fine1->id);
if ($res->status() == 200) {
    echo "RT1 Paid Fine - OK\n";
    $fine1->refresh();
    if ($fine1->status == 'PAID') {
        echo "Fine Status Updated to PAID - OK\n";
    } else {
        echo "Fine Status Not Updated - FAILED\n";
    }
} else {
    echo "RT1 Failed to Pay Fine - FAILED (Status: " . $res->status() . ")\n";
}

// Cleanup
$fine1->forceDelete();
$schedule1->forceDelete();
RondaLocation::where('id', $loc1->id)->forceDelete();

echo "\nAudit Complete.\n";
