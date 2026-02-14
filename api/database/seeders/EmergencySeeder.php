<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\EmergencyContact;

class EmergencySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Global contacts (rt_id null or default)
        EmergencyContact::create([
            'name' => 'Polisi (Panggilan Darurat)',
            'number' => '110',
            'type' => 'OFFICIAL',
            'icon' => 'police-badge',
            'rt_id' => null,
        ]);

        EmergencyContact::create([
            'name' => 'Pemadam Kebakaran',
            'number' => '113',
            'type' => 'OFFICIAL',
            'icon' => 'fire-truck',
            'rt_id' => null,
        ]);

        EmergencyContact::create([
            'name' => 'Ambulans / Kemenkes',
            'number' => '119',
            'type' => 'OFFICIAL',
            'icon' => 'ambulance',
            'rt_id' => null,
        ]);

        // Local contacts (dummy rt_id 1)
        EmergencyContact::create([
            'name' => 'Satpam Pos Utama',
            'number' => '081299998888',
            'type' => 'LOCAL',
            'icon' => 'security',
            'rt_id' => 1,
        ]);

        EmergencyContact::create([
            'name' => 'Ketua RT 05',
            'number' => '08129876543',
            'type' => 'LOCAL',
            'icon' => 'account-tie',
            'rt_id' => 1,
        ]);
    }
}
