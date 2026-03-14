<?php

require __DIR__.'/api/vendor/autoload.php';

$app = require_once __DIR__.'/api/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\RondaSchedule;
use App\Models\WilayahRt;
use Carbon\Carbon;

echo "=== Testing Patrol Today - Simulating API Transformation ===\n\n";

// Get RT ID 1
$rt = WilayahRt::find(1);
if (!$rt) {
    echo "RT ID 1 not found!\n";
    exit;
}

echo "RT ID: {$rt->id}\n\n";

$today = Carbon::today()->format('Y-m-d');
echo "Today's Date: $today\n";
echo "Current DateTime: " . now()->toDateTimeString() . "\n\n";

// Query with new ordering
$schedules = RondaSchedule::with(['participants.user'])
    ->where('rt_id', $rt->id)
    ->where('status', 'ACTIVE')
    ->whereDate('start_date', '<=', $today)
    ->whereDate('end_date', '>=', $today)
    ->orderBy('schedule_type', 'desc')
    ->orderBy('start_time', 'asc')
    ->get();

// Day name mapping (same as API)
$dayMapId = [
    'Sunday'    => 'Minggu',
    'Monday'    => 'Senin',
    'Tuesday'   => 'Selasa',
    'Wednesday' => 'Rabu',
    'Thursday'  => 'Kamis',
    'Friday'    => 'Jumat',
    'Saturday'  => 'Sabtu',
];

$authUserId = 1; // Mock user

echo "Found {$schedules->count()} active schedule(s):\n\n";

// Simulate the EXACT transformation from the API
$transformedSchedules = $schedules->map(function($schedule) use ($today, $dayMapId, $authUserId) {
    $members = $schedule->participants->map(function($participant) use ($authUserId) {
        return [
            'id'            => $participant->id,
            'user'          => $participant->user,
            'status'        => $participant->status,
            'attendance_at' => $participant->attendance_at,
            'clock_out_at'  => $participant->clock_out_at ?? null,
            'is_me'         => $participant->user_id === $authUserId,
        ];
    });

    // EXACT code from PatrolController@today
    $dayLabel = '';
    $todayCarbon = Carbon::parse($today);
    $todayDayNameId = $dayMapId[$todayCarbon->format('l')] ?? $todayCarbon->format('l');
    $todayDateLabel = $todayCarbon->format('d M Y');
    
    if ($schedule->start_date && $schedule->end_date) {
        // For date-range schedules (WEEKLY), check if today falls within the range
        $startCarbon = Carbon::parse($schedule->start_date);
        $endCarbon = Carbon::parse($schedule->end_date);
        
        if ($todayCarbon->between($startCarbon, $endCarbon)) {
            // Today is within the schedule range - use TODAY's date
            $dayLabel = $schedule->shift_name
                ? "{$schedule->shift_name} — {$todayDayNameId}, {$todayDateLabel}"
                : "{$todayDayNameId}, {$todayDateLabel}";
        } else {
            // Outside range (shouldn't happen due to query, but fallback)
            $parsed = $startCarbon;
            $dayNameId = $dayMapId[$parsed->format('l')] ?? $parsed->format('l');
            $dateLabel = $parsed->format('d M Y');
            $dayLabel = $schedule->shift_name
                ? "{$schedule->shift_name} — {$dayNameId}, {$dateLabel}"
                : "{$dayNameId}, {$dateLabel}";
        }
    } elseif ($schedule->start_date) {
        // For DAILY schedules or schedules without end_date
        $parsed    = Carbon::parse($schedule->start_date);
        $dayNameId = $dayMapId[$parsed->format('l')] ?? $parsed->format('l');
        $dateLabel = $parsed->format('d M Y');
        $dayLabel  = $schedule->shift_name
            ? "{$schedule->shift_name} — {$dayNameId}, {$dateLabel}"
            : "{$dayNameId}, {$dateLabel}";
    } else {
        // Fallback to today's date if no start_date (legacy)
        $dayLabel = $schedule->shift_name
            ? "{$schedule->shift_name} — {$todayDayNameId}, {$todayDateLabel}"
            : "{$todayDayNameId}, {$todayDateLabel}";
    }

    return [
        'id'            => $schedule->id,
        'schedule_type' => $schedule->schedule_type,
        'start_date'    => $schedule->start_date,
        'end_date'      => $schedule->end_date,
        'start_time'    => $schedule->start_time,
        'end_time'      => $schedule->end_time,
        'shift_name'    => $schedule->shift_name,
        'members'       => $members,
        'day_of_week'   => $dayLabel, // THIS IS WHAT THE API RETURNS
        'week_number'   => 1,
    ];
});

foreach ($transformedSchedules as $idx => $schedule) {
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
    echo "Schedule #" . ($idx + 1) . "\n";
    echo "  ID: {$schedule['id']}\n";
    echo "  Shift Name: {$schedule['shift_name']}\n";
    echo "  Type: {$schedule['schedule_type']}\n";
    echo "  Date Range: {$schedule['start_date']} s/d {$schedule['end_date']}\n";
    echo "  Time: {$schedule['start_time']} - {$schedule['end_time']}\n";
    echo "  ➤ day_of_week (API Response): {$schedule['day_of_week']}\n";
    echo "  Members Count: " . count($schedule['members']) . "\n";
    echo "\n";
}

if ($transformedSchedules->count() === 0) {
    echo "⚠️  NO ACTIVE SCHEDULES FOUND!\n";
}

echo "\n=== Test Complete ===\n";
echo "\nThe 'day_of_week' field above shows what the mobile app will receive.\n";
echo "It should display TODAY's date (Sabtu, 14 Mar 2026) for schedules active today.\n";
