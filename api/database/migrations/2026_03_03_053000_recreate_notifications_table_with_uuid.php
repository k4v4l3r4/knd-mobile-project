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
        Schema::dropIfExists('notifications');

        Schema::create('notifications', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('type')->default('INFO');
            $table->morphs('notifiable'); // Adds notifiable_id (bigint) and notifiable_type (string)
            $table->text('data')->nullable(); // For JSON data (message, title, etc.)
            $table->timestamp('read_at')->nullable();
            $table->boolean('is_read')->default(false); // Sync with read_at
            
            // Legacy columns support (optional, but good for backward compat if code uses them directly)
            $table->string('title')->nullable();
            $table->text('message')->nullable();
            $table->string('url')->nullable();
            $table->unsignedBigInteger('related_id')->nullable();
            $table->unsignedBigInteger('tenant_id')->nullable(); // Tenant scope
            
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notifications');
    }
};
