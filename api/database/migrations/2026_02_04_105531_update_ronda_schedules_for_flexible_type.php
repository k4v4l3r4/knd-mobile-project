<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('ronda_schedules', function (Blueprint $table) {
            // Defensive: Check if week_start_date exists before renaming
            if (Schema::hasColumn('ronda_schedules', 'week_start_date')) {
                $table->renameColumn('week_start_date', 'start_date');
            } elseif (!Schema::hasColumn('ronda_schedules', 'start_date')) {
                // Column doesn't exist at all, create it
                $table->date('start_date')->nullable();
            }
            
            // Defensive: Check if week_end_date exists before renaming
            if (Schema::hasColumn('ronda_schedules', 'week_end_date')) {
                $table->renameColumn('week_end_date', 'end_date');
            } elseif (!Schema::hasColumn('ronda_schedules', 'end_date')) {
                // Column doesn't exist at all, create it
                $table->date('end_date')->nullable();
            }
            
            // Add schedule_type column only if it doesn't exist
            if (!Schema::hasColumn('ronda_schedules', 'schedule_type')) {
                $table->enum('schedule_type', ['DAILY', 'WEEKLY'])->default('WEEKLY')->after('rt_id');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('ronda_schedules', function (Blueprint $table) {
            // Defensive: Check if start_date exists before renaming back
            if (Schema::hasColumn('ronda_schedules', 'start_date')) {
                $table->renameColumn('start_date', 'week_start_date');
            }
            
            // Defensive: Check if end_date exists before renaming back
            if (Schema::hasColumn('ronda_schedules', 'end_date')) {
                $table->renameColumn('end_date', 'week_end_date');
            }
            
            // Drop schedule_type only if it exists
            if (Schema::hasColumn('ronda_schedules', 'schedule_type')) {
                $table->dropColumn('schedule_type');
            }
        });
    }
};
