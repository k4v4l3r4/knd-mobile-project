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
        Schema::table('emergency_contacts', function (Blueprint $table) {
            $table->unsignedBigInteger('rt_id')->nullable()->after('id');
            $table->string('icon')->nullable()->after('number');
        });

        Schema::table('emergency_alerts', function (Blueprint $table) {
            $table->unsignedBigInteger('rt_id')->nullable()->after('user_id');
            $table->text('description')->nullable()->after('longitude');
        });
        
        // Handle Postgres Enum Constraint
        try {
            DB::statement("ALTER TABLE emergency_alerts DROP CONSTRAINT IF EXISTS emergency_alerts_status_check");
            DB::statement("ALTER TABLE emergency_alerts ADD CONSTRAINT emergency_alerts_status_check CHECK (status IN ('OPEN', 'RESOLVED', 'FALSE_ALARM'))");
        } catch (\Exception $e) {
            // In case of error (e.g. not postgres or different constraint name), just ignore or log
            // Use standard Laravel enum modification if possible, but DB::statement is more direct for this fix
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('emergency_contacts', function (Blueprint $table) {
            $table->dropColumn(['rt_id', 'icon']);
        });

        Schema::table('emergency_alerts', function (Blueprint $table) {
            $table->dropColumn(['rt_id', 'description']);
        });
        
        try {
            DB::statement("ALTER TABLE emergency_alerts DROP CONSTRAINT IF EXISTS emergency_alerts_status_check");
            DB::statement("ALTER TABLE emergency_alerts ADD CONSTRAINT emergency_alerts_status_check CHECK (status IN ('OPEN', 'RESOLVED'))");
        } catch (\Exception $e) {
        }
    }
};
