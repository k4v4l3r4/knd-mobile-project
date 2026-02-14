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
            $table->foreignId('store_id')->nullable()->constrained()->nullOnDelete()->after('user_id');
            // Remove existing status if any (user asked to remove verified_at or status)
            // But since I don't know if they exist, I will check first or just ignore.
            // If the user said "Hapus kolom status", I should try to drop it.
            if (Schema::hasColumn('products', 'status')) {
                $table->dropColumn('status');
            }
            if (Schema::hasColumn('products', 'verified_at')) {
                $table->dropColumn('verified_at');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropForeign(['store_id']);
            $table->dropColumn('store_id');
            $table->string('status')->default('pending'); // Fallback
        });
    }
};
