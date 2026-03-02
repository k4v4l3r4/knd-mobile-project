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
        // Add operating_hours and is_open to stores table
        Schema::table('stores', function (Blueprint $table) {
            $table->boolean('is_open')->default(true)->after('status');
            $table->json('operating_hours')->nullable()->after('is_open');
        });

        // Create product_variants table
        Schema::create('product_variants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->string('name'); // e.g., "Ukuran", "Topping"
            $table->string('type')->default('CHOICE'); // CHOICE (single), ADDON (multiple)
            $table->decimal('price', 12, 2)->default(0); // Base price modifier if any, usually 0
            $table->boolean('is_required')->default(false);
            $table->json('options')->nullable(); // [{"name": "L", "price": 5000}, {"name": "XL", "price": 10000}]
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('stores', function (Blueprint $table) {
            $table->dropColumn(['is_open', 'operating_hours']);
        });

        Schema::dropIfExists('product_variants');
    }
};
