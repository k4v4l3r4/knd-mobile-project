<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Ensure PostGIS extension exists
        DB::statement('CREATE EXTENSION IF NOT EXISTS postgis');

        Schema::create('ronda_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('schedule_id')->constrained('ronda_schedules')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamp('check_in_time');
            $table->float('distance_from_post'); // Meters
            $table->timestamps();
            $table->softDeletes();
        });

        // Add geography column using raw SQL
        DB::statement('ALTER TABLE ronda_logs ADD COLUMN location GEOGRAPHY(POINT, 4326)');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ronda_logs');
    }
};
