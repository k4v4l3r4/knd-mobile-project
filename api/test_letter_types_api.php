<?php

/**
 * Test Letter Types API Endpoint
 * 
 * Run this to verify letter types are available in database
 */

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

echo "=== LETTER TYPES VERIFICATION TEST ===\n\n";

// Check if letter_types table exists
try {
    $exists = DB::table('letter_types')->exists();
    echo "✅ letter_types table EXISTS\n\n";
} catch (\Exception $e) {
    echo "❌ letter_types table DOES NOT EXIST\n";
    echo "Error: " . $e->getMessage() . "\n\n";
    echo "SOLUTION: Run migration first!\n";
    echo "Command: php artisan migrate\n\n";
    exit(1);
}

// Count records
$count = DB::table('letter_types')->count();
echo "📊 Total letter_types records: $count\n\n";

// Get all letter types
$types = DB::table('letter_types')->get();

if ($count === 0) {
    echo "⚠️  WARNING: letter_types table is EMPTY!\n\n";
    echo "SOLUTION: Run seeder!\n";
    echo "Command: php artisan db:seed --class=LetterTypeSeeder\n\n";
} else {
    echo "✅ Letter types found:\n";
    foreach ($types as $type) {
        echo sprintf(
            "   - Code: %-20s | Name: %s\n",
            $type->code,
            $type->name
        );
    }
    echo "\n";
}

// Test validation logic
echo "🧪 Testing validation logic...\n\n";

// Simulate what backend validates
$testCodes = ['PENGANTAR_KTP', 'PENGANTAR_KK', 'INVALID_CODE', ''];

foreach ($testCodes as $testCode) {
    $exists = DB::table('letter_types')
        ->where('code', $testCode)
        ->exists();
    
    $status = $exists ? '✅ VALID' : '❌ INVALID';
    echo "   Code: '$testCode' → $status\n";
}

echo "\n=== RECOMMENDATION ===\n\n";

if ($count === 0) {
    echo "1. Run seeder to populate letter types:\n";
    echo "   php artisan db:seed --class=LetterTypeSeeder\n\n";
    echo "2. Verify data was inserted:\n";
    echo "   php test_letter_types_api.php\n\n";
} else {
    echo "✅ Database has letter types data.\n\n";
    echo "If frontend still gets 'invalid type' error, check:\n";
    echo "   1. Frontend is sending correct code (e.g., 'PENGANTAR_KTP')\n";
    echo "   2. User's tenant_id and rt_id match the letter_type scope\n";
    echo "   3. API endpoint is hitting correct database\n\n";
}

echo "=== TEST COMPLETE ===\n";
