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
        Schema::create('bansos_recipients', function (Blueprint $table) {
            $table->id();
            $table->foreignId('rt_id')->constrained('wilayah_rt')->onDelete('cascade');
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->string('no_kk')->nullable();
            $table->enum('status', ['LAYAK', 'TIDAK_LAYAK', 'PENDING'])->default('PENDING');
            $table->text('notes')->nullable();
            $table->integer('score')->default(0);
            $table->timestamps();

            // Ensure a user is only listed once per RT for bansos
            $table->unique(['rt_id', 'user_id']); 
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('bansos_recipients');
    }
};
