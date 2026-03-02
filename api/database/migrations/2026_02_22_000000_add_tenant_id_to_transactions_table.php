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
        if (Schema::hasTable('transactions') && !Schema::hasColumn('transactions', 'tenant_id')) {
            Schema::table('transactions', function (Blueprint $table) {
                $table->unsignedBigInteger('tenant_id')->nullable()->index();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('transactions') && Schema::hasColumn('transactions', 'tenant_id')) {
            Schema::table('transactions', function (Blueprint $table) {
                $table->dropColumn('tenant_id');
            });
        }
    }
};

