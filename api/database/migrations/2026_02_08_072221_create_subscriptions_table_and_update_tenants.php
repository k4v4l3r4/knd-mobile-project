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
        // 1. Create subscriptions table
        Schema::create('subscriptions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id');
            $table->string('plan_code'); // e.g., BASIC_RW, LIFETIME_RW
            $table->enum('subscription_type', ['SUBSCRIPTION', 'LIFETIME']);
            $table->enum('billing_period', ['MONTHLY', 'YEARLY'])->nullable(); // Nullable for LIFETIME
            $table->decimal('price', 15, 2);
            $table->timestamp('starts_at');
            $table->timestamp('ends_at')->nullable(); // Null for LIFETIME
            $table->enum('status', ['PENDING', 'ACTIVE', 'EXPIRED', 'CANCELED']);
            $table->string('payment_reference')->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
        });

        // 2. Update tenants table
        Schema::table('tenants', function (Blueprint $table) {
            // billing_owner_id (nullable, default = tenant_id if self-paying, but usually RW pays for itself)
            // Ideally it references a User who is the billing contact, or another Tenant? 
            // "Billing terpusat di level RW (single payer)" implies RW pays.
            // Let's assume billing_owner_id references tenant_id of the payer (which is self for RW).
            // Or maybe it refers to a User? The prompt says "billing_owner_id (nullable, default = tenant_id)". 
            // So it likely refers to a Tenant ID (e.g. if RTs are billed by RW, or RW is the payer).
            // Given "Billing terpusat di level RW", RW is the payer.
            $table->unsignedBigInteger('billing_owner_id')->nullable()->after('id');
            
            // Indexes
            $table->foreign('billing_owner_id')->references('id')->on('tenants')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->dropForeign(['billing_owner_id']);
            $table->dropColumn('billing_owner_id');
        });

        Schema::dropIfExists('subscriptions');
    }
};
