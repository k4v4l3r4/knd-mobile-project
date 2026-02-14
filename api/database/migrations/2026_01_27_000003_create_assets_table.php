<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('assets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('rt_id')->constrained('wilayah_rt');
            $table->string('name');
            $table->text('description')->nullable();
            $table->integer('total_quantity')->default(0);
            $table->integer('available_quantity')->default(0);
            $table->enum('condition', ['BAIK', 'RUSAK'])->default('BAIK');
            $table->string('image_url')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('assets');
    }
};
