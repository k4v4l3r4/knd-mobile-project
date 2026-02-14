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
        Schema::create('finance_accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('rt_id')->constrained('wilayah_rt')->cascadeOnDelete();
            $table->string('name'); // e.g., "Kas Utama", "Kas PKK"
            $table->text('description')->nullable();
            $table->enum('type', ['CASH', 'BANK'])->default('CASH');
            $table->decimal('balance', 15, 2)->default(0);
            $table->boolean('is_locked')->default(false);
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('finance_accounts');
    }
};
