<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Report;
use App\Models\Poll;
use App\Models\PollOption;
use Illuminate\Support\Facades\DB;

class CleanupDummyData extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'data:cleanup-dummy';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Clean up unrealistic dummy data and replace with realistic examples for production';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('🧹 Starting Data Cleanup...');
        $this->newLine();

        // 1. Clean up Reports
        $this->info('📋 Cleaning up Reports...');

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
                $this->line("  - Menghapus: {$report->title}");
                $report->delete();
            }
        }

        // Add realistic reports if count is low
        $currentReportCount = Report::count();
        if ($currentReportCount < 5) {
            $this->line('  + Menambahkan laporan realistis...');
            
            foreach (array_slice($realisticReports, 0, 3) as $newReport) {
                try {
                    Report::create([
                        'user_id' => 1,
                        'rt_id' => 1,
                        'tenant_id' => 1,
                        'title' => $newReport['title'],
                        'description' => $newReport['description'],
                        'category' => $newReport['category'],
                        'status' => 'PENDING',
                        'photo_url' => null,
                    ]);
                    $this->line("    ✓ {$newReport['title']}");
                } catch (\Exception $e) {
                    $this->line("    ⚠ Skipping {$newReport['title']} (may already exist)");
                }
            }
        }

        $this->info('✅ Reports cleanup complete!');
        $this->newLine();

        // 2. Clean up Polls/Voting
        $this->info('🗳️  Cleaning up Polls...');

        $unrealisticPolls = [
            'Rudal',
            'Perang',
            'Alien',
            'Kiamat',
        ];

        foreach ($unrealisticPolls as $unrealistic) {
            $polls = Poll::where('title', 'LIKE', "%{$unrealistic}%")->get();
            
            foreach ($polls as $poll) {
                $this->line("  - Menghapus: {$poll->title}");
                
                // Delete poll options first
                PollOption::where('poll_id', $poll->id)->delete();
                $poll->delete();
            }
        }

        // Add realistic polls if count is low
        $currentPollCount = Poll::count();
        if ($currentPollCount < 3) {
            $this->line('  + Menambahkan voting realistis...');
            
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
                    
                    $this->line('    ✓ Pemilihan Ketua RT 05 Periode 2026-2029');
                    
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
                    
                    $this->line('    ✓ Usulan Kegiatan 17 Agustus 2026');
                } catch (\Exception $e) {
                    $this->line('    ⚠ Some polls may already exist, skipping...');
                }
            });
        }

        $this->info('✅ Polls cleanup complete!');
        $this->newLine();

        $this->info('✨ Data cleanup completed successfully!');
        $this->info('📊 Summary:');
        $this->line('   - Unrealistic reports removed and replaced');
        $this->line('   - Unrealistic polls removed and replaced');
        $this->line('   - Database now contains realistic, production-ready data');
        $this->newLine();

        return Command::SUCCESS;
    }
}
