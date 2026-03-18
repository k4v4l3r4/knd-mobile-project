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
        Schema::table('ronda_schedules', function (Blueprint $table) {
            // Defensive: Only rename if old column exists AND new column doesn't exist
            if (Schema::hasColumn('ronda_schedules', 'week_start_date') && !Schema::hasColumn('ronda_schedules', 'start_date')) {
                $table->renameColumn('week_start_date', 'start_date');
            }
            
            // Defensive: Only rename if old column exists AND new column doesn't exist
            if (Schema::hasColumn('ronda_schedules', 'week_end_date') && !Schema::hasColumn('ronda_schedules', 'end_date')) {
                $table->renameColumn('week_end_date', 'end_date');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('ronda_schedules', function (Blueprint $table) {
            // Defensive: Only rename back if old column exists AND new column doesn't exist
            if (Schema::hasColumn('ronda_schedules', 'start_date') && !Schema::hasColumn('ronda_schedules', 'week_start_date')) {
                $table->renameColumn('start_date', 'week_start_date');
            }
            
            // Defensive: Only rename back if old column exists AND new column doesn't exist
            if (Schema::hasColumn('ronda_schedules', 'end_date') && !Schema::hasColumn('ronda_schedules', 'week_end_date')) {
                $table->renameColumn('end_date', 'week_end_date');
            }
        });
    }
};
