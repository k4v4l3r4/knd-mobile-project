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
            $table->string('location')->default('Pos Utama')->after('shift_name');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('ronda_schedules', function (Blueprint $table) {
            $table->dropColumn('location');
        });
    }
};
