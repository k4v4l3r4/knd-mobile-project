<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Drop tables if they exist to ensure clean slate
        Schema::dropIfExists('asset_loans');
        Schema::dropIfExists('assets');

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

        Schema::create('asset_loans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('asset_id')->constrained()->onDelete('cascade');
            $table->integer('quantity');
            $table->date('loan_date');
            $table->date('return_date')->nullable();
            $table->enum('status', ['PENDING', 'APPROVED', 'RETURNED', 'REJECTED'])->default('PENDING');
            $table->text('admin_note')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('asset_loans');
        Schema::dropIfExists('assets');
    }
};
