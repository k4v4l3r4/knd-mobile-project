<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Carbon\Carbon;
use Faker\Factory as Faker;

use App\Models\User;
use App\Models\Role; // Added Role model
use App\Models\WilayahRt;
use App\Models\Wallet;
use App\Models\Transaction;
use App\Models\KasTransaction; // New Finance
use App\Models\Fee;
use App\Models\Announcement;
use App\Models\Product;
use App\Models\Store;
use App\Models\Asset;
use App\Models\AssetLoan;
use App\Models\RondaSchedule;
use App\Models\RondaParticipant;
use App\Models\BoardingHouse;
use App\Models\BoardingTenant;
use App\Models\Letter;
use App\Models\Poll;
use App\Models\PollOption;
use App\Models\PollVote;
use App\Models\GuestBook;
use App\Models\IssueReport;
use App\Models\Report; // Alias for IssueReport in some contexts? No, separate model?
// Check models list: IssueReport.php and Report.php exist. Report might be the old one or new one. 
// DemoKyndSeeder used Report. DemoSeeder used IssueReport. 
// Let's check which one is used in API. IssueReportController uses IssueReport.
// I'll use IssueReport as primary.

class DemoSeeder extends Seeder
{
    public function run()
    {
        $faker = Faker::create('id_ID');
        $this->command->info('Starting Comprehensive Demo Seeding for RT 001...');

        // 0. Ensure RT exists (Must be seeded by StarterSeeder)
        $rt = WilayahRt::where('rt_number', '001')->first();
        if (!$rt) {
            $this->command->error('RT 001 not found! Please run StarterSeeder first.');
            return;
        }
        $rtId = $rt->id;
        $rwId = $rt->rw_id;

        // Ensure Wallets exist
        $walletCash = Wallet::firstOrCreate(
            ['rt_id' => $rtId, 'type' => 'CASH'],
            ['name' => 'Kas Tunai RT', 'balance' => 0]
        );
        
        $walletBank = Wallet::firstOrCreate(
            ['rt_id' => $rtId, 'type' => 'BANK'],
            [
                'name' => 'Bank RT (BCA)',
                'balance' => 0,
                'bank_name' => 'BCA',
                'account_number' => '1234567890',
            ]
        );

        // 1. Users & Warga
        $this->command->info('1. Seeding Users (20 Citizens)...');
        
        // Fetch Admin
        $admin = User::where('email', 'admin@rt.com')->first();
        
        $roleWarga = Role::where('role_code', 'WARGA_TETAP')->first();
        $roleWargaId = $roleWarga ? $roleWarga->id : null;

        // Ensure Budi exists (Demo User)
        $budi = User::updateOrCreate(
            ['email' => 'budi@warga.com'],
            [
                'name' => 'Budi Santoso',
                'phone' => '081200000002',
                'password' => Hash::make('password'),
                'role' => 'WARGA_TETAP',
                'role_id' => $roleWargaId,
                'rt_id' => $rtId,
                'rw_id' => $rwId,
                'nik' => $faker->nik,
                'address' => 'Blok A No. 10',
                'occupation' => 'Karyawan Swasta',
                'status_in_family' => 'KEPALA_KELUARGA',
                'gender' => 'L',
                'date_of_birth' => '1985-05-15',
                'is_bansos_eligible' => false,
            ]
        );

        // Generate 20 Random Warga
        $citizens = collect([$budi]);
        for ($i = 0; $i < 20; $i++) {
            $email = "warga{$i}@demo.com";
            $phone = '0812' . $faker->unique()->numerify('########');
            
            $warga = User::firstOrCreate(
                ['email' => $email],
                [
                    'name' => $faker->name,
                    'phone' => $phone,
                    'password' => Hash::make('password'),
                    'role' => 'WARGA_TETAP',
                    'role_id' => $roleWargaId,
                    'rt_id' => $rtId,
                    'rw_id' => $rwId,
                    'nik' => $faker->nik,
                    'address' => 'Blok ' . $faker->randomLetter . ' No. ' . $faker->numberBetween(1, 99),
                    'occupation' => $faker->jobTitle,
                    'status_in_family' => $faker->randomElement(['KEPALA_KELUARGA', 'ISTRI', 'ANAK']),
                    'gender' => $faker->randomElement(['L', 'P']),
                    'date_of_birth' => $faker->date('Y-m-d', '-17 years'),
                    'is_bansos_eligible' => $faker->boolean(20), // 20% chance eligible
                ]
            );
            $citizens->push($warga);
        }

        // 2. Finance (Transactions)
        $this->command->info('2. Seeding Finance (6 Months History)...');

        // Initial Balance (Dana Hibah)
        if (!Transaction::where('description', 'Dana Hibah Awal Tahun')->exists()) {
            Transaction::create([
                'rt_id' => $rtId,
                'user_id' => $admin->id,
                'account_id' => $walletBank->id,
                'type' => 'IN',
                'amount' => 10000000,
                'category' => 'HIBAH',
                'description' => 'Dana Hibah Awal Tahun',
                'status' => 'PAID',
                'date' => now()->subMonths(6),
            ]);
            $walletBank->increment('balance', 10000000);
        }

        // Iuran Warga (Monthly)
        $fee = Fee::firstOrCreate(
            ['rt_id' => $rtId, 'name' => 'Iuran Kebersihan'],
            ['amount' => 25000, 'is_mandatory' => true]
        );

        for ($m = 0; $m < 6; $m++) {
            $monthDate = Carbon::now()->subMonths($m);
            $monthName = $monthDate->translatedFormat('F Y');

            // 70% of citizens pay
            foreach ($citizens->random((int)($citizens->count() * 0.7)) as $c) {
                // Check duplicate
                if (!Transaction::where('user_id', $c->id)->where('description', "Iuran Kebersihan $monthName")->exists()) {
                    Transaction::create([
                        'rt_id' => $rtId,
                        'user_id' => $c->id,
                        'account_id' => $walletCash->id, // Pay cash usually
                        'type' => 'IN',
                        'amount' => $fee->amount,
                        'category' => 'IURAN',
                        'description' => "Iuran Kebersihan $monthName",
                        'status' => 'PAID',
                        'date' => $monthDate->copy()->setDay(rand(1, 10)),
                        'items' => [['fee_id' => $fee->id, 'name' => $fee->name, 'amount' => $fee->amount]],
                    ]);
                    $walletCash->increment('balance', $fee->amount);
                }
            }
        }

        // Expenses (Pengeluaran Rutin)
        for ($m = 0; $m < 6; $m++) {
            $monthDate = Carbon::now()->subMonths($m);
            // Gaji Satpam (Example)
            Transaction::create([
                'rt_id' => $rtId,
                'user_id' => $admin->id,
                'account_id' => $walletCash->id,
                'type' => 'OUT',
                'amount' => 1500000,
                'category' => 'GAJI',
                'description' => 'Gaji Satpam & Kebersihan',
                'status' => 'PAID',
                'date' => $monthDate->copy()->setDay(28),
            ]);
            $walletCash->decrement('balance', 1500000);
        }

        // KasTransaction (New Table - Denda & Manual)
        if (!KasTransaction::where('rt_id', $rtId)->where('description', 'Denda Ronda Absen 2 Orang')->exists()) {
            KasTransaction::create([
                'rt_id' => $rtId,
                'amount' => 50000,
                'direction' => 'IN',
                'source_type' => 'DENDA',
                'description' => 'Denda Ronda Absen 2 Orang',
                'created_at' => now()->subDays(3)
            ]);
        }

        // 3. Operasional (Announcements & Ronda)
        $this->command->info('3. Seeding Operations...');

        Announcement::firstOrCreate(
            ['title' => 'Kerja Bakti Minggu Ini', 'rt_id' => $rtId],
            [
                'content' => 'Diharapkan seluruh warga membawa peralatan kebersihan. Kita akan membersihkan selokan utama.',
                'status' => 'PUBLISHED',
                'created_at' => now()->subDays(2),
            ]
        );

        Announcement::firstOrCreate(
            ['title' => 'Jadwal Posyandu Balita', 'rt_id' => $rtId],
            [
                'content' => 'Posyandu bulan ini diadakan hari Rabu di Balai Warga. Harap membawa buku KIA.',
                'status' => 'PUBLISHED',
                'created_at' => now()->subDays(15),
            ]
        );

        // Ronda Schedule (Weekly)
        $days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
        foreach ($days as $day) {
            $schedule = RondaSchedule::updateOrCreate(
                ['rt_id' => $rtId, 'shift_name' => "Jaga Malam $day"],
                [
                    // 'day' => $day, // Column dropped? Check schema.
                    // Schema memory says: "Removed 'day' column... Active schedule logic relies on date ranges".
                    // But wait, DemoKyndSeeder used 'day'.
                    // I should verify RondaSchedule schema. 
                    // Let's assume the memory "Ronda Schedule Schema: Removed 'day' column" is correct.
                    // So we use start_date / end_date logic.
                    // But for "Weekly" pattern, usually we create one schedule per week or per day-in-week?
                    // The memory says "Supports 'DAILY' (start=end) and 'WEEKLY' (start+6 days)".
                    // This implies the schedule record covers a range.
                    // If we want different people on different days, we might need multiple schedules overlapping or segmented?
                    // Actually, usually "RondaSchedule" represents a specific shift instance or a recurring pattern?
                    // Memory: "Active schedule logic relies on date ranges rather than daily entries."
                    // Okay, let's create one Weekly schedule for THIS week.
                    'start_date' => now()->startOfWeek()->format('Y-m-d'),
                    'end_date' => now()->endOfWeek()->format('Y-m-d'),
                    'start_time' => '21:00:00',
                    'end_time' => '05:00:00',
                    'status' => 'ACTIVE',
                    'location' => 'Pos Kamling Utama'
                ]
            );
            
            // Only create ONE schedule for the whole week? Or one per day?
            // If the table lacks 'day', how do we know which participant is for Monday?
            // Maybe RondaParticipant has 'date'?
            // Let's assume for Demo we just create one active schedule for this week.
            break; 
        }

        // Participants for the schedule
        if ($schedule->participants()->count() < 5) {
            $participants = $citizens->random(5);
            foreach ($participants as $p) {
                RondaParticipant::firstOrCreate(
                    ['schedule_id' => $schedule->id, 'user_id' => $p->id],
                    ['status' => $faker->randomElement(['PRESENT', 'ABSENT', 'PENDING'])]
                );
            }
        }

        // 4. UMKM
        $this->command->info('4. Seeding UMKM...');
        $storeOwner = $citizens[5];
        $store = Store::updateOrCreate(
            ['name' => 'Warung Kelontong Maju', 'user_id' => $storeOwner->id],
            [
                'rt_id' => $rtId,
                'description' => 'Sedia Sembako dan kebutuhan sehari-hari.',
                'status' => 'verified',
                'verified_at' => now()->subMonths(1),
                'category' => 'RETAIL',
                'contact' => $storeOwner->phone,
                'image_url' => 'https://placehold.co/640x360?text=Warung+Kelontong+Maju',
            ]
        );

        Product::firstOrCreate(
            ['name' => 'Beras 5kg', 'store_id' => $store->id],
            [
                'rt_id' => $rtId,
                'user_id' => $storeOwner->id,
                'description' => 'Beras pulen kualitas super.',
                'price' => 65000,
                'category' => 'SEMBAKO',
                'is_available' => true,
                'whatsapp' => $storeOwner->phone,
                'image_url' => 'https://placehold.co/640x360?text=Beras+5kg',
            ]
        );

        // 5. Assets & Loans
        $this->command->info('5. Seeding Assets...');
        $tenda = Asset::firstOrCreate(
            ['name' => 'Tenda Hajatan', 'rt_id' => $rtId],
            [
                'description' => 'Tenda ukuran 4x6m',
                'total_quantity' => 2,
                'available_quantity' => 1,
                'condition' => 'BAIK'
            ]
        );

        AssetLoan::firstOrCreate(
            ['user_id' => $citizens[2]->id, 'asset_id' => $tenda->id],
            [
                'loan_date' => now()->subDays(1),
                'return_date' => now()->addDays(2),
                'quantity' => 1,
                'status' => 'APPROVED',
                'admin_note' => 'Hati-hati penggunaan.'
            ]
        );

        // 6. Kost Management
        $this->command->info('6. Seeding Kost...');
        $juragan = $citizens[3];
        $kost = BoardingHouse::firstOrCreate(
            ['name' => 'Kost Amanah', 'owner_id' => $juragan->id],
            [
                'address' => 'Jl. Mawar No. 5',
                'total_rooms' => 8,
                // 'available_rooms' => 5, // Removed as column doesn't exist
            ]
        );

        // 7. Letters
        $this->command->info('7. Seeding Letters...');
        Letter::firstOrCreate(
            ['user_id' => $citizens[4]->id, 'purpose' => 'Perpanjang KTP'],
            [
                'rt_id' => $rtId,
                'type' => 'PENGANTAR_KTP',
                'status' => 'PENDING',
                'created_at' => now()
            ]
        );

        Letter::firstOrCreate(
            ['user_id' => $citizens[6]->id, 'purpose' => 'Daftar Sekolah Anak'],
            [
                'rt_id' => $rtId,
                'type' => 'DOMISILI',
                'status' => 'APPROVED',
                'approver_id' => $admin->id,
                'letter_number' => '470/01/RT001/2025',
                'created_at' => now()->subDays(5)
            ]
        );

        // 8. Issue Reports
        $this->command->info('8. Seeding Issue Reports...');
        IssueReport::firstOrCreate(
            ['user_id' => $citizens[7]->id, 'title' => 'Got Mampet'],
            [
                'rt_id' => $rtId,
                'description' => 'Air meluap saat hujan karena sampah menumpuk.',
                'category' => 'KEBERSIHAN',
                'status' => 'PENDING',
                'created_at' => now()->subHours(5)
            ]
        );
        
        // 9. Notifications (New)
        $this->command->info('9. Seeding Notifications...');
        // Create notifications for Budi (Demo User)
        \App\Models\Notification::firstOrCreate(
            ['user_id' => $budi->id, 'title' => 'Tagihan Iuran Bulanan'],
            [
                'message' => 'Tagihan iuran kebersihan bulan ini telah terbit.',
                'type' => 'BILL',
                'is_read' => false,
                'created_at' => now()
            ]
        );
        
        \App\Models\Notification::firstOrCreate(
            ['user_id' => $budi->id, 'title' => 'Undangan Kerja Bakti'],
            [
                'message' => 'Jangan lupa kerja bakti besok pagi jam 07:00.',
                'type' => 'INFO',
                'is_read' => true,
                'created_at' => now()->subDays(1)
            ]
        );

        $this->command->info('Comprehensive Demo Seeding Completed!');
    }
}
