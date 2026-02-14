<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Carbon\Carbon;
use Faker\Factory as Faker;

use App\Models\User;
use App\Models\WilayahRw;
use App\Models\WilayahRt;
use App\Models\Wallet;
use App\Models\Transaction;
use App\Models\Letter;
use App\Models\Store;
use App\Models\Product;
use App\Models\RondaSchedule;
use App\Models\RondaParticipant;
use App\Models\Report;
use App\Models\Announcement;
use App\Models\Asset;
use App\Models\Role;

class DemoKyndSeeder extends Seeder
{
    public function run()
    {
        $faker = Faker::create('id_ID');
        
        $this->command->info('Starting Kynd Demo Seeding...');

        // --- 1. Setup & Community ---
        $this->command->info('1. Setting up RT 005 / RW 012...');

        // Create RW
        $rw = WilayahRw::firstOrCreate(
            ['code' => 'RW012'],
            [
                'name' => 'RW 012',
                // 'address' => 'Kecamatan Kynd, Jakarta Selatan', // Column likely missing in DB
                'subscription_status' => 'ACTIVE',
                // 'subscription_end_date' => Carbon::now()->addYear(), // Column likely missing in DB
            ]
        );

        // Create RT
        $rt = WilayahRt::firstOrCreate(
            ['rt_number' => '005', 'rw_id' => $rw->id],
            [
                'rt_name' => 'RT 005', // "RT 005 / RW 012" logic usually handled in display, but putting specific name here
                'address' => 'Jl. Kynd Sejahtera No. 1, Jakarta Selatan',
                'province' => 'DKI Jakarta',
                'city' => 'Jakarta Selatan',
                'district' => 'Kynd',
                'subdistrict' => 'Sejahtera',
                'postal_code' => '12345',
                'kas_balance' => 0,
            ]
        );

        // Ensure Wallets exist for this RT
        $walletCash = Wallet::firstOrCreate(
            ['rt_id' => $rt->id, 'type' => 'CASH'],
            ['name' => 'Kas Tunai RT', 'balance' => 0]
        );
        
        $walletBank = Wallet::firstOrCreate(
            ['rt_id' => $rt->id, 'type' => 'BANK'],
            [
                'name' => 'Bank RT (BCA)',
                'balance' => 0,
                'bank_name' => 'BCA',
                'account_number' => '8888999900',
                // 'account_holder' => 'RT 005 Kynd' // Column missing
            ]
        );

        // --- 2. Akun Utama ---
        $this->command->info('2. Creating Main Accounts...');

        // A. Admin (Pak RT)
        $admin = User::updateOrCreate(
            ['phone' => '081200000001'],
            [
                'name' => 'Pak RT (Admin)',
                'email' => 'pakrt@kynd.com',
                'password' => Hash::make('password'),
                'role' => 'ADMIN_RT', // System standard
                'rt_id' => $rt->id,
                'rw_id' => $rw->id,
                'signature_type' => 'auto_font',
                'address' => 'Jl. Kynd Sejahtera No. 1',
                'block' => 'A1',
                'status_in_family' => 'KEPALA_KELUARGA',
            ]
        );

        // B. Warga (User Test)
        $userTest = User::updateOrCreate(
            ['phone' => '081200000002'],
            [
                'name' => 'Andi Warga',
                'email' => 'andi@kynd.com',
                'password' => Hash::make('password'),
                'role' => 'WARGA_TETAP', // System standard
                'rt_id' => $rt->id,
                'rw_id' => $rw->id,
                'address' => 'Jl. Kynd Sejahtera No. 2',
                'block' => 'A2',
                'status_in_family' => 'KEPALA_KELUARGA',
                'occupation' => 'Karyawan Swasta',
            ]
        );

        // --- 3. Data Warga (Citizens) ---
        $this->command->info('3. Generating 30 Citizens...');
        
        $citizens = collect([$userTest]); // Start with user test

        for ($i = 0; $i < 30; $i++) {
            $phone = '0812' . $faker->unique()->numerify('########');
            $block = 'A' . $faker->numberBetween(1, 10);
            
            $citizen = User::create([
                'name' => $faker->name,
                'email' => $faker->unique()->safeEmail,
                'phone' => $phone,
                'password' => Hash::make('password'),
                'role' => 'WARGA_TETAP',
                'rt_id' => $rt->id,
                'rw_id' => $rw->id,
                'nik' => $faker->nik,
                'kk_number' => $faker->numerify('317##########'),
                'date_of_birth' => $faker->date('Y-m-d', '-20 years'),
                'occupation' => $faker->randomElement(['PNS', 'Karyawan Swasta', 'Wiraswasta', 'Pedagang', 'Ibu Rumah Tangga']),
                'address' => 'Jl. Kynd Sejahtera Blok ' . $block,
                'block' => $block,
                'status_in_family' => $faker->randomElement(['KEPALA_KELUARGA', 'ISTRI', 'ANAK']),
                'gender' => $faker->randomElement(['L', 'P']),
            ]);
            
            $citizens->push($citizen);
        }

        // --- 4. Keuangan (Transactions) ---
        $this->command->info('4. Generating 60 Transactions...');
        
        // Pemasukan: Iuran Lingkungan
        // Loop 6 months back
        for ($m = 0; $m < 6; $m++) {
            $monthDate = Carbon::now()->subMonths($m);
            $monthName = $monthDate->translatedFormat('F Y');
            
            // 5 people pay each month
            foreach ($citizens->take(5) as $c) {
                Transaction::create([
                    'rt_id' => $rt->id,
                    'user_id' => $c->id,
                    'account_id' => $walletBank->id, // Transfer to Bank
                    'type' => 'IN',
                    'amount' => 50000,
                    'category' => 'Iuran Warga',
                    'description' => "Iuran Lingkungan $monthName",
                    'date' => $monthDate->copy()->setDay(rand(1, 10)),
                    'status' => 'PAID',
                ]);
            }
        }

        // Pemasukan: Donasi 17 Agustus (Random)
        for ($i = 0; $i < 5; $i++) {
            Transaction::create([
                'rt_id' => $rt->id,
                'user_id' => $citizens->random()->id,
                'account_id' => $walletCash->id,
                'type' => 'IN',
                'amount' => $faker->randomElement([50000, 100000, 200000]),
                'category' => 'Sumbangan',
                'description' => 'Donasi 17 Agustus',
                'date' => Carbon::now()->subMonths(rand(1, 5))->setDay(17),
                'status' => 'PAID',
            ]);
        }

        // Pengeluaran
        // Jasa Angkut Sampah (Rutin tgl 5)
        for ($m = 0; $m < 6; $m++) {
            Transaction::create([
                'rt_id' => $rt->id,
                'user_id' => $admin->id,
                'account_id' => $walletCash->id,
                'type' => 'OUT',
                'amount' => 150000,
                'category' => 'Kebersihan',
                'description' => 'Jasa Angkut Sampah',
                'date' => Carbon::now()->subMonths($m)->setDay(5),
                'status' => 'PAID',
            ]);
        }

        // Bayar Listrik Pos Satpam
        for ($m = 0; $m < 6; $m++) {
            Transaction::create([
                'rt_id' => $rt->id,
                'user_id' => $admin->id,
                'account_id' => $walletBank->id,
                'type' => 'OUT',
                'amount' => rand(75000, 120000),
                'category' => 'Operasional',
                'description' => 'Bayar Listrik Pos Satpam',
                'date' => Carbon::now()->subMonths($m)->setDay(20),
                'status' => 'PAID',
            ]);
        }

        // Perbaikan Jalan (Sekali)
        Transaction::create([
            'rt_id' => $rt->id,
            'user_id' => $admin->id,
            'account_id' => $walletBank->id,
            'type' => 'OUT',
            'amount' => 2500000,
            'category' => 'Pembangunan',
            'description' => 'Perbaikan Jalan Blok A',
            'date' => Carbon::now()->subMonths(2)->setDay(15),
            'status' => 'PAID',
        ]);

        // Recalculate Balance
        $incomeCash = Transaction::where('account_id', $walletCash->id)->where('type', 'IN')->sum('amount');
        $expenseCash = Transaction::where('account_id', $walletCash->id)->where('type', 'OUT')->sum('amount');
        $walletCash->update(['balance' => $incomeCash - $expenseCash]);

        $incomeBank = Transaction::where('account_id', $walletBank->id)->where('type', 'IN')->sum('amount');
        $expenseBank = Transaction::where('account_id', $walletBank->id)->where('type', 'OUT')->sum('amount');
        $walletBank->update(['balance' => $incomeBank - $expenseBank]);

        // --- 5. Surat Menyurat (Letters) ---
        $this->command->info('5. Generating Letters...');

        // 2 Pending (Today)
        Letter::create([
            'rt_id' => $rt->id,
            'user_id' => $citizens[1]->id,
            'type' => 'PENGANTAR_KTP',
            'purpose' => 'Pembuatan KTP Baru',
            'status' => 'PENDING',
            'created_at' => Carbon::now(),
        ]);
        Letter::create([
            'rt_id' => $rt->id,
            'user_id' => $citizens[2]->id,
            'type' => 'DOMISILI',
            'purpose' => 'Syarat Melamar Kerja',
            'status' => 'PENDING',
            'created_at' => Carbon::now(),
        ]);

        // 3 Approved
        $types = ['PENGANTAR_KTP', 'DOMISILI', 'SKTM'];
        for ($i = 0; $i < 3; $i++) {
            Letter::create([
                'rt_id' => $rt->id,
                'user_id' => $citizens[$i + 3]->id,
                'type' => $types[$i],
                'purpose' => 'Keperluan Administrasi',
                'status' => 'APPROVED',
                'approver_id' => $admin->id,
                'verification_code' => Str::random(10),
                'approved_at' => Carbon::now()->subDays(rand(1, 10)),
                'letter_number' => 'NO/005/012/' . Carbon::now()->format('m/Y') . '/' . sprintf('%03d', $i+1),
                'created_at' => Carbon::now()->subDays(rand(11, 20)),
            ]);
        }

        // 1 Rejected
        Letter::create([
            'rt_id' => $rt->id,
            'user_id' => $citizens[6]->id,
            'type' => 'LAINNYA',
            'purpose' => 'Pinjaman Bank (Surat Keterangan Usaha)',
            'status' => 'REJECTED',
            'admin_note' => 'Dokumen kurang lengkap, mohon lampirkan foto tempat usaha',
            'created_at' => Carbon::now()->subDays(2),
        ]);

        // --- 6. Marketplace ---
        $this->command->info('6. Generating Marketplace...');
        
        $storesData = [
            [
                'name' => 'Warung Nasi Uduk Bu Tini',
                'products' => [
                    ['name' => 'Nasi Uduk Komplit', 'price' => 15000],
                    ['name' => 'Gorengan Bakwan', 'price' => 2000],
                ]
            ],
            [
                'name' => 'Service AC Berkah Teknik',
                'products' => [
                    ['name' => 'Cuci AC 1/2 PK', 'price' => 75000],
                ]
            ],
            [
                'name' => 'Laundry Kiloan Wangi',
                'products' => [
                    ['name' => 'Cuci Setrika 1 Kg', 'price' => 7000],
                ]
            ]
        ];

        foreach ($storesData as $idx => $sData) {
            $owner = $citizens[$idx + 10]; // Assign to random citizens
            $store = Store::create([
                'rt_id' => $rt->id,
                'user_id' => $owner->id,
                'name' => $sData['name'],
                'description' => 'Toko warga RT 005',
                'status' => 'VERIFIED',
                'verified_at' => Carbon::now()->subMonths(1),
            ]);

            foreach ($sData['products'] as $pData) {
                Product::create([
                    'rt_id' => $rt->id,
                    'user_id' => $owner->id,
                    'store_id' => $store->id,
                    'name' => $pData['name'],
                    'price' => $pData['price'],
                    'description' => 'Produk berkualitas',
                    'is_available' => true,
                    'whatsapp' => $owner->phone,
                    'category' => 'Barang', // Default fallback
                ]);
            }
        }

        // --- 7. Keamanan & Lingkungan ---
        $this->command->info('7. Generating Security & Environment...');

        // Jadwal Ronda
        $days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
        foreach ($days as $day) {
            $schedule = RondaSchedule::create([
                'rt_id' => $rt->id,
                'day' => $day,
                'shift_name' => 'Malam (22:00 - 04:00)',
                'location' => 'Pos Kamling Utama',
            ]);

            // Assign 3-4 random participants
            $participants = $citizens->random(rand(3, 4));
            foreach ($participants as $p) {
                RondaParticipant::create([
                    'schedule_id' => $schedule->id,
                    'user_id' => $p->id,
                    'status' => 'PENDING',
                ]);
            }
        }

        // Laporan Warga
        Report::create([
            'rt_id' => $rt->id,
            'user_id' => $citizens->random()->id,
            'title' => 'Lampu PJU Mati Blok C',
            'description' => 'Mohon segera diperbaiki karena gelap gulita.',
            'category' => 'FASILITAS',
            'status' => 'RESOLVED',
            'created_at' => Carbon::now()->subDays(5),
        ]);

        Report::create([
            'rt_id' => $rt->id,
            'user_id' => $citizens->random()->id,
            'title' => 'Ada orang asing nongkrong',
            'description' => 'Mencurigakan di dekat taman.',
            'category' => 'KEAMANAN',
            'status' => 'PENDING',
            'created_at' => Carbon::now()->subHours(2),
        ]);

        // Pengumuman
        Announcement::create([
            'rt_id' => $rt->id,
            'title' => 'Kerja Bakti Membersihkan Got',
            'content' => 'Dimohon kehadiran bapak-bapak sekalian pada hari Minggu ini pukul 07:00 WIB.',
            'status' => 'PUBLISHED',
            'created_at' => Carbon::now()->subDays(1),
        ]); // Assuming pinned is handled via logic or different field, defaulting to published

        Announcement::create([
            'rt_id' => $rt->id,
            'title' => 'Undangan Rapat Bulanan',
            'content' => 'Rapat rutin bulanan akan diadakan di rumah Pak RT.',
            'status' => 'PUBLISHED',
            'created_at' => Carbon::now()->subDays(10),
        ]);

        // --- 8. Inventaris (Assets) ---
        $this->command->info('8. Generating Assets...');

        Asset::create([
            'rt_id' => $rt->id,
            'name' => 'Tenda Terop',
            'total_quantity' => 2,
            'available_quantity' => 2,
            'condition' => 'BAIK',
            'description' => 'Ukuran 4x6 meter'
        ]);

        Asset::create([
            'rt_id' => $rt->id,
            'name' => 'Sound System',
            'total_quantity' => 1,
            'available_quantity' => 1,
            'condition' => 'BAIK',
            'description' => 'Speaker aktif + Mic wireless'
        ]);

        Asset::create([
            'rt_id' => $rt->id,
            'name' => 'Kursi Plastik',
            'total_quantity' => 50,
            'available_quantity' => 50,
            'condition' => 'BAIK',
            'description' => 'Warna Merah'
        ]);

        $this->command->info('Kynd Demo Seeding Completed Successfully!');
    }
}
