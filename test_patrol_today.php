<?php

require __DIR__.'/api/vendor/autoload.php';

$app = require_once __DIR__.'/api/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\RondaSchedule;
use App\Models\WilayahRt;
use Carbon\Carbon;

echo "=== Testing Patrol Today Query ===\n\n";

// Get RT ID 1 (which has schedules)
$rt = WilayahRt::find(1);
if (!$rt) {
    echo "RT ID 1 not found!\n";
    exit;
}

echo "RT ID: {$rt->id}\n";
$rtName = $rt->nama_rt ?? 'N/A';
echo "RT Name: $rtName\n\n";

$today = Carbon::today()->format('Y-m-d');
echo "Today's Date: $today\n";
echo "Current DateTime: " . now()->toDateTimeString() . "\n\n";

// Query schedules
$schedules = RondaSchedule::with(['participants.user'])
    ->where('rt_id', $rt->id)
    ->where('status', 'ACTIVE')
    ->whereDate('start_date', '<=', $today)
    ->whereDate('end_date', '>=', $today)
    ->orderBy('schedule_type', 'desc') // WEEKLY before DAILY
    ->orderBy('start_time', 'asc') // Earliest shift first
    ->get();

echo "Found {$schedules->count()} active schedule(s):\n\n";

foreach ($schedules as $schedule) {
    echo "Schedule ID: {$schedule->id}\n";
    echo "  Shift Name: {$schedule->shift_name}\n";
    echo "  Type: {$schedule->schedule_type}\n";
    echo "  Start Date: {$schedule->start_date}\n";
    echo "  End Date: {$schedule->end_date}\n";
    echo "  Start Time: {$schedule->start_time}\n";
    echo "  End Time: {$schedule->end_time}\n";
    echo "  Status: {$schedule->status}\n";
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
    echo "\n=== NO SCHEDULES FOUND ===\n";
    echo "Checking ALL active schedules regardless of date:\n\n";
    
    $allSchedules = RondaSchedule::with(['participants.user'])
        ->where('rt_id', $rt->id)
        ->where('status', 'ACTIVE')
        ->orderByDesc('created_at')
        ->get();
    
    echo "Found {$allSchedules->count()} total active schedule(s):\n\n";
    
    foreach ($allSchedules as $schedule) {
        echo "Schedule ID: {$schedule->id}\n";
        echo "  Shift Name: {$schedule->shift_name}\n";
        echo "  Start Date: {$schedule->start_date}\n";
        echo "  End Date: {$schedule->end_date}\n";
        
        $startDate = $schedule->start_date instanceof Carbon 
            ? $schedule->start_date->format('Y-m-d') 
            : (isset($schedule->start_date) ? $schedule->start_date : '');
        $endDate = $schedule->end_date instanceof Carbon 
            ? $schedule->end_date->format('Y-m-d') 
            : (isset($schedule->end_date) ? $schedule->end_date : '');
        
        $isWithinRange = !empty($startDate) && !empty($endDate) && $startDate <= $today && $endDate >= $today;
        $inRange = $isWithinRange ? 'YES' : 'NO';
        echo "  Is within range? " . $inRange . "\n\n";
    }
}
