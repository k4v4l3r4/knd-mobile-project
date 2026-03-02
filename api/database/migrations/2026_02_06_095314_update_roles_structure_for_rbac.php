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
        // 1. Rename 'name' to 'role_code'
        // SQLite/older MySQL might need explicit rename, or Doctrine/dbal. 
        // Laravel 9+ supports renameColumn if dbal is present or native.
        // We'll try native schema builder.
        
        Schema::table('roles', function (Blueprint $table) {
            $table->renameColumn('name', 'role_code');
        });

        // 2. Drop 'permissions' column (the old JSON one)
        Schema::table('roles', function (Blueprint $table) {
            $table->dropColumn('permissions');
        });

        // 3. Update 'scope' column
        // Since we are changing enum values, it's safer to drop and re-add or change to string first.
        // We'll change it to string for flexibility, or new Enum.
        // Existing data might have 'RT', 'RW'. We should map them or just clear them.
        // Since we are reseeding, we can just change the type.
        
        // Postgres/MySQL handling for enum change is tricky. 
        // Simplest: change to string, then update values, then (optional) back to Enum.
        // User wants scope: SYSTEM | TENANT.
        
        Schema::table('roles', function (Blueprint $table) {
             // Drop the old enum column and re-add it (simplest for drastic change)
             // Or change to string.
             $table->dropColumn('scope');
        });
        
        Schema::table('roles', function (Blueprint $table) {
             $table->enum('scope', ['SYSTEM', 'TENANT'])->default('TENANT')->after('role_code');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('roles', function (Blueprint $table) {
            $table->renameColumn('role_code', 'name');
            $table->json('permissions')->nullable();
            $table->dropColumn('scope');
        });
        
        Schema::table('roles', function (Blueprint $table) {
             $table->enum('scope', ['RT', 'RW', 'RW_LINTAS_RT'])->default('RT')->after('name');
        });
    }
};
