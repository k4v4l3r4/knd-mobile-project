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
        Schema::create('ronda_fines', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('rt_id');
            $table->unsignedBigInteger('user_id');
            $table->unsignedBigInteger('ronda_schedule_id');
            $table->string('fine_type'); // TIDAK_HADIR, TELAT, PULANG_CEPAT
            $table->integer('amount');
            $table->enum('status', ['UNPAID', 'PAID'])->default('UNPAID');
            $table->timestamp('generated_at')->useCurrent();
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();

            $table->foreign('rt_id')->references('id')->on('wilayah_rt')->onDelete('cascade');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('ronda_schedule_id')->references('id')->on('ronda_schedules')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ronda_fines');
    }
};
