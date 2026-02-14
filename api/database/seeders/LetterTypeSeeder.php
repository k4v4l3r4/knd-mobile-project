<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\LetterType;

class LetterTypeSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $types = [
            [
                'name' => 'Pengantar KTP',
                'code' => 'PENGANTAR_KTP',
                'description' => 'Surat pengantar untuk pembuatan atau perpanjangan KTP',
            ],
            [
                'name' => 'Pengantar KK',
                'code' => 'PENGANTAR_KK',
                'description' => 'Surat pengantar untuk pembuatan atau perubahan Kartu Keluarga',
            ],
            [
                'name' => 'Surat Keterangan Tidak Mampu (SKTM)',
                'code' => 'SKTM',
                'description' => 'Surat keterangan kondisi ekonomi kurang mampu',
            ],
            [
                'name' => 'Surat Keterangan Domisili',
                'code' => 'DOMISILI',
                'description' => 'Surat keterangan tempat tinggal saat ini',
            ],
            [
                'name' => 'Izin Keramaian',
                'code' => 'IZIN_KERAMAIAN',
                'description' => 'Surat pengantar izin menyelenggarakan kegiatan keramaian',
            ],
            [
                'name' => 'Lainnya',
                'code' => 'LAINNYA',
                'description' => 'Jenis surat keperluan umum lainnya',
            ],
        ];

        foreach ($types as $type) {
            LetterType::updateOrCreate(
                ['code' => $type['code']],
                $type
            );
        }
    }
}
