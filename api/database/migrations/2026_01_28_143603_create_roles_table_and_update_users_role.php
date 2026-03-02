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
        // 1. Create roles table
        Schema::create('roles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('rt_id')->nullable()->constrained('wilayah_rt')->cascadeOnDelete();
            $table->string('name'); // e.g. 'ADMIN_RT', 'SEKSI_KEAMANAN'
            $table->string('label'); // e.g. 'Admin RT', 'Seksi Keamanan'
            $table->text('description')->nullable();
            $table->boolean('is_system')->default(false);
            $table->timestamps();

            // Unique constraint: name should be unique within an RT (or globally if system)
            // But system roles are global.
            // Let's just index it for now.
            $table->index(['rt_id', 'name']);
        });

        // 2. Seed default roles
        $defaultRoles = [
            ['name' => 'SUPER_ADMIN', 'label' => 'Super Admin', 'is_system' => true],
            ['name' => 'ADMIN_RW', 'label' => 'Admin RW', 'is_system' => true],
            ['name' => 'ADMIN_RT', 'label' => 'Admin RT (Super Admin)', 'is_system' => true],
            ['name' => 'SECRETARY', 'label' => 'Sekretaris', 'is_system' => true],
            ['name' => 'TREASURER', 'label' => 'Bendahara', 'is_system' => true],
            ['name' => 'WARGA_TETAP', 'label' => 'Warga Tetap', 'is_system' => true],
            ['name' => 'JURAGAN_KOST', 'label' => 'Juragan Kost', 'is_system' => true],
            ['name' => 'WARGA_KOST', 'label' => 'Warga Kost', 'is_system' => true],
            ['name' => 'SECURITY', 'label' => 'Satpam / Security', 'is_system' => true],
        ];

        foreach ($defaultRoles as $role) {
            DB::table('roles')->insert(array_merge($role, [
                'created_at' => now(),
                'updated_at' => now(),
            ]));
        }

        // 3. Change users.role to string
        // We use raw SQL to handle the ENUM to VARCHAR conversion cleanly in Postgres
        // This drops the enum constraint and converts the column to varchar
        try {
            DB::statement("ALTER TABLE users ALTER COLUMN role TYPE VARCHAR(255)");
        } catch (\Exception $e) {
            // Fallback for other DBs (like MySQL) or if it fails
             Schema::table('users', function (Blueprint $table) {
                $table->string('role', 255)->change();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('roles');
        
        // We don't revert the users.role type because it's messy to go back to ENUM 
        // without knowing exact state, but we could if needed.
    }
};
