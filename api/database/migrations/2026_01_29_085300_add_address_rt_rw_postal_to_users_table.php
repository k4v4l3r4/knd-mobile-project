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
        Schema::table('users', function (Blueprint $table) {
            $table->string('address_rt', 5)->nullable()->after('block');
            $table->string('address_rw', 5)->nullable()->after('address_rt');
            $table->string('postal_code', 10)->nullable()->after('address_ktp');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['address_rt', 'address_rw', 'postal_code']);
        });
    }
};
