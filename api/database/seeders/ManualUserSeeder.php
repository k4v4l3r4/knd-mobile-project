<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use App\Models\Role;
use App\Models\WilayahRt;
use App\Models\WilayahRw;

class ManualUserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->command->info('Starting Manual User Seeding (No Faker)...');

        // 1. Get RT & RW (Assuming StarterSeeder has run)
        // If not found, we can try to create or just fail/warn.
        $rt = WilayahRt::where('rt_number', '001')->first();
        if (!$rt) {
            $this->command->error('RT 001 not found! Please run StarterSeeder first.');
            return;
        }
        $rtId = $rt->id;
        $rwId = $rt->rw_id; // Usually RT has rw_id relation

        // 2. Get Role ID for WARGA_TETAP
        $roleWarga = Role::where('role_code', 'WARGA_TETAP')->first();
        $roleId = $roleWarga ? $roleWarga->id : null;

        if (!$roleId) {
            $this->command->warn('Role WARGA_TETAP not found. Users will be created without role_id.');
        }

        // 3. Define Manual Users
        $users = [
            [
                'name' => 'Faisal Basri',
                'email' => 'faisal@warga.com',
                'phone' => '6281299990001',
                'nik' => '3171000000000001',
                'gender' => 'L', // Laki-laki
                // 'marital_status' => 'MARRIED',
                'occupation' => 'Wiraswasta',
                'address' => 'Jl. Mawar No. 1',
                'status_in_family' => 'KEPALA_KELUARGA',
                'date_of_birth' => '1980-01-01',
            ],
            [
                'name' => 'Siti Aminah',
                'email' => 'siti@warga.com',
                'phone' => '6281299990002',
                'nik' => '3171000000000002',
                'gender' => 'P', // Perempuan
                // 'marital_status' => 'MARRIED',
                'occupation' => 'Ibu Rumah Tangga',
                'address' => 'Jl. Mawar No. 1',
                'status_in_family' => 'ISTRI',
                'date_of_birth' => '1982-05-10',
            ],
            [
                'name' => 'Budi Santoso',
                'email' => 'budi.manual@warga.com',
                'phone' => '6281299990003',
                'nik' => '3171000000000003',
                'gender' => 'L',
                // 'marital_status' => 'SINGLE',
                'occupation' => 'Mahasiswa',
                'address' => 'Jl. Melati No. 5',
                'status_in_family' => 'ANAK',
                'date_of_birth' => '2000-12-12',
            ],
            [
                'name' => 'Dewi Sartika',
                'email' => 'dewi@warga.com',
                'phone' => '6281299990004',
                'nik' => '3171000000000004',
                'gender' => 'P',
                // 'marital_status' => 'DIVORCED',
                'occupation' => 'Guru',
                'address' => 'Jl. Anggrek No. 10',
                'status_in_family' => 'KEPALA_KELUARGA',
                'date_of_birth' => '1975-08-17',
            ],
            [
                'name' => 'Ahmad Dahlan',
                'email' => 'ahmad@warga.com',
                'phone' => '6281299990005',
                'nik' => '3171000000000005',
                'gender' => 'L',
                // 'marital_status' => 'MARRIED',
                'occupation' => 'PNS',
                'address' => 'Jl. Kenanga No. 3',
                'status_in_family' => 'KEPALA_KELUARGA',
                'date_of_birth' => '1978-03-20',
            ],
        ];

        // 4. Insert Users
        foreach ($users as $userData) {
            $user = User::firstOrCreate(
                ['email' => $userData['email']],
                array_merge($userData, [
                    'password' => Hash::make('password'), // Default password
                    'role' => 'WARGA_TETAP', // String role (legacy/backup)
                    'role_id' => $roleId,
                    'rt_id' => $rtId,
                    'rw_id' => $rwId,
                    'is_bansos_eligible' => false,
                    'email_verified_at' => now(),
                    'created_at' => now(),
                    'updated_at' => now(),
                ])
            );

            if ($user->wasRecentlyCreated) {
                $this->command->info("Created user: {$user->name} ({$user->email})");
            } else {
                $this->command->line("User already exists: {$user->name}");
            }
        }

        $this->command->info('Manual User Seeding Completed!');
    }
}
