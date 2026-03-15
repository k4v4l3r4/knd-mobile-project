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
        Schema::create('order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->onDelete('cascade');
            $table->foreignId('product_id')->constrained()->onDelete('cascade');
            $table->string('product_name'); // Snapshot at time of order
            $table->integer('quantity')->default(1);
            $table->decimal('price', 15, 2); // Price at time of order
            $table->decimal('subtotal', 15, 2);
            
            $table->json('product_snapshot')->nullable(); // Full product data snapshot
            $table->json('variant_options')->nullable(); // Selected variants
            
            $table->text('notes')->nullable(); // Catatan per item
            
            $table->timestamps();
            
            $table->index('order_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('order_items');
    }
};
