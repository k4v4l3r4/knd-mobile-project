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
        // Truncate transactions to avoid FK violations since wallets is new/empty
        \Illuminate\Support\Facades\DB::table('transactions')->truncate();

        Schema::table('transactions', function (Blueprint $table) {
            // Drop foreign key to finance_accounts
            $table->dropForeign(['account_id']);
            
            // Add foreign key to wallets
            // We assume account_id is the column name
            $table->foreign('account_id')->references('id')->on('wallets')->cascadeOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropForeign(['account_id']);
            // We can't easily restore the old FK because finance_accounts might be gone or we don't want to link back
        });
    }
};
