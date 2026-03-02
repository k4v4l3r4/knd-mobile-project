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
            $table->enum('deposit_status', ['UNPAID', 'PAID', 'REFUNDED', 'USED'])->default('UNPAID')->after('deposit_amount');
            $table->text('deposit_notes')->nullable()->after('deposit_status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('boarding_tenants', function (Blueprint $table) {
            $table->dropColumn(['deposit_status', 'deposit_notes']);
        });
    }
};
