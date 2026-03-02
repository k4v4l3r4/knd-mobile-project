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
        Schema::create('tenants', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->enum('level', ['RT', 'RW']);
            $table->enum('tenant_type', ['DEMO', 'LIVE']);
            $table->enum('status', ['DEMO', 'TRIAL', 'ACTIVE', 'EXPIRED']);
            $table->timestamp('trial_start_at')->nullable();
            $table->timestamp('trial_end_at')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tenants');
    }
};
