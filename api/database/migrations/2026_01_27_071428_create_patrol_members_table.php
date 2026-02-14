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
        Schema::create('patrol_members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('patrol_schedule_id')->constrained('patrol_schedules')->onDelete('cascade');
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->timestamps();

            // Prevent duplicate assignment for same schedule
            $table->unique(['patrol_schedule_id', 'user_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('patrol_members');
    }
};
