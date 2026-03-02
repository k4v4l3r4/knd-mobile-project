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
        Schema::create('ronda_locations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('rt_id')->constrained('wilayah_rt')->onDelete('cascade');
            $table->string('name');
            $table->decimal('latitude', 10, 8);
            $table->decimal('longitude', 11, 8);
            $table->integer('radius_meters')->default(50);
            $table->string('qr_token')->unique()->nullable();
            $table->timestamp('token_expires_at')->nullable();
            $table->timestamps();
        });

        Schema::table('ronda_participants', function (Blueprint $table) {
            $table->decimal('attendance_lat', 10, 8)->nullable()->after('notes');
            $table->decimal('attendance_long', 11, 8)->nullable()->after('attendance_lat');
            $table->string('attendance_method')->default('MANUAL')->after('attendance_long'); // MANUAL, QR, GPS
            $table->float('attendance_distance')->nullable()->after('attendance_method');
            $table->foreignId('ronda_location_id')->nullable()->after('attendance_distance')->constrained('ronda_locations')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('ronda_participants', function (Blueprint $table) {
            $table->dropForeign(['ronda_location_id']);
            $table->dropColumn(['attendance_lat', 'attendance_long', 'attendance_method', 'attendance_distance', 'ronda_location_id']);
        });

        Schema::dropIfExists('ronda_locations');
    }
};
