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
            $table->renameColumn('week_start_date', 'start_date');
            $table->renameColumn('week_end_date', 'end_date');
            $table->enum('schedule_type', ['DAILY', 'WEEKLY'])->default('WEEKLY')->after('rt_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('ronda_schedules', function (Blueprint $table) {
            $table->renameColumn('start_date', 'week_start_date');
            $table->renameColumn('end_date', 'week_end_date');
            $table->dropColumn('schedule_type');
        });
    }
};
