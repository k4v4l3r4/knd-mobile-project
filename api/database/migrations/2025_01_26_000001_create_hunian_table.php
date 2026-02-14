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
        Schema::create('hunian', function (Blueprint $table) {
            $table->id();
            $table->foreignId('rt_id')->constrained('wilayah_rt');
            $table->foreignId('owner_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('address');
            $table->decimal('lat', 10, 8)->nullable();
            $table->decimal('long', 11, 8)->nullable();
            $table->enum('type', ['RUMAH', 'KOST', 'USAHA'])->default('RUMAH');
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('hunian');
    }
};
