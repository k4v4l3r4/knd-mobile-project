<?php
use App\Models\WilayahRt;
require __DIR__ . '/../vendor/autoload.php';
$app = require __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$rts = WilayahRt::all();
echo "Existing RTs:\n";
foreach ($rts as $rt) {
    echo "ID: " . $rt->id . ", Name: " . $rt->rt_name . "\n";
}
