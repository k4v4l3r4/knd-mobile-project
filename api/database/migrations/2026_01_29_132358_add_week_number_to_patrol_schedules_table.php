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
        Schema::table('patrol_schedules', function (Blueprint $table) {
            $table->tinyInteger('week_number')->default(1)->after('day_of_week');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('patrol_schedules', function (Blueprint $table) {
            $table->dropColumn('week_number');
        });
    }
};
