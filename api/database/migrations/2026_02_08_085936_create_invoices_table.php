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
        Schema::create('invoices', function (Blueprint $table) {
            $table->id();
            $table->string('invoice_number')->unique(); // e.g., INV-2026-000123
            
            $table->unsignedBigInteger('tenant_id'); // The tenant associated with this invoice (could be RT or RW)
            $table->unsignedBigInteger('billing_owner_id'); // The actual payer (RT or RW tenant_id)
            
            $table->enum('invoice_type', ['SUBSCRIPTION', 'LIFETIME']);
            $table->string('plan_code'); // BASIC_RT, BASIC_RW, LIFETIME_RW
            
            $table->unsignedBigInteger('subscription_id')->nullable();
            
            $table->decimal('amount', 15, 2);
            $table->string('currency')->default('IDR');
            
            $table->enum('status', ['DRAFT', 'UNPAID', 'PAID', 'CANCELED', 'REFUNDED'])->default('UNPAID');
            
            $table->dateTime('service_period_start')->nullable();
            $table->dateTime('service_period_end')->nullable();
            
            $table->dateTime('issued_at');
            $table->dateTime('due_at')->nullable();
            $table->dateTime('paid_at')->nullable();
            
            $table->enum('payment_method', ['MANUAL', 'TRANSFER', 'GATEWAY'])->default('MANUAL');
            $table->string('payment_reference')->nullable();
            
            $table->text('notes')->nullable();
            $table->timestamps();

            // Foreign Keys
            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('billing_owner_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('subscription_id')->references('id')->on('subscriptions')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('invoices');
    }
};
