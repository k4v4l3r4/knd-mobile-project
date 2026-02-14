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
        // 1. Rename finance_accounts to wallets
        if (Schema::hasTable('finance_accounts') && !Schema::hasTable('wallets')) {
            Schema::rename('finance_accounts', 'wallets');
        }

        // 2. Rename activities to activity_categories
        if (Schema::hasTable('activities') && !Schema::hasTable('activity_categories')) {
            Schema::rename('activities', 'activity_categories');
        }

        // 3. Add postal_code to wilayah_rt
        Schema::table('wilayah_rt', function (Blueprint $table) {
            if (!Schema::hasColumn('wilayah_rt', 'postal_code')) {
                $table->string('postal_code')->nullable()->after('subdistrict');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // 1. Rename wallets back to finance_accounts
        if (Schema::hasTable('wallets') && !Schema::hasTable('finance_accounts')) {
            Schema::rename('wallets', 'finance_accounts');
        }

        // 2. Rename activity_categories back to activities
        if (Schema::hasTable('activity_categories') && !Schema::hasTable('activities')) {
            Schema::rename('activity_categories', 'activities');
        }

        // 3. Drop postal_code from wilayah_rt
        Schema::table('wilayah_rt', function (Blueprint $table) {
            if (Schema::hasColumn('wilayah_rt', 'postal_code')) {
                $table->dropColumn('postal_code');
            }
        });
    }
};
