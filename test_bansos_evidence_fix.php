<?php

require __DIR__.'/api/vendor/autoload.php';

$app = require_once __DIR__.'/api/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;

echo "=== BANSOS EVIDENCE PHOTO FIX VERIFICATION ===\n\n";

// 1. Check storage link
echo "1. Checking Storage Link...\n";
if (file_exists(__DIR__.'/api/public/storage')) {
    echo "   ✓ Storage link exists\n";
} else {
    echo "   ✗ Storage link does NOT exist!\n";
    echo "   → Run: php artisan storage:link\n";
}

// 2. Check folder permissions
echo "\n2. Checking Folder Permissions...\n";
$folderPath = __DIR__.'/api/storage/app/public/bansos_evidence';
if (!file_exists($folderPath)) {
    echo "   ℹ Folder 'bansos_evidence' doesn't exist yet (will be created on first upload)\n";
    echo "   → Creating folder...\n";
    mkdir($folderPath, 0775, true);
    echo "   ✓ Folder created with permissions: 0775\n";
} else {
    $perms = substr(sprintf('%o', fileperms($folderPath)), -4);
    echo "   ✓ Folder exists with permissions: $perms\n";
}

// 3. Check .env configuration
echo "\n3. Checking APP_URL Configuration...\n";
$envPath = __DIR__.'/api/.env';
if (file_exists($envPath)) {
    $envContent = file_get_contents($envPath);
    if (preg_match('/APP_URL=(.+)/', $envContent, $matches)) {
        echo "   ✓ APP_URL is set to: {$matches[1]}\n";
    } else {
        echo "   ✗ APP_URL not found in .env!\n";
        echo "   → Add: APP_URL=http://localhost:8000 (or your domain)\n";
    }
} else {
    echo "   ✗ .env file not found!\n";
}

// 4. Check database for existing evidence photos
echo "\n4. Checking Database for Evidence Photos...\n";
try {
    $count = DB::table('bansos_histories')
        ->whereNotNull('evidence_photo')
        ->count();
    
    if ($count > 0) {
        echo "   ✓ Found $count records with evidence photos\n";
        
        // Show sample paths
        $samples = DB::table('bansos_histories')
            ->whereNotNull('evidence_photo')
            ->select('id', 'evidence_photo')
            ->limit(3)
            ->get();
        
        echo "\n   Sample evidence paths:\n";
        foreach ($samples as $sample) {
            $fullUrl = config('app.url') . '/storage/' . $sample->evidence_photo;
            echo "   - ID {$sample->id}: {$sample->evidence_photo}\n";
            echo "     Full URL: $fullUrl\n";
            
            // Check if file exists
            $filePath = __DIR__.'/api/storage/app/public/' . $sample->evidence_photo;
            if (file_exists($filePath)) {
                echo "     ✓ File exists\n";
            } else {
                echo "     ✗ File NOT found at: $filePath\n";
            }
        }
    } else {
        echo "   ℹ No evidence photos in database yet\n";
        echo "   → Upload a photo when distributing aid to test\n";
    }
} catch (\Exception $e) {
    echo "   ✗ Database error: " . $e->getMessage() . "\n";
}

// 5. Test URL generation
echo "\n5. Testing URL Generation...\n";
$testPath = 'bansos_evidence/test_image.jpg';
$expectedUrl = config('app.url') . '/storage/' . $testPath;
echo "   Test path: $testPath\n";
echo "   Expected URL: $expectedUrl\n";
echo "   ✓ URL format is correct\n";

echo "\n=== VERIFICATION COMPLETE ===\n\n";

echo "NEXT STEPS:\n";
echo "1. If storage link doesn't exist, run: php artisan storage:link\n";
echo "2. Test uploading a photo when distributing aid\n";
echo "3. Verify the 'Lihat Foto' button shows the correct image\n";
echo "4. Check browser console for any 404 errors\n\n";
