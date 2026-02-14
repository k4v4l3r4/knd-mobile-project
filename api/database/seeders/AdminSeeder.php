<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Check if admin already exists
        // Using a distinct phone number to avoid conflict with Warga Test (08123456789)
        if (!User::where('phone', '081200000000')->exists()) {
            User::create([
                'name' => 'Super Admin',
                'email' => 'superadmin@example.com',
                'phone' => '081200000000',
                'password' => 'password', // Auto hashed by model cast
                'role' => 'SUPER_ADMIN',
                'nik' => '9999999999999999',
                'is_bansos_eligible' => false,
            ]);
        }
    }
}
