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
            $table->decimal('room_price', 12, 2)->default(0)->after('room_number');
            $table->decimal('deposit_amount', 12, 2)->default(0)->after('room_price');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('boarding_tenants', function (Blueprint $table) {
            $table->dropColumn(['room_price', 'deposit_amount']);
        });
    }
};
