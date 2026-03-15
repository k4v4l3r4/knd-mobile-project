<?php

/**
 * Test Script: Absensi Ronda Time Tolerance
 * 
 * Script ini untuk menguji validasi waktu dengan tolerance 5 menit
 * Jalankan dari terminal: php test_absensi_tolerance.php
 */

require __DIR__ . '/vendor/autoload.php';

use Carbon\Carbon;

// Bootstrap Laravel
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "==============================================\n";
echo "TEST ABSENSI RONDA - TIME TOLERANCE\n";
echo "==============================================\n\n";

// Set timezone ke Asia/Jakarta
date_default_timezone_set('Asia/Jakarta');

echo "Current Timezone: " . date_default_timezone_get() . "\n";
echo "Server Time: " . Carbon::now()->format('Y-m-d H:i:s') . "\n\n";

// Test Cases
$testCases = [
    // [start_time, end_time, test_time, expected_result, description]
    ['22:00', '04:00', '21:56', true, 'Terlalu cepat 4 menit (dalam tolerance)'],
    ['22:00', '04:00', '21:54', false, 'Terlalu cepat 6 menit (luar tolerance)'],
    ['22:00', '04:00', '22:00', true, 'Tepat waktu mulai'],
    ['22:00', '04:00', '23:30', true, 'Di tengah shift'],
    ['22:00', '04:00', '00:30', true, 'Cross-day (tengah malam)'],
    ['22:00', '04:00', '04:00', true, 'Tepat waktu berakhir'],
    ['22:00', '04:00', '04:03', true, 'Terlambat 3 menit (dalam tolerance)'],
    ['22:00', '04:00', '04:06', false, 'Terlambat 6 menit (luar tolerance)'],
    ['22:00', '04:00', '05:00', false, 'Sudah lewat 1 jam'],
    
    // Same day shift
    ['08:00', '16:00', '07:56', true, 'Terlalu cepat 4 menit (dalam tolerance)'],
    ['08:00', '16:00', '07:54', false, 'Terlalu cepat 6 menit (luar tolerance)'],
    ['08:00', '16:00', '08:00', true, 'Tepat waktu mulai'],
    ['08:00', '16:00', '12:00', true, 'Di tengah shift'],
    ['08:00', '16:00', '16:00', true, 'Tepat waktu berakhir'],
    ['08:00', '16:00', '16:03', true, 'Terlambat 3 menit (dalam tolerance)'],
    ['08:00', '16:00', '16:06', false, 'Terlambat 6 menit (luar tolerance)'],
];

$passed = 0;
$failed = 0;

foreach ($testCases as $index => $testCase) {
    [$startTime, $endTime, $testTime, $expected, $description] = $testCase;
    
    echo "Test #" . ($index + 1) . ": $description\n";
    echo "  Schedule: $startTime - $endTime\n";
    echo "  Test Time: $testTime\n";
    
    // Parse test time
    $now = Carbon::parse($testTime);
    $currentTime = $now->format('H:i');
    
    if ($index === 6) { // Debug test #7 only
        echo "  DEBUG: currentTime='$currentTime', startTime='$startTime', endTime='$endTime'\n";
        echo "  DEBUG: (currentTime >= startTime) = " . var_export($currentTime >= $startTime, true) . "\n";
        echo "  DEBUG: (currentTime <= endTime) = " . var_export($currentTime <= $endTime, true) . "\n";
        
        // Debug tolerance calculation
        $endDateTime = Carbon::parse($now->toDateString() . ' ' . $endTime)->addDay();
        $minutesAfterEnd = $endDateTime->diffInMinutes($now, false);
        echo "  DEBUG: endDateTime=" . $endDateTime->format('Y-m-d H:i:s') . "\n";
        echo "  DEBUG: minutesAfterEnd=$minutesAfterEnd\n";
        echo "  DEBUG: (minutesAfterEnd > 0 && minutesAfterEnd <= 5) = " . var_export($minutesAfterEnd > 0 && $minutesAfterEnd <= 5, true) . "\n";
    }
    
    // Apply same logic as RondaController
    $toleranceMinutes = 5;
    $isValidTime = false;
    $timeDifference = null;
    
    if ($startTime <= $endTime) {
        // Same day shift
        if ($currentTime >= $startTime && $currentTime <= $endTime) {
            $isValidTime = true;
        } else {
            if ($currentTime < $startTime) {
                $startDateTime = Carbon::parse($now->toDateString() . ' ' . $startTime);
                $timeDifference = $now->diffInMinutes($startDateTime, false);
            } else {
                $endDateTime = Carbon::parse($now->toDateString() . ' ' . $endTime);
                $timeDifference = $now->diffInMinutes($endDateTime, false);
            }
        }
    } else {
        // Cross day shift (e.g., 22:00 to 04:00)
        // Valid time is: currentTime >= startTime OR currentTime <= endTime
        
        // First check if it's clearly within the shift
        if ($currentTime >= $startTime || $currentTime <= $endTime) {
            $isValidTime = true;
        } else {
            // Outside shift time - check if within tolerance from either boundary
            
            // Option 1: Check if it's just after the end time (within tolerance)
            // For 04:03 with end at 04:00, this should be valid
            $endDateTime = Carbon::parse($now->toDateString() . ' ' . $endTime)->addDay();
            $minutesAfterEnd = $endDateTime->diffInMinutes($now, false); // positive if now is before endDateTime
            
            // Option 2: Check if it's just before the start time (within tolerance)
            $startDateTime = Carbon::parse($now->toDateString() . ' ' . $startTime);
            $minutesBeforeStart = $now->diffInMinutes($startDateTime, false); // negative if now is before startDateTime
            
            // If we're within X minutes AFTER the end time, allow it
            if ($minutesAfterEnd > 0 && $minutesAfterEnd <= $toleranceMinutes) {
                $isValidTime = true;
            }
            // If we're within X minutes BEFORE the start time, allow it
            elseif ($minutesBeforeStart < 0 && abs($minutesBeforeStart) <= $toleranceMinutes) {
                $isValidTime = true;
            }
            // Otherwise, calculate the difference for error message
            else {
                // Use whichever is closer
                if (abs($minutesAfterEnd) <= abs($minutesBeforeStart)) {
                    $timeDifference = $minutesAfterEnd;
                } else {
                    $timeDifference = $minutesBeforeStart;
                }
            }
        }
    }
    
    // Apply tolerance
    if (!$isValidTime && $timeDifference !== null) {
        if (abs($timeDifference) <= $toleranceMinutes) {
            $isValidTime = true;
        }
    }
    
    $result = $isValidTime ? 'PASS' : 'FAIL';
    $expectedStr = $expected ? 'PASS (should be valid)' : 'FAIL (should be invalid)';
    $status = ($isValidTime === $expected) ? '✅ PASS' : '❌ FAIL';
    
    if ($isValidTime === $expected) {
        $passed++;
    } else {
        $failed++;
    }
    
    echo "  Expected: $expectedStr\n";
    echo "  Result: $result\n";
    echo "  Status: $status\n";
    
    if ($timeDifference !== null) {
        $minutes = abs($timeDifference);
        $direction = $timeDifference < 0 ? 'before start' : 'after end';
        echo "  Time Diff: {$minutes} minutes ($direction)\n";
    }
    
    echo "\n";
}

echo "==============================================\n";
echo "SUMMARY\n";
echo "==============================================\n";
echo "Total Tests: " . count($testCases) . "\n";
echo "Passed: $passed ✅\n";
echo "Failed: $failed ❌\n";
echo "\n";

if ($failed === 0) {
    echo "🎉 All tests passed!\n";
} else {
    echo "⚠️  Some tests failed. Please review the logic.\n";
}

echo "\n";
echo "Server Time at End: " . Carbon::now()->format('Y-m-d H:i:s') . "\n";
