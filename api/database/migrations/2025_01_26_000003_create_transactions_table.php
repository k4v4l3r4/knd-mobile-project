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
        Schema::create('transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('rt_id')->constrained('wilayah_rt')->cascadeOnDelete();
            $table->foreignId('account_id')->constrained('finance_accounts')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->enum('type', ['IN', 'OUT']);
            $table->decimal('amount', 15, 2);
            $table->string('category');
            $table->text('description')->nullable();
            $table->date('date')->useCurrent();
            $table->string('proof_url')->nullable();
            $table->enum('status', ['PENDING', 'PAID'])->default('PENDING');
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('transactions');
    }
};
