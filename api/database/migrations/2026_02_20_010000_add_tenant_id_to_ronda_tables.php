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
        if (Schema::hasTable('ronda_locations')) {
            Schema::table('ronda_locations', function (Blueprint $table) {
                if (!Schema::hasColumn('ronda_locations', 'tenant_id')) {
                    $table->unsignedBigInteger('tenant_id')->nullable()->after('rt_id');
                    $table->foreign('tenant_id')
                        ->references('id')
                        ->on('tenants')
                        ->onDelete('cascade');
                }
            });
        }

        if (Schema::hasTable('ronda_fine_settings')) {
            Schema::table('ronda_fine_settings', function (Blueprint $table) {
                if (!Schema::hasColumn('ronda_fine_settings', 'tenant_id')) {
                    $table->unsignedBigInteger('tenant_id')->nullable()->after('rt_id');
                    $table->foreign('tenant_id')
                        ->references('id')
                        ->on('tenants')
                        ->onDelete('cascade');
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('ronda_locations')) {
            Schema::table('ronda_locations', function (Blueprint $table) {
                if (Schema::hasColumn('ronda_locations', 'tenant_id')) {
                    $table->dropForeign(['tenant_id']);
                    $table->dropColumn('tenant_id');
                }
            });
        }

        if (Schema::hasTable('ronda_fine_settings')) {
            Schema::table('ronda_fine_settings', function (Blueprint $table) {
                if (Schema::hasColumn('ronda_fine_settings', 'tenant_id')) {
                    $table->dropForeign(['tenant_id']);
                    $table->dropColumn('tenant_id');
                }
            });
        }
    }
};

