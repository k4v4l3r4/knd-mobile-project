<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->string('dana_reference_no')->nullable()->after('proof_url');
            $table->string('payment_url')->nullable()->after('dana_reference_no');
        });
    }

    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropColumn(['dana_reference_no', 'payment_url']);
        });
    }
};

