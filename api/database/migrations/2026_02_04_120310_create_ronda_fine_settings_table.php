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
        Schema::create('ronda_fine_settings', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('rt_id');
            $table->enum('fine_type', ['TIDAK_HADIR', 'TELAT', 'PULANG_CEPAT']);
            $table->integer('amount');
            $table->integer('tolerance_minutes')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->foreign('rt_id')->references('id')->on('wilayah_rt')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ronda_fine_settings');
    }
};
