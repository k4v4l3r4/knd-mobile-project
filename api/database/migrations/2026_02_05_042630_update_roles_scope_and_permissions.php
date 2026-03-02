<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Update ADMIN_RT
        DB::table('roles')->where('name', 'ADMIN_RT')->update([
            'label' => 'Admin RT', // Fix label
            'scope' => 'RT',
            'permissions' => json_encode(['dashboard', 'finance', 'umkm', 'admin', 'service']),
        ]);

        // 2. Update ADMIN_RW
        DB::table('roles')->where('name', 'ADMIN_RW')->update([
            'label' => 'Admin RW',
            'scope' => 'RW',
            'permissions' => json_encode(['dashboard', 'finance', 'umkm', 'admin', 'service']),
        ]);

        // 3. Update TREASURER (Bendahara)
        DB::table('roles')->where('name', 'TREASURER')->update([
            'label' => 'Bendahara',
            'scope' => 'RT',
            'permissions' => json_encode(['finance']),
        ]);

        // 4. Update SECRETARY (Sekretaris)
        DB::table('roles')->where('name', 'SECRETARY')->update([
            'label' => 'Sekretaris',
            'scope' => 'RT',
            'permissions' => json_encode(['dashboard', 'service', 'admin']),
        ]);

        // 5. Ensure UMKM_RW exists (System Role)
        $umkmRole = DB::table('roles')->where('name', 'UMKM_RW')->first();
        if (!$umkmRole) {
            DB::table('roles')->insert([
                'name' => 'UMKM_RW',
                'label' => 'UMKM RW',
                'description' => 'Pengelola UMKM lintas RT dalam satu RW',
                'is_system' => true,
                'scope' => 'RW_LINTAS_RT',
                'permissions' => json_encode(['umkm']),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        } else {
            DB::table('roles')->where('name', 'UMKM_RW')->update([
                'label' => 'UMKM RW',
                'scope' => 'RW_LINTAS_RT',
                'permissions' => json_encode(['umkm']),
                'is_system' => true,
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // We generally don't revert data updates unless strictly necessary
    }
};
