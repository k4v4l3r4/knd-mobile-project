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
        Schema::table('roles', function (Blueprint $table) {
            $table->enum('scope', ['RT', 'RW', 'RW_LINTAS_RT'])->default('RT')->after('label');
            $table->json('permissions')->nullable()->after('scope');
        });

        // Update existing roles
        DB::table('roles')->where('name', 'SUPER_ADMIN')->update([
            'scope' => 'RT', // As requested, Admin RT
            'permissions' => json_encode(['dashboard', 'finance', 'umkm', 'admin', 'service']),
            'label' => 'Admin RT' // Update label as requested
        ]);

        DB::table('roles')->where('name', 'ADMIN_RT')->update([
            'scope' => 'RT',
            'permissions' => json_encode(['dashboard', 'finance', 'umkm', 'admin', 'service']),
            'label' => 'Admin RT'
        ]);

        DB::table('roles')->where('name', 'ADMIN_RW')->update([
            'scope' => 'RW',
            'permissions' => json_encode(['dashboard', 'finance', 'umkm', 'admin', 'service']),
            'label' => 'Admin RW'
        ]);

        // Residents usually don't have admin permissions
        $residentRoles = ['WARGA_TETAP', 'WARGA_KOST', 'JURAGAN_KOST', 'SECURITY'];
        DB::table('roles')->whereIn('name', $residentRoles)->update([
            'scope' => 'RT',
            'permissions' => json_encode([]),
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('roles', function (Blueprint $table) {
            $table->dropColumn(['scope', 'permissions']);
        });
    }
};
