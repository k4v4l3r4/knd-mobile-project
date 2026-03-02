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
        Schema::table('invoices', function (Blueprint $table) {
            $table->enum('payment_mode', ['SPLIT', 'CENTRALIZED'])->default('CENTRALIZED')->after('status');
            $table->enum('payment_provider', ['FLIP', 'DANA', 'XENDIT', 'MIDTRANS', 'MANUAL'])->default('MANUAL')->after('payment_mode');
        });

        Schema::create('invoice_revenue_splits', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('invoice_id');
            $table->enum('target_type', ['PLATFORM', 'RW']);
            $table->unsignedBigInteger('target_tenant_id')->nullable(); // Nullable for PLATFORM
            $table->decimal('amount', 15, 2);
            $table->timestamps();

            $table->foreign('invoice_id')->references('id')->on('invoices')->onDelete('cascade');
            // foreign key for target_tenant_id if strictly referencing tenants, but might be platform
            // $table->foreign('target_tenant_id')->references('id')->on('tenants'); 
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('invoice_revenue_splits');

        Schema::table('invoices', function (Blueprint $table) {
            $table->dropColumn(['payment_mode', 'payment_provider']);
        });
    }
};
