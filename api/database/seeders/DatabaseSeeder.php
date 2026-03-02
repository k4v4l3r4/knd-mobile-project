<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 0. Setup Roles & Permissions
        $this->call(RolePermissionSeeder::class);

        // 1. Starter / Live Data (Essential Structure)
        // Creates RW, RT, Admin User, Default Wallet, etc.
        $this->call(StarterSeeder::class);

        // 2. Demo Data (Optional)
        // Creates Fake Warga, Transactions, Reports, etc.
        // Run manually: php artisan db:seed --class=DemoSeeder
        // Or uncomment below for local development:
        $this->call(DemoSeeder::class);
    }
}
