<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\RondaSchedule;

echo "=== All Ronda Schedules ===\n\n";

$schedules = RondaSchedule::all();

echo "Total schedules: " . $schedules->count() . "\n\n";

foreach ($schedules as $s) {
    echo "ID: {$s->id}\n";
    echo "  RT ID: {$s->rt_id}\n";
    echo "  Shift: {$s->shift_name}\n";
    echo "  Type: {$s->schedule_type}\n";
    echo "  Start Date: {$s->start_date}\n";
    echo "  End Date: {$s->end_date}\n";
    echo "  Status: {$s->status}\n";
    echo "  Participants: " . $s->participants->count() . "\n";
    echo "\n";
}
