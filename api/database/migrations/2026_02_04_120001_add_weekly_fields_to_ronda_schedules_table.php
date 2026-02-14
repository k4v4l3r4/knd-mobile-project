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
            $table->date('week_start_date')->nullable()->after('rt_id');
            $table->date('week_end_date')->nullable()->after('week_start_date');
            $table->time('start_time')->nullable()->after('week_end_date');
            $table->time('end_time')->nullable()->after('start_time');
            $table->enum('status', ['ACTIVE', 'INACTIVE'])->default('ACTIVE')->after('end_time');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('ronda_schedules', function (Blueprint $table) {
            $table->dropColumn(['week_start_date', 'week_end_date', 'start_time', 'end_time', 'status']);
        });
    }
};

