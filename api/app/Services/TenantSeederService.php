<?php

namespace App\Services;

use App\Models\Tenant;
use App\Models\Role;
use App\Models\User;
use App\Models\WilayahRt;
use App\Models\WilayahRw;
use App\Models\Wallet;
use App\Models\Transaction;
use App\Models\RondaSchedule;
use App\Models\RondaParticipant;
use App\Models\BansosRecipient;
use App\Models\BansosHistory;
use App\Models\Announcement;
use App\Models\IssueReport;
use App\Models\Store;
use App\Models\Product;
use App\Models\EmergencyContact;
use App\Models\Asset;
use App\Models\Fee;
use App\Models\Letter;
use App\Models\LetterType;
use Carbon\Carbon;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class TenantSeederService
{
    public function seedDemoTenant(Tenant $tenant, WilayahRt $rt, WilayahRw $rw)
    {
        // 1. Create Comprehensive Warga Data
        $wargaList = $this->createDummyWarga($tenant, $rt, $rw);

        // 2. Finance (Wallets, Fees, Transactions)
        $this->seedFinance($tenant, $rt, $wargaList);

        // 3. Ronda (Schedules, Participants)
        $this->seedRonda($tenant, $rt, $wargaList);

        // 4. Bansos (Recipients, History)
        $this->seedBansos($tenant, $rt, $wargaList);

        // 5. Announcements
        $this->seedAnnouncements($tenant, $rt);

        // 6. Reports (Laporan Warga)
        $this->seedReports($tenant, $rt, $wargaList);

        // 7. UMKM (Store, Products)
        $this->seedUmkm($tenant, $rt, $wargaList);

        // 8. Emergency Contacts
        $this->seedEmergency($tenant, $rt);

        // 9. Inventory (Assets)
        $this->seedInventory($tenant, $rt);

        // 10. Letters (Surat)
        $this->seedLetters($tenant, $rt, $wargaList);

        return [
            'warga' => $wargaList,
        ];
    }

    protected function createDummyWarga($tenant, $rt, $rw)
    {
        $wargaList = [];
        $password = Hash::make('password');
        
        // Fetch Roles
        $roleWargaTetap = Role::where('role_code', 'WARGA_TETAP')->first();
        $roleWargaKost = Role::where('role_code', 'WARGA_KOST')->first();

        // Family 1: The Santoso Family
        $bapak1 = User::create([
            'tenant_id' => $tenant->id,
            'name' => 'Budi Santoso',
            'email' => 'budi.' . $tenant->id . '@demo.com',
            'phone' => '0812' . rand(10000000, 99999999),
            'password' => $password,
            'role' => 'WARGA_TETAP',
            'role_id' => $roleWargaTetap ? $roleWargaTetap->id : null,
            'rt_id' => $rt->id,
            'rw_id' => $rw->id,
            'status_in_family' => 'KEPALA_KELUARGA',
            'gender' => 'L',
            'birth_place' => 'Jakarta',
            'birth_date' => '1980-05-15',
            'address' => 'Jl. Mawar No. 1',
            'occupation' => 'Karyawan Swasta',
            'marital_status' => 'KAWIN',
        ]);
        $wargaList[] = $bapak1;

        $ibu1 = User::create([
            'tenant_id' => $tenant->id,
            'name' => 'Siti Aminah',
            'email' => 'siti.' . $tenant->id . '@demo.com',
            'phone' => '0813' . rand(10000000, 99999999),
            'password' => $password,
            'role' => 'WARGA_TETAP',
            'role_id' => $roleWargaTetap ? $roleWargaTetap->id : null,
            'rt_id' => $rt->id,
            'rw_id' => $rw->id,
            'status_in_family' => 'ISTRI',
            'gender' => 'P',
            'birth_place' => 'Bandung',
            'birth_date' => '1982-08-20',
            'address' => 'Jl. Mawar No. 1',
            'occupation' => 'Ibu Rumah Tangga',
            'marital_status' => 'KAWIN',
        ]);
        $wargaList[] = $ibu1;

        // Family 2: The Wijaya Family
        $bapak2 = User::create([
            'tenant_id' => $tenant->id,
            'name' => 'Eko Wijaya',
            'email' => 'eko.' . $tenant->id . '@demo.com',
            'phone' => '0814' . rand(10000000, 99999999),
            'password' => $password,
            'role' => 'WARGA_TETAP',
            'role_id' => $roleWargaTetap ? $roleWargaTetap->id : null,
            'rt_id' => $rt->id,
            'rw_id' => $rw->id,
            'status_in_family' => 'KEPALA_KELUARGA',
            'gender' => 'L',
            'birth_place' => 'Surabaya',
            'birth_date' => '1975-11-10',
            'address' => 'Jl. Melati No. 5',
            'occupation' => 'Wiraswasta',
            'marital_status' => 'KAWIN',
        ]);
        $wargaList[] = $bapak2;

        // Single Youth
        $pemuda = User::create([
            'tenant_id' => $tenant->id,
            'name' => 'Rizky Ramadhan',
            'email' => 'rizky.' . $tenant->id . '@demo.com',
            'phone' => '0815' . rand(10000000, 99999999),
            'password' => $password,
            'role' => 'WARGA_TETAP',
            'role_id' => $roleWargaTetap ? $roleWargaTetap->id : null,
            'rt_id' => $rt->id,
            'rw_id' => $rw->id,
            'status_in_family' => 'ANAK',
            'gender' => 'L',
            'birth_place' => 'Jakarta',
            'birth_date' => '2000-01-01',
            'address' => 'Jl. Anggrek No. 10',
            'occupation' => 'Mahasiswa',
            'marital_status' => 'BELUM_KAWIN',
        ]);
        $wargaList[] = $pemuda;

        // Kost Tenant (Warga Sementara)
        $anakKost = User::create([
            'tenant_id' => $tenant->id,
            'name' => 'Dinda Puspita',
            'email' => 'dinda.' . $tenant->id . '@demo.com',
            'phone' => '0816' . rand(10000000, 99999999),
            'password' => $password,
            'role' => 'WARGA_KOST', // Kost
            'role_id' => $roleWargaKost ? $roleWargaKost->id : null,
            'rt_id' => $rt->id,
            'rw_id' => $rw->id,
            'status_in_family' => 'KEPALA_KELUARGA', // Independent
            'gender' => 'P',
            'birth_place' => 'Yogyakarta',
            'birth_date' => '1998-03-12',
            'address' => 'Kost Bu Haji Kamar 3',
            'occupation' => 'Karyawan',
            'marital_status' => 'BELUM_KAWIN',
        ]);
        $wargaList[] = $anakKost;

        return $wargaList;
    }

    protected function seedFinance($tenant, $rt, $wargaList)
    {
        // 1. Wallets
        $cashWallet = Wallet::create([
            'tenant_id' => $tenant->id,
            'rt_id' => $rt->id,
            'name' => 'Kas Tunai RT',
            'type' => 'CASH',
            'balance' => 0,
        ]);

        $bankWallet = Wallet::create([
            'tenant_id' => $tenant->id,
            'rt_id' => $rt->id,
            'name' => 'Bank BRI',
            'type' => 'BANK',
            'bank_name' => 'BRI',
            'account_number' => '1234567890',
            'account_holder_name' => 'RT 001 Demo',
            'balance' => 0,
        ]);

        // 2. Fees (Iuran)
        $feeKebersihan = Fee::create([
            'tenant_id' => $tenant->id,
            'rt_id' => $rt->id,
            'name' => 'Iuran Kebersihan',
            'amount' => 25000,
            'is_mandatory' => true,
        ]);

        $feeKeamanan = Fee::create([
            'tenant_id' => $tenant->id,
            'rt_id' => $rt->id,
            'name' => 'Iuran Keamanan',
            'amount' => 15000,
            'is_mandatory' => true,
        ]);

        $feeItems = [
            [
                'fee_id' => $feeKebersihan->id,
                'fee_name' => $feeKebersihan->name,
                'amount' => $feeKebersihan->amount,
            ],
            [
                'fee_id' => $feeKeamanan->id,
                'fee_name' => $feeKeamanan->name,
                'amount' => $feeKeamanan->amount,
            ]
        ];

        // 3. Transactions
        
        // SALDO AWAL (To ensure positive balance in Dashboard)
        Transaction::create([
            'tenant_id' => $tenant->id,
            'rt_id' => $rt->id,
            'user_id' => null,
            'account_id' => $cashWallet->id,
            'type' => 'IN',
            'amount' => 5000000,
            'category' => 'Saldo Awal',
            'description' => 'Saldo Awal Tunai',
            'date' => now()->subMonth(),
            'status' => 'PAID',
        ]);

        Transaction::create([
            'tenant_id' => $tenant->id,
            'rt_id' => $rt->id,
            'user_id' => null,
            'account_id' => $bankWallet->id,
            'type' => 'IN',
            'amount' => 15000000,
            'category' => 'Saldo Awal',
            'description' => 'Saldo Awal Bank',
            'date' => now()->subMonth(),
            'status' => 'PAID',
        ]);

        // Income (Pemasukan)
        Transaction::create([
            'tenant_id' => $tenant->id,
            'rt_id' => $rt->id,
            'user_id' => $wargaList[0]->id, // Budi
            'account_id' => $bankWallet->id,
            'type' => 'IN',
            'amount' => 40000,
            'category' => 'Iuran Warga',
            'description' => 'Iuran Bulan Ini (Budi)',
            'date' => now()->subDays(2),
            'status' => 'PAID',
            'items' => $feeItems,
        ]);

        Transaction::create([
            'tenant_id' => $tenant->id,
            'rt_id' => $rt->id,
            'user_id' => $wargaList[2]->id, // Eko
            'account_id' => $cashWallet->id,
            'type' => 'IN',
            'amount' => 40000,
            'category' => 'Iuran Warga',
            'description' => 'Iuran Bulan Ini (Eko)',
            'date' => now()->subDays(5),
            'status' => 'PAID',
            'items' => $feeItems,
        ]);

        // Expense (Pengeluaran)
        Transaction::create([
            'tenant_id' => $tenant->id,
            'rt_id' => $rt->id,
            'user_id' => null, // Admin expense
            'account_id' => $cashWallet->id,
            'type' => 'OUT',
            'amount' => 150000,
            'category' => 'Operasional',
            'description' => 'Beli Alat Kebersihan (Sapu Lidi, Pengki)',
            'date' => now()->subDays(1),
            'status' => 'PAID',
        ]);
        
        // Update balances (manual update)
        $cashWallet->increment('balance', 5000000);
        $bankWallet->increment('balance', 15000000);
        
        $bankWallet->increment('balance', 40000);
        $cashWallet->increment('balance', 40000);
        $cashWallet->decrement('balance', 150000);
    }

    protected function seedRonda($tenant, $rt, $wargaList)
    {
        // Create Schedule for this week
        $startDate = now()->startOfWeek();
        $endDate = now()->endOfWeek();

        $schedule = RondaSchedule::create([
            'tenant_id' => $tenant->id,
            'rt_id' => $rt->id,
            'shift_name' => 'Jadwal Ronda Minggu Ini',
            'start_date' => $startDate->format('Y-m-d'),
            'end_date' => $endDate->format('Y-m-d'),
            'start_time' => '22:00:00',
            'end_time' => '04:00:00',
            'status' => 'ACTIVE',
        ]);

        // Assign Participants
        // Budi (Present)
        RondaParticipant::create([
            'tenant_id' => $tenant->id,
            'schedule_id' => $schedule->id,
            'user_id' => $wargaList[0]->id,
            'schedule_date' => now()->format('Y-m-d'), // Today
            'status' => 'PRESENT',
            'attendance_at' => now()->subHours(2),
        ]);

        // Eko (Absent/Pending)
        RondaParticipant::create([
            'tenant_id' => $tenant->id,
            'schedule_id' => $schedule->id,
            'user_id' => $wargaList[2]->id,
            'schedule_date' => now()->format('Y-m-d'),
            'status' => 'PENDING',
        ]);

        // Rizky (Excused)
        RondaParticipant::create([
            'tenant_id' => $tenant->id,
            'schedule_id' => $schedule->id,
            'user_id' => $wargaList[3]->id,
            'schedule_date' => now()->addDay()->format('Y-m-d'), // Tomorrow
            'status' => 'ABSENT',
            'notes' => 'Sakit Demam',
        ]);
    }

    protected function seedBansos($tenant, $rt, $wargaList)
    {
        // Add Eko Wijaya as Recipient
        $recipient = BansosRecipient::create([
            'tenant_id' => $tenant->id,
            'rt_id' => $rt->id,
            'user_id' => $wargaList[2]->id, // Eko
            'no_kk' => '3171000000000002',
            'status' => 'LAYAK',
            'notes' => 'Keluarga Prasejahtera',
        ]);

        // Add History
        BansosHistory::create([
            'tenant_id' => $tenant->id,
            'recipient_id' => $recipient->id,
            'amount' => 300000,
            'date_received' => now()->subMonth(),
            'program_name' => 'Bantuan Langsung Tunai Tahap 1',
        ]);
    }

    protected function seedAnnouncements($tenant, $rt)
    {
        Announcement::create([
            'tenant_id' => $tenant->id,
            'rt_id' => $rt->id,
            'title' => 'Kerja Bakti Minggu Ini',
            'content' => 'Diharapkan seluruh warga RT 001 untuk hadir dalam kegiatan kerja bakti membersihkan selokan pada hari Minggu, jam 07:00 WIB.',
            'status' => 'PUBLISHED',
            'is_pinned' => true,
            'created_at' => now(),
        ]);

        Announcement::create([
            'tenant_id' => $tenant->id,
            'rt_id' => $rt->id,
            'title' => 'Jadwal Posyandu Balita',
            'content' => 'Posyandu balita akan dilaksanakan pada hari Kamis di Balai Warga. Harap membawa buku KIA.',
            'status' => 'PUBLISHED',
            'created_at' => now()->subDays(3),
        ]);
    }

    protected function seedReports($tenant, $rt, $wargaList)
    {
        // Pending Report
        IssueReport::create([
            'tenant_id' => $tenant->id,
            'rt_id' => $rt->id,
            'user_id' => $wargaList[0]->id, // Budi
            'title' => 'Lampu Jalan Mati',
            'description' => 'Lampu penerangan jalan di depan rumah No. 3 mati sejak kemarin malam.',
            'category' => 'INFRASTRUKTUR',
            'status' => 'PENDING',
        ]);

        // Resolved Report
        IssueReport::create([
            'tenant_id' => $tenant->id,
            'rt_id' => $rt->id,
            'user_id' => $wargaList[1]->id, // Siti
            'title' => 'Sampah Menumpuk',
            'description' => 'Sampah di bak sampah ujung gang belum diangkut.',
            'category' => 'KEBERSIHAN',
            'status' => 'DONE',
        ]);
    }

    protected function seedUmkm($tenant, $rt, $wargaList)
    {
        // Store owned by Dinda
        $store = Store::create([
            'tenant_id' => $tenant->id,
            'rt_id' => $rt->id,
            'user_id' => $wargaList[4]->id, // Dinda
            'name' => 'Dinda Catering',
            'description' => 'Menyediakan aneka nasi kotak dan snack box.',
            'status' => 'verified',
            'address' => $wargaList[4]->address,
        ]);

        Product::create([
            'tenant_id' => $tenant->id,
            'store_id' => $store->id,
            'user_id' => $wargaList[4]->id,
            'name' => 'Nasi Uduk Spesial',
            'description' => 'Nasi uduk dengan ayam goreng, tempe orek, dan sambal.',
            'price' => 15000,
            'is_available' => true,
            'whatsapp' => '081234567890',
            'category' => 'Makanan',
        ]);

        Product::create([
            'tenant_id' => $tenant->id,
            'store_id' => $store->id,
            'user_id' => $wargaList[4]->id,
            'name' => 'Risoles Mayones',
            'description' => 'Risoles isi asap daging, telur, dan mayones.',
            'price' => 3000,
            'is_available' => true,
            'whatsapp' => '081234567890',
            'category' => 'Makanan',
        ]);
    }

    protected function seedEmergency($tenant, $rt)
    {
        EmergencyContact::create([
            'tenant_id' => $tenant->id,
            'rt_id' => $rt->id,
            'name' => 'Polsek Tebet',
            'number' => '0218303555',
            'type' => 'POLISI',
        ]);

        EmergencyContact::create([
            'tenant_id' => $tenant->id,
            'rt_id' => $rt->id,
            'name' => 'RSUD Tebet',
            'number' => '0218315000',
            'type' => 'RUMAH_SAKIT',
        ]);
    }

    protected function seedInventory($tenant, $rt)
    {
        Asset::create([
            'tenant_id' => $tenant->id,
            'rt_id' => $rt->id,
            'name' => 'Tenda Terop 4x6',
            'description' => 'Tenda biru untuk acara warga.',
            'total_quantity' => 2,
            'available_quantity' => 2,
            'condition' => 'BAIK',
        ]);

        Asset::create([
            'tenant_id' => $tenant->id,
            'rt_id' => $rt->id,
            'name' => 'Sound System Portable',
            'description' => 'Speaker wireless + 2 Mic.',
            'total_quantity' => 1,
            'available_quantity' => 1,
            'condition' => 'BAIK',
        ]);
    }

    protected function seedLetters($tenant, $rt, $wargaList)
    {
        // Letter Type
        $type = LetterType::create([
            'tenant_id' => $tenant->id,
            'rt_id' => $rt->id,
            'name' => 'Surat Pengantar SKCK',
            'code' => 'SKCK',
        ]);

        // Letter Request
        Letter::create([
            'tenant_id' => $tenant->id,
            'rt_id' => $rt->id,
            'user_id' => $wargaList[3]->id, // Rizky
            'type' => 'LAINNYA', // Mapping to Enum if possible, or string. 'SKCK' is not in enum, so use LAINNYA
            'purpose' => 'Pengurusan SKCK',
            'status' => 'APPROVED',
            'admin_note' => 'Silakan ambil di rumah Pak RT.',
            'letter_number' => '001/RT001/SKCK/' . now()->format('m/Y'),
        ]);
    }
}
