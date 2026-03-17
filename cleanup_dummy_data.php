<?php

/**
 * Script to clean up unrealistic dummy data from production database
 * Run this script once to replace unrealistic reports and voting data with realistic examples
 * 
 * Usage: cd /path/to/api && php ../cleanup_dummy_data.php
 * OR copy this file to: /www/wwwroot/knd-mobile-project/api/cleanup_dummy_data.php
 */

// Detect the Laravel base path
$laravelBasePath = __DIR__ . '/api';
if (!file_exists($laravelBasePath)) {
    // If running from within api directory
    $laravelBasePath = dirname(__DIR__);
}

require $laravelBasePath.'/vendor/autoload.php';

$app = require_once $laravelBasePath.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\Report;
use App\Models\Poll;
use App\Models\PollOption;
use Illuminate\Support\Facades\DB;

echo "🧹 Starting Data Cleanup...\n\n";

// 1. Clean up Reports
echo "📋 Cleaning up Reports...\n";

$unrealisticReports = [
    'Rudal Balistik',
    'Penyerangan Pos Ronda',
    'Alien Mendarat',
    'Kiamat Zombie',
    'Perang Dunia',
    'Serangan Teroris',
];

$realisticReports = [
    [
        'title' => 'Lampu Jalan Mati di Gang 3',
        'description' => 'Lampu jalan di Gang 3 sudah 3 hari tidak menyala. Mohon perbaikan secepatnya karena area menjadi gelap dan rawan.',
        'category' => 'INFRASTRUCTURE',
    ],
    [
        'title' => 'Jadwal Kerja Bakti Minggu Ini',
        'description' => 'Diberitahukan kepada seluruh warga RT 05 untuk mengikuti kerja bakti membersihkan selokan dan lingkungan sekitar pada hari Sabtu pagi.',
        'category' => 'CLEANLINESS',
    ],
    [
        'title' => 'Sampah Belum Diangkut 2 Hari',
        'description' => 'Tong sampah di depan Gang 2 sudah 2 hari tidak diangkut oleh petugas kebersihan. Mohon tindak lanjutnya.',
        'category' => 'CLEANLINESS',
    ],
    [
        'title' => 'Pagar Taman Rusak',
        'description' => 'Pagar taman bermain anak-anak rusak dan tajam, berpotensi membahayakan. Mohon segera diperbaiki.',
        'category' => 'INFRASTRUCTURE',
    ],
    [
        'title' => 'Keamanan Lingkungan - Orang Mencurigakan',
        'description' => 'Ada orang yang tidak dikenal berkeliaran di lingkungan RT kami pada malam hari. Mohon ditingkatkan patroli ronda.',
        'category' => 'SECURITY',
    ],
];

foreach ($unrealisticReports as $unrealistic) {
    $reports = Report::where('title', 'LIKE', "%{$unrealistic}%")->get();
    
    foreach ($reports as $report) {
        echo "  - Menghapus: {$report->title}\n";
        $report->delete();
    }
}

// Add realistic reports if count is low
$currentReportCount = Report::count();
if ($currentReportCount < 5) {
    echo "  + Menambahkan laporan realistis...\n";
    
    foreach (array_slice($realisticReports, 0, 3) as $newReport) {
        try {
            Report::create([
                'user_id' => 1, // Use first user
                'rt_id' => 1,
                'tenant_id' => 1,
                'title' => $newReport['title'],
                'description' => $newReport['description'],
                'category' => $newReport['category'],
                'status' => 'PENDING',
                'photo_url' => null,
            ]);
            echo "    ✓ {$newReport['title']}\n";
        } catch (\Exception $e) {
            echo "    ⚠ Skipping {$newReport['title']} (may already exist)\n";
        }
    }
}

echo "✅ Reports cleanup complete!\n\n";

// 2. Clean up Polls/Voting
echo "🗳️  Cleaning up Polls...\n";

$unrealisticPolls = [
    'Rudal',
    'Perang',
    'Alien',
    'Kiamat',
];

$realisticPolls = [
    [
        'title' => 'Pemilihan Ketua RT 05 Periode 2026-2029',
        'description' => 'Silakan pilih calon Ketua RT yang menurut Anda paling cocok untuk memimpin RT 05 selama 3 tahun ke depan.',
        'type' => 'ELECTION',
    ],
    [
        'title' => 'Usulan Kegiatan 17 Agustus 2026',
        'description' => 'Pilih kegiatan yang paling Anda inginkan untuk memeriahkan HUT RI di lingkungan kita.',
        'type' => 'SURVEY',
    ],
    [
        'title' => 'Survey Pembayaran Iuran Sampah',
        'description' => 'Apakah Anda setuju jika iuran sampah dinaikkan menjadi Rp 15.000/bulan?',
        'type' => 'SURVEY',
    ],
    [
        'title' => 'Pemilihan Tempat Wisata Kerja Bakti',
        'description' => 'Tentukan lokasi wisata untuk acara kerja bakti bersama keluarga besar RT 05.',
        'type' => 'VOTE',
    ],
];

foreach ($unrealisticPolls as $unrealistic) {
    $polls = Poll::where('title', 'LIKE', "%{$unrealistic}%")->get();
    
    foreach ($polls as $poll) {
        echo "  - Menghapus: {$poll->title}\n";
        
        // Delete poll options first
        PollOption::where('poll_id', $poll->id)->delete();
        $poll->delete();
    }
}

// Add realistic polls if count is low
$currentPollCount = Poll::count();
if ($currentPollCount < 3) {
    echo "  + Menambahkan voting realistis...\n";
    
    DB::transaction(function () {
        try {
            // Create election poll
            $poll = Poll::create([
                'tenant_id' => 1,
                'rt_id' => 1,
                'title' => 'Pemilihan Ketua RT 05 Periode 2026-2029',
                'description' => 'Silakan pilih calon Ketua RT yang menurut Anda paling cocok untuk memimpin RT 05 selama 3 tahun ke depan.',
                'type' => 'ELECTION',
                'start_date' => now(),
                'end_date' => now()->addDays(7),
                'status' => 'OPEN',
            ]);
            
            PollOption::create([
                'poll_id' => $poll->id,
                'option_text' => 'Budi Santoso - Mantan Lurah, Pengalaman 10 Tahun',
                'vote_count' => 0,
            ]);
            
            PollOption::create([
                'poll_id' => $poll->id,
                'option_text' => 'Ahmad Hidayat - Pengusaha Sukses, Program Ekonomi Warga',
                'vote_count' => 0,
            ]);
            
            PollOption::create([
                'poll_id' => $poll->id,
                'option_text' => 'Siti Nurhaliza - Aktivis Sosial, Fokus Lingkungan Sehat',
                'vote_count' => 0,
            ]);
            
            echo "    ✓ Pemilihan Ketua RT 05 Periode 2026-2029\n";
            
            // Create survey poll
            $poll2 = Poll::create([
                'tenant_id' => 1,
                'rt_id' => 1,
                'title' => 'Usulan Kegiatan 17 Agustus 2026',
                'description' => 'Pilih kegiatan yang paling Anda inginkan untuk memeriahkan HUT RI di lingkungan kita.',
                'type' => 'SURVEY',
                'start_date' => now(),
                'end_date' => now()->addDays(14),
                'status' => 'OPEN',
            ]);
            
            PollOption::create([
                'poll_id' => $poll2->id,
                'option_text' => 'Lomba Makan Kerupuk',
                'vote_count' => 0,
            ]);
            
            PollOption::create([
                'poll_id' => $poll2->id,
                'option_text' => 'Panjat Pinang',
                'vote_count' => 0,
            ]);
            
            PollOption::create([
                'poll_id' => $poll2->id,
                'option_text' => 'Lomba Balap Karung',
                'vote_count' => 0,
            ]);
            
            PollOption::create([
                'poll_id' => $poll2->id,
                'option_text' => 'Pentas Seni Malam Puncak',
                'vote_count' => 0,
            ]);
            
            echo "    ✓ Usulan Kegiatan 17 Agustus 2026\n";
        } catch (\Exception $e) {
            echo "    ⚠ Some polls may already exist, skipping...\n";
        }
    });
}

echo "✅ Polls cleanup complete!\n\n";

echo "✨ Data cleanup completed successfully!\n";
echo "📊 Summary:\n";
echo "   - Unrealistic reports removed and replaced\n";
echo "   - Unrealistic polls removed and replaced\n";
echo "   - Database now contains realistic, production-ready data\n\n";
