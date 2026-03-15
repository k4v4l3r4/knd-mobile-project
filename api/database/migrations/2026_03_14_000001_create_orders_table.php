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
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('order_number')->unique();
            $table->enum('status', [
                'PENDING_PAYMENT',      // Menunggu Pembayaran
                'WAITING_CONFIRMATION', // Menunggu Konfirmasi Admin
                'PAID',                 // Sudah Dibayar
                'PROCESSING',           // Diproses
                'SHIPPED',              // Dikirim
                'DELIVERED',            // Diterima
                'COMPLETED',            // Selesai
                'CANCELLED',            // Dibatalkan
            ])->default('PENDING_PAYMENT');
            
            $table->decimal('subtotal', 15, 2);
            $table->decimal('shipping_fee', 15, 2)->default(0);
            $table->decimal('service_fee', 15, 2)->default(0);
            $table->decimal('app_fee', 15, 2)->default(0);
            $table->decimal('discount', 15, 2)->default(0);
            $table->decimal('total', 15, 2);
            
            $table->text('notes')->nullable(); // Catatan untuk seller (per item)
            $table->json('courier_info')->nullable(); // {name, phone, type}
            $table->string('tracking_number')->nullable(); // Resi number for REGULER
            $table->string('tracking_link')->nullable(); // Tracking link for INSTANT (Grab/Gojek/Lalamove)
            
            $table->timestamp('paid_at')->nullable();
            $table->timestamp('shipped_at')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            
            $table->string('payment_method')->nullable(); // briva, bcava, gopay
            $table->string('payment_instruction_id')->nullable(); // Flip instruction ID
            
            $table->timestamps();
            
            $table->index(['user_id', 'status']);
            $table->index('order_number');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
