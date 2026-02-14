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
        Schema::table('products', function (Blueprint $table) {
            $table->unsignedBigInteger('rt_id')->after('id')->nullable(); // Made nullable initially to avoid errors with existing data, can be filled later
            $table->boolean('is_available')->default(true)->after('image_url');
            
            // Drop unused columns if they exist (based on new requirements)
            // But checking first is better practice, or just leaving them.
            // For now, we add what's requested.
            
            $table->index('rt_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn(['rt_id', 'is_available']);
        });
    }
};
