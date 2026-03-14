<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\RondaSchedule;
use App\Models\RondaParticipant;
use Carbon\Carbon;

echo "=== Creating Test Schedule for Today ===\n\n";

$today = Carbon::today();
$endDate = $today->copy()->addDays(6);

echo "Start Date: " . $today->format('Y-m-d') . "\n";
echo "End Date: " . $endDate->format('Y-m-d') . "\n\n";

// Create schedule
$schedule = RondaSchedule::create([
    'rt_id' => 1,
    'schedule_type' => 'WEEKLY',
    'shift_name' => 'Test Schedule - ' . $today->format('Y-m-d'),
    'start_date' => $today->format('Y-m-d'),
    'end_date' => $endDate->format('Y-m-d'),
    'start_time' => '22:00',
    'end_time' => '04:00',
    'status' => 'ACTIVE',
]);

echo "Created schedule ID: {$schedule->id}\n";

// Add a participant
$user = \App\Models\User::find(1);
if ($user) {
    RondaParticipant::create([
        'schedule_id' => $schedule->id,
        'user_id' => $user->id,
        'status' => 'PENDING'
    ]);
    echo "Added participant: {$user->name}\n";
}

echo "\n=== Testing Query ===\n\n";

// Now test the query
$todayStr = Carbon::today()->format('Y-m-d');

$schedules = RondaSchedule::with(['participants.user'])
    ->where('rt_id', 1)
    ->where('status', 'ACTIVE')
    ->where(function($query) use ($todayStr) {
        $query->whereNull('start_date')
              ->orWhereNull('end_date')
              ->orWhere(function($q) use ($todayStr) {
                  $q->whereDate('start_date', '<=', $todayStr)
                    ->whereDate('end_date', '>=', $todayStr);
              });
    })
    ->orderByDesc('created_at')
    ->get();

echo "Found {$schedules->count()} schedule(s):\n\n";

foreach ($schedules as $s) {
    echo "ID: {$s->id}\n";
    echo "  Shift: {$s->shift_name}\n";
    echo "  Start: {$s->start_date}\n";
    echo "  End: {$s->end_date}\n";
    echo "  Participants: {$s->participants->count}\n";
    if ($s->participants->count > 0) {
        foreach ($s->participants as $p) {
            echo "    - {$p->user->name}\n";
        }
    }
    echo "\n";
}
