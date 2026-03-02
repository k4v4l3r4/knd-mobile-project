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
        Schema::table('tenants', function (Blueprint $table) {
            $table->string('billing_mode')->default('RT')->after('billing_owner_id'); // RT or RW
            $table->timestamp('joined_rw_at')->nullable()->after('billing_mode');
        });

        Schema::table('subscriptions', function (Blueprint $table) {
            $table->string('covered_scope')->default('RT_ONLY')->after('status'); // RT_ONLY or RW_ALL
            $table->string('source')->default('RT_SELF')->after('covered_scope'); // RT_SELF or RW_MASTER
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->dropColumn(['billing_mode', 'joined_rw_at']);
        });

        Schema::table('subscriptions', function (Blueprint $table) {
            $table->dropColumn(['covered_scope', 'source']);
        });
    }
};
