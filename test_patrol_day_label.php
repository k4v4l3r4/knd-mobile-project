<?php

require __DIR__.'/api/vendor/autoload.php';

$app = require_once __DIR__.'/api/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\RondaSchedule;
use App\Models\WilayahRt;
use Carbon\Carbon;

echo "=== Testing Patrol Today - Day Label Fix ===\n\n";

// Get RT ID 1
$rt = WilayahRt::find(1);
if (!$rt) {
    echo "RT ID 1 not found!\n";
    exit;
}

echo "RT ID: {$rt->id}\n";
echo "RT Name: " . ($rt->nama_rt ?? 'N/A') . "\n\n";

$today = Carbon::today()->format('Y-m-d');
$todayCarbon = Carbon::parse($today);
$todayDayName = $todayCarbon->format('l');
echo "Today's Date: $today\n";
echo "Today's Day: $todayDayName\n";
echo "Current DateTime: " . now()->toDateTimeString() . "\n\n";

// Simulate the API query with new ordering
$schedules = RondaSchedule::with(['participants.user'])
    ->where('rt_id', $rt->id)
    ->where('status', 'ACTIVE')
    ->whereDate('start_date', '<=', $today)
    ->whereDate('end_date', '>=', $today)
    ->orderBy('schedule_type', 'desc') // WEEKLY before DAILY
    ->orderBy('start_time', 'asc') // Earliest shift first
    ->get();

echo "Found {$schedules->count()} active schedule(s) for TODAY:\n\n";

// Day name mapping
$dayMapId = [
    'Sunday'    => 'Minggu',
    'Monday'    => 'Senin',
    'Tuesday'   => 'Selasa',
    'Wednesday' => 'Rabu',
    'Thursday'  => 'Kamis',
    'Friday'    => 'Jumat',
    'Saturday'  => 'Sabtu',
];

foreach ($schedules as $schedule) {
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
    echo "Schedule ID: {$schedule->id}\n";
    echo "  Shift Name: {$schedule->shift_name}\n";
    echo "  Type: {$schedule->schedule_type}\n";
    echo "  Start Date: {$schedule->start_date}\n";
    echo "  End Date: {$schedule->end_date}\n";
    echo "  Start Time: {$schedule->start_time}\n";
    echo "  End Time: {$schedule->end_time}\n";
    echo "  Status: {$schedule->status}\n";
    
    // Calculate what day_of_week should be displayed
    $dayLabel = '';
    if ($schedule->start_date) {
        $parsed = Carbon::parse($schedule->start_date);
        $dayNameId = $dayMapId[$parsed->format('l')] ?? $parsed->format('l');
        $dateLabel = $parsed->format('d M Y');
        $dayLabel = $schedule->shift_name
            ? "{$schedule->shift_name} — {$dayNameId}, {$dateLabel}"
            : "{$dayNameId}, {$dateLabel}";
    } else {
        $todayDayNameId = $dayMapId[$todayCarbon->format('l')] ?? $todayCarbon->format('l');
        $todayDateLabel = $todayCarbon->format('d M Y');
        $dayLabel = $schedule->shift_name
            ? "{$schedule->shift_name} — {$todayDayNameId}, {$todayDateLabel}"
            : "{$todayDayNameId}, {$todayDateLabel}";
    }
    
    echo "  ➤ Display Label (day_of_week): $dayLabel\n";
    
    // Check if this is correct for today
    $isWithinRange = $schedule->start_date <= $today && $schedule->end_date >= $today;
    echo "  ✓ Within Today's Range: " . ($isWithinRange ? 'YES' : 'NO') . "\n";
    
    // Show what the CORRECT label should be for today
    $correctLabel = $schedule->shift_name
        ? "{$schedule->shift_name} — {$dayMapId[$todayDayName]}, {$todayCarbon->format('d M Y')}"
        : "{$dayMapId[$todayDayName]}, {$todayCarbon->format('d M Y')}";
    echo "  ★ Correct Label for TODAY: $correctLabel\n";
    
    echo "  Participants Count: {$schedule->participants->count()}\n";
    if ($schedule->participants->count() > 0) {
        echo "  Participants:\n";
        foreach ($schedule->participants as $p) {
            $userName = $p->user->name ?? 'Unknown';
            echo "    - {$userName} (Status: {$p->status})\n";
        }
    }
    echo "\n";
}

if ($schedules->count() === 0) {
    echo "\n⚠️  NO ACTIVE SCHEDULES FOUND FOR TODAY!\n";
}

echo "\n=== Test Complete ===\n";
echo "\nExpected Behavior:\n";
echo "- The 'day_of_week' field should show TODAY's date ({$todayDayName}, {$todayCarbon->format('d M Y')})\n";
echo "- NOT the schedule's start_date if it's different from today\n";
echo "- Schedules should be ordered by type (WEEKLY first) then by start_time (earliest first)\n";
