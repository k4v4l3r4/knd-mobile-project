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
        Schema::table('boarding_tenants', function (Blueprint $table) {
            if (!Schema::hasColumn('boarding_tenants', 'payment_status')) {
                $table->enum('payment_status', ['UNPAID', 'PAID'])->default('UNPAID')->after('deposit_notes');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('boarding_tenants', function (Blueprint $table) {
            if (Schema::hasColumn('boarding_tenants', 'payment_status')) {
                $table->dropColumn('payment_status');
            }
        });
    }
};
