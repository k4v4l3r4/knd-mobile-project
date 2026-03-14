<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\RondaSchedule;
use Carbon\Carbon;

echo "=== Ronda Schedules with NULL or Expired Dates ===\n\n";

$today = Carbon::today()->format('Y-m-d');
echo "Today: $today\n\n";

$schedules = RondaSchedule::with(['participants'])
    ->where('rt_id', 1)
    ->where('status', 'ACTIVE')
    ->get();

echo "Total ACTIVE schedules for RT ID 1: " . $schedules->count() . "\n\n";

foreach ($schedules as $s) {
    $hasNullDates = (empty($s->start_date) || empty($s->end_date));
    $isWithinRange = (!$hasNullDates && $s->start_date <= $today && $s->end_date >= $today);
    
    $startDateDisplay = $s->start_date !== null ? $s->start_date : 'NULL';
    $endDateDisplay = $s->end_date !== null ? $s->end_date : 'NULL';
    
    echo "ID: {$s->id}\n";
    echo "  Shift: {$s->shift_name}\n";
    echo "  Start Date: $startDateDisplay\n";
    echo "  End Date: $endDateDisplay\n";
    echo "  Has NULL dates? " . ($hasNullDates ? 'YES' : 'NO') . "\n";
    echo "  Is within range? " . ($isWithinRange ? 'YES' : 'NO') . "\n";
    echo "  Participants: " . $s->participants->count() . "\n";
    echo "\n";
}
