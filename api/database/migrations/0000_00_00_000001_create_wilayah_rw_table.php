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
        Schema::create('wilayah_rw', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('code')->unique();
            $table->enum('subscription_status', ['ACTIVE', 'EXPIRED', 'SUSPENDED'])->default('ACTIVE'); // Expanded enum for safety, user asked for subscription_status
            $table->timestamp('expired_at')->nullable(); // User requested expired_at
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('wilayah_rw');
    }
};
