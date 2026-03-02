<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->string('flip_transaction_id')->nullable()->after('payment_meta');
            $table->timestamp('payment_received_at')->nullable()->after('flip_transaction_id');
        });

        // Update ENUM to include PAYMENT_RECEIVED
        // Existing: 'DRAFT', 'UNPAID', 'PAID', 'CANCELED', 'REFUNDED', 'FAILED'
        // New: 'PAYMENT_RECEIVED'
        DB::statement("ALTER TABLE invoices DROP CONSTRAINT invoices_status_check"); 
        DB::statement("ALTER TABLE invoices ADD CONSTRAINT invoices_status_check CHECK (status IN ('DRAFT', 'UNPAID', 'PAYMENT_RECEIVED', 'PAID', 'CANCELED', 'REFUNDED', 'FAILED'))");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropColumn(['flip_transaction_id', 'payment_received_at']);
        });

        // Revert status check
        DB::statement("ALTER TABLE invoices DROP CONSTRAINT invoices_status_check");
        DB::statement("ALTER TABLE invoices ADD CONSTRAINT invoices_status_check CHECK (status IN ('DRAFT', 'UNPAID', 'PAID', 'CANCELED', 'REFUNDED', 'FAILED'))");
    }
};
