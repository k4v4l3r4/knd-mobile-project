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
            // Check if week_start_date exists and rename it to start_date
            if (Schema::hasColumn('ronda_schedules', 'week_start_date')) {
                $table->renameColumn('week_start_date', 'start_date');
            }
            
            // Check if week_end_date exists and rename it to end_date
            if (Schema::hasColumn('ronda_schedules', 'week_end_date')) {
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
            if (Schema::hasColumn('ronda_schedules', 'start_date')) {
                $table->renameColumn('start_date', 'week_start_date');
            }
            
            if (Schema::hasColumn('ronda_schedules', 'end_date')) {
                $table->renameColumn('end_date', 'week_end_date');
            }
        });
    }
};
