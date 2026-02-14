<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Announcement;

class AnnouncementSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        Announcement::create([
            'title' => 'Kerja Bakti Minggu Ini',
            'content' => 'Diberitahukan kepada seluruh warga RT 05 untuk mengikuti kerja bakti membersihkan lingkungan pada hari Minggu, 28 Januari 2026 pukul 07.00 WIB. Diharapkan membawa peralatan kebersihan masing-masing.',
            'image_url' => null, // Or a placeholder URL if you have one
            'is_active' => true,
        ]);

        Announcement::create([
            'title' => 'Jadwal Posyandu Balita',
            'content' => 'Posyandu balita akan dilaksanakan pada hari Rabu, 31 Januari 2026 di Balai Warga. Harap membawa buku KIA.',
            'image_url' => null,
            'is_active' => true,
        ]);

        Announcement::create([
            'title' => 'Waspada Demam Berdarah',
            'content' => 'Mengingat musim hujan telah tiba, dimohon warga untuk menjaga kebersihan lingkungan dan melakukan 3M Plus untuk mencegah perkembangbiakan nyamuk Aedes Aegypti.',
            'image_url' => null,
            'is_active' => true,
        ]);

        Announcement::create([
            'title' => 'Pemilihan Ketua RT Baru',
            'content' => 'Panitia pemilihan Ketua RT membuka pendaftaran calon Ketua RT periode 2026-2029. Pendaftaran dibuka mulai 1 Februari 2026.',
            'image_url' => null,
            'is_active' => true,
        ]);
        
        Announcement::create([
            'title' => 'Laporan Kas RT Bulan Desember',
            'content' => 'Laporan keuangan RT bulan Desember 2025 telah terbit. Silakan cek menu Laporan Keuangan untuk detail pemasukan dan pengeluaran.',
            'image_url' => null,
            'is_active' => true,
        ]);
    }
}
