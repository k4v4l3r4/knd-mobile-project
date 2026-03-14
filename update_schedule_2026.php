<?php

require __DIR__.'/api/vendor/autoload.php';

$app = require_once __DIR__.'/api/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\RondaSchedule;
use Carbon\Carbon;

echo "=== Updating Patrol Schedule to 2026 Dates ===\n\n";

// Get the existing schedule (ID: 102)
$schedule = RondaSchedule::find(102);

if (!$schedule) {
    echo "Schedule ID 102 not found!\n";
    exit;
}

echo "Found Schedule:\n";
echo "  Shift Name: {$schedule->shift_name}\n";
echo "  Current Start Date: {$schedule->start_date}\n";
echo "  Current End Date: {$schedule->end_date}\n\n";

// Update to current week in 2026 (March 14-20, 2026)
$today = Carbon::today();
$weekStart = $today->copy()->startOfWeek(Carbon::MONDAY);
$weekEnd = $today->copy()->endOfWeek(Carbon::SUNDAY);

echo "Updating to:\n";
echo "  New Start Date: {$weekStart->format('Y-m-d')}\n";
echo "  New End Date: {$weekEnd->format('Y-m-d')}\n\n";

$schedule->start_date = $weekStart->format('Y-m-d');
$schedule->end_date = $weekEnd->format('Y-m-d');
$schedule->save();

echo "✅ Schedule updated successfully!\n\n";

// Verify the update
$schedule = RondaSchedule::find(102);
echo "Updated Schedule Details:\n";
echo "  Shift Name: {$schedule->shift_name}\n";
echo "  Start Date: {$schedule->start_date}\n";
echo "  End Date: {$schedule->end_date}\n";
echo "  Status: {$schedule->status}\n\n";

echo "=== Test Complete ===\n";
