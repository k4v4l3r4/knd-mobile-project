<?php

require __DIR__.'/api/vendor/autoload.php';

$app = require_once __DIR__.'/api/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Config;

echo "=== COMPREHENSIVE BANSOS PHOTO URL TEST ===\n\n";

// 1. Check what's actually in the database
echo "1. DATABASE CHECK:\n";
try {
    $histories = DB::table('bansos_histories')
        ->whereNotNull('evidence_photo')
        ->select('id', 'program_name', 'evidence_photo', 'recipient_id')
        ->limit(5)
        ->get();
    
    if ($histories->count() > 0) {
        echo "   Found {$histories->count()} records with evidence photos:\n\n";
        
        foreach ($histories as $history) {
            echo "   ID: {$history->id}\n";
            echo "   Program: {$history->program_name}\n";
            echo "   Path in DB: {$history->evidence_photo}\n";
            
            // Try to get the model with appended URL
            $model = \App\Models\BansosHistory::find($history->id);
            if ($model) {
                echo "   evidence_photo_url attribute: " . ($model->evidence_photo_url ?? 'NULL') . "\n";
            }
            
            // Check if file exists
            $fullPath = storage_path('app/public/' . $history->evidence_photo);
            echo "   Full server path: $fullPath\n";
            if (file_exists($fullPath)) {
                echo "   ✓ File EXISTS on server\n";
            } else {
                echo "   ✗ File NOT FOUND on server\n";
            }
            
            // Generate expected URL
            $expectedUrl = config('app.url') . '/storage/' . $history->evidence_photo;
            echo "   Expected public URL: $expectedUrl\n";
            echo "\n";
        }
    } else {
        echo "   ℹ No evidence photos in database yet\n";
        echo "   → You need to upload a photo first by distributing aid\n";
    }
} catch (\Exception $e) {
    echo "   ✗ Database error: " . $e->getMessage() . "\n";
}

// 2. Check storage directory structure
echo "\n2. STORAGE DIRECTORY STRUCTURE:\n";
$storagePaths = [
    'storage/app/public' => __DIR__ . '/storage/app/public',
    'storage/app/public/bansos_evidence' => __DIR__ . '/storage/app/public/bansos_evidence',
    'public/storage' => __DIR__ . '/public/storage',
];

foreach ($storagePaths as $name => $path) {
    echo "   $name:\n";
    if (file_exists($path)) {
        echo "      ✓ Exists\n";
        if (is_dir($path)) {
            $files = scandir($path);
            $files = array_diff($files, ['.', '..']);
            if (count($files) > 0) {
                echo "      Contents: " . implode(', ', array_slice($files, 0, 10));
                if (count($files) > 10) echo " (and " . (count($files) - 10) . " more)";
                echo "\n";
            } else {
                echo "      (empty)\n";
            }
        }
    } else {
        echo "      ✗ Does not exist\n";
    }
}

// 3. Check storage symlink
echo "\n3. STORAGE SYMLINK CHECK:\n";
$symlinkPath = __DIR__ . '/public/storage';
if (file_exists($symlinkPath)) {
    if (is_link($symlinkPath)) {
        $target = readlink($symlinkPath);
        echo "   ✓ Symlink exists\n";
        echo "   Target: $target\n";
        
        $resolvedTarget = realpath($symlinkPath);
        echo "   Resolved: $resolvedTarget\n";
        
        if ($resolvedTarget && $resolvedTarget === realpath(__DIR__ . '/storage/app/public')) {
            echo "   ✓ Symlink points to correct location\n";
        } else {
            echo "   ✗ Symlink points to WRONG location!\n";
        }
    } else {
        echo "   ⚠ Path exists but is NOT a symlink (might be a regular directory)\n";
    }
} else {
    echo "   ✗ Storage link does NOT exist\n";
    echo "   → Run: php artisan storage:link\n";
}

// 4. Test URL accessibility
echo "\n4. URL ACCESSIBILITY TEST:\n";
if ($histories->count() > 0) {
    $testHistory = $histories->first();
    $testUrl = config('app.url') . '/storage/' . $testHistory->evidence_photo;
    
    echo "   Testing URL: $testUrl\n";
    
    // Try to fetch the URL using file_get_contents or curl
    try {
        // Use file_get_contents with stream context for timeout
        $context = stream_context_create([
            'http' => [
                'timeout' => 5,
                'ignore_errors' => true
            ],
            'ssl' => [
                'verify_peer' => false,
                'verify_peer_name' => false
            ]
        ]);
        
        $response = @file_get_contents($testUrl, false, $context);
        
        if ($response !== false) {
            // Check HTTP response code from headers
            $headers = $http_response_header ?? [];
            $httpCode = '200';
            if (isset($headers[0]) && preg_match('/HTTP\/\d\.\d (\d+)/', $headers[0], $matches)) {
                $httpCode = $matches[1];
            }
            
            if ($httpCode == '200') {
                echo "   ✓ URL is ACCESSIBLE (HTTP 200)\n";
                echo "   Response size: " . strlen($response) . " bytes\n";
            } else {
                echo "   ✗ URL returned HTTP $httpCode\n";
                echo "   → This explains the 404 error!\n";
            }
        } else {
            echo "   ✗ Failed to fetch URL\n";
            echo "   → Check network connectivity and server configuration\n";
        }
    } catch (\Exception $e) {
        echo "   ✗ Failed to test URL: " . $e->getMessage() . "\n";
    }
} else {
    echo "   ℹ No URLs to test (no data in database)\n";
}

// 5. Check APP_URL configuration
echo "\n5. APP_URL CONFIGURATION:\n";
$appUrl = config('app.url');
echo "   Current APP_URL: $appUrl\n";

// Check if it matches the actual domain
$expectedDomain = 'https://api.afnet.my.id';
if ($appUrl === $expectedDomain) {
    echo "   ✓ APP_URL matches production domain\n";
} else {
    echo "   ⚠ APP_URL does NOT match production domain\n";
    echo "   Expected: $expectedDomain\n";
    echo "   → Update .env: APP_URL=$expectedDomain\n";
}

echo "\n=== SUMMARY & RECOMMENDATIONS ===\n\n";

if ($histories->count() === 0) {
    echo "⚠ NO EVIDENCE PHOTOS FOUND IN DATABASE\n";
    echo "Action required:\n";
    echo "1. Go to web-admin: https://api.afnet.my.id/dashboard/bansos\n";
    echo "2. Click 'Salurkan' on a LAYAK recipient\n";
    echo "3. Upload a photo as evidence\n";
    echo "4. Run this script again to verify\n";
} else {
    $allFilesExist = true;
    foreach ($histories as $history) {
        $fullPath = storage_path('app/public/' . $history->evidence_photo);
        if (!file_exists($fullPath)) {
            $allFilesExist = false;
            break;
        }
    }
    
    if (!$allFilesExist) {
        echo "⚠ SOME FILES ARE MISSING FROM STORAGE\n";
        echo "Possible causes:\n";
        echo "1. Files were deleted from storage folder\n";
        echo "2. Upload process failed but DB was updated\n";
        echo "3. Files are stored in a different location\n";
    } else {
        echo "✓ All evidence files exist on server\n";
        echo "\n";
        echo "If 404 error persists, check:\n";
        echo "1. Web server permissions (chmod 755 for public folder)\n";
        echo "2. Web server configuration (can serve from public/storage)\n";
        echo "3. Firewall or CDN blocking access\n";
    }
}

echo "\n";
