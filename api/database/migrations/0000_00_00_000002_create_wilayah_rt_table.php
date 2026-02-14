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
        Schema::create('wilayah_rt', function (Blueprint $table) {
            $table->id();
            $table->foreignId('rw_id')->constrained('wilayah_rw')->cascadeOnDelete();
            $table->string('rt_number');
            $table->decimal('kas_balance', 15, 2)->default(0);
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('wilayah_rt');
    }
};
