<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use App\Models\Role; // Added Role model
use App\Models\Wallet;
use App\Models\Fee;
use App\Models\ActivityCategory;
use App\Models\EmergencyContact;
use App\Models\WilayahRt;

class StarterSeeder extends Seeder
{
    public function run()
    {
        // 1. Wilayah RW
        $rw = DB::table('wilayah_rw')->where('code', 'RW01')->first();
        if (!$rw) {
            $rwId = DB::table('wilayah_rw')->insertGetId([
                'name' => 'RW 01',
                'code' => 'RW01',
                'subscription_status' => 'ACTIVE',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        } else {
            $rwId = $rw->id;
        }

        // 2. Wilayah RT
        $rt = WilayahRt::where('rt_number', '001')->first();
        if (!$rt) {
            $rtId = DB::table('wilayah_rt')->insertGetId([
                'rw_id' => $rwId,
                'rt_number' => '001',
                'rt_name' => 'RT 001 Sejahtera',
                'kas_balance' => 0,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        } else {
            $rtId = $rt->id;
        }

        $admin = User::where('email', 'admin@rt.com')->orWhere('phone', '081200000001')->first();
        
        $roleAdmin = Role::where('role_code', 'ADMIN_RT')->first();
        $roleId = $roleAdmin ? $roleAdmin->id : null;

        if (!$admin) {
            $admin = User::create([
                'name' => 'Pak RT (Admin)',
                'email' => 'admin@rt.com',
                'phone' => '081200000001',
                'password' => 'password', // Auto hashed by model cast
                'role' => 'ADMIN_RT',
                'role_id' => $roleId,
                'rt_id' => $rtId,
                'rw_id' => $rwId,
                'address' => 'Kantor Sekretariat RT',
            ]);
        } else {
            $admin->update([
                'name' => 'Pak RT (Admin)',
                'email' => 'admin@rt.com',
                'role' => 'ADMIN_RT',
                'role_id' => $roleId,
                'rt_id' => $rtId,
                'rw_id' => $rwId,
                'address' => 'Kantor Sekretariat RT',
            ]);
        }

        // 4. Keuangan Dasar (Wallet)
        Wallet::firstOrCreate(
            ['rt_id' => $rtId, 'name' => 'Kas Tunai RT'],
            ['type' => 'CASH', 'balance' => 0]
        );

        Wallet::firstOrCreate(
            ['rt_id' => $rtId, 'name' => 'Bank RT (BCA)'],
            [
                'type' => 'BANK', 
                'balance' => 0,
                'bank_name' => 'BCA',
                'account_number' => '1234567890',
            ]
        );

        // 5. Iuran Dasar (Fee)
        Fee::firstOrCreate(
            ['rt_id' => $rtId, 'name' => 'Iuran Kebersihan'],
            ['amount' => 25000, 'is_mandatory' => true, 'description' => 'Iuran bulanan pengelolaan sampah']
        );

        // 6. Kategori Kegiatan
        ActivityCategory::firstOrCreate(
            ['name' => 'Kerja Bakti', 'rt_id' => $rtId],
            ['description' => 'Kegiatan bersih-bersih lingkungan']
        );

        ActivityCategory::firstOrCreate(
            ['name' => 'Rapat RT', 'rt_id' => $rtId],
            ['description' => 'Pertemuan rutin warga']
        );
        
        ActivityCategory::firstOrCreate(
            ['name' => 'Posyandu', 'rt_id' => $rtId],
            ['description' => 'Kegiatan kesehatan ibu dan anak']
        );

        // 7. Kontak Darurat Umum
        EmergencyContact::firstOrCreate(
            ['name' => 'Polsek Terdekat', 'rt_id' => $rtId],
            ['number' => '110', 'type' => 'POLISI']
        );

        EmergencyContact::firstOrCreate(
            ['name' => 'RSUD Kota', 'rt_id' => $rtId],
            ['number' => '118', 'type' => 'RS']
        );

        $this->command->info('Starter Data (Live Ready) Seeded Successfully!');
    }
}
