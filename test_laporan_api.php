<?php
// Test script to verify Laporan Warga API endpoint
require __DIR__ . '/api/vendor/autoload.php';

$app = require_once __DIR__ . '/api/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\Report;
use Illuminate\Support\Facades\DB;

echo "=== Testing Laporan Warga API ===\n\n";

// Test 1: Check if reports table exists
echo "1. Checking if reports table exists...\n";
try {
    $count = DB::table('reports')->count();
    echo "   ✓ Reports table exists with $count records\n\n";
} catch (\Exception $e) {
    echo "   ✗ Error: " . $e->getMessage() . "\n\n";
}

// Test 2: Get sample report data
echo "2. Sample report data:\n";
try {
    $report = Report::with('user')->first();
    if ($report) {
        echo "   ID: " . $report->id . "\n";
        echo "   Title: " . ($report->title ?? 'NULL') . "\n";
        echo "   Status: " . $report->status . "\n";
        echo "   User: " . ($report->user ? $report->user->name : 'NULL') . "\n";
        echo "   Created At: " . $report->created_at . "\n\n";
    } else {
        echo "   No reports found in database\n\n";
    }
} catch (\Exception $e) {
    echo "   ✗ Error: " . $e->getMessage() . "\n\n";
}

// Test 3: Check API route
echo "3. Checking API routes:\n";
$routes = app('router')->getRoutes();
$reportRoutes = [];
foreach ($routes as $route) {
    if (strpos($route->uri, 'reports') !== false) {
        $reportRoutes[] = $route->uri . ' [' . implode(',', $route->methods) . ']';
    }
}

if (!empty($reportRoutes)) {
    foreach ($reportRoutes as $route) {
        echo "   ✓ $route\n";
    }
    echo "\n";
} else {
    echo "   ✗ No reports routes found\n\n";
}

// Test 4: Test API call simulation
echo "4. Simulating API GET /api/reports:\n";
try {
    $reports = Report::with('user')->orderBy('created_at', 'desc')->get();
    echo "   ✓ Retrieved " . $reports->count() . " reports\n";
    
    if ($reports->count() > 0) {
        $firstReport = $reports->first();
        $responseData = [
            'success' => true,
            'data' => [
                'data' => $reports->take(3)->values()->toArray()
            ]
        ];
        echo "   Sample response structure:\n";
        echo json_encode($responseData, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n\n";
    }
} catch (\Exception $e) {
    echo "   ✗ Error: " . $e->getMessage() . "\n\n";
}

echo "=== Test Complete ===\n";
