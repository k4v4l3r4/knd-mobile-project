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
        $tables = [
            'activity_categories',
            'announcement_comments',
            'announcement_likes',
            'asset_loans',
            'bansos_histories',
            'bansos_recipients',
            'boarding_houses',
            'boarding_tenants',
            'emergency_alerts',
            'emergency_contacts',
            'guest_books',
            'letter_types',
            'notifications',
            'patrol_members',
            'patrol_schedules',
            'poll_options',
            'poll_votes',
            'ronda_fines',
            'ronda_fine_settings',
            'ronda_locations',
            'ronda_participants',
            'stores',
            'wallets',
            'products',
            'kas_transactions',
        ];

        foreach ($tables as $table) {
            if (Schema::hasTable($table) && !Schema::hasColumn($table, 'tenant_id')) {
                Schema::table($table, function (Blueprint $table) {
                    $table->unsignedBigInteger('tenant_id')->nullable()->index();
                });
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $tables = [
            'activity_categories',
            'announcement_comments',
            'announcement_likes',
            'asset_loans',
            'bansos_histories',
            'bansos_recipients',
            'boarding_houses',
            'boarding_tenants',
            'emergency_alerts',
            'emergency_contacts',
            'guest_books',
            'letter_types',
            'notifications',
            'patrol_members',
            'patrol_schedules',
            'poll_options',
            'poll_votes',
            'ronda_fines',
            'ronda_fine_settings',
            'ronda_locations',
            'ronda_participants',
            'stores',
            'wallets',
            'products',
            'kas_transactions',
        ];

        foreach ($tables as $table) {
            if (Schema::hasTable($table) && Schema::hasColumn($table, 'tenant_id')) {
                Schema::table($table, function (Blueprint $table) {
                    $table->dropColumn('tenant_id');
                });
            }
        }
    }
};
