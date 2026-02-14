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
        Schema::create('ronda_participants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('schedule_id')->constrained('ronda_schedules')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->enum('status', ['PRESENT', 'ABSENT', 'PENDING'])->default('PENDING'); // Added PENDING as default
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ronda_participants');
    }
};
