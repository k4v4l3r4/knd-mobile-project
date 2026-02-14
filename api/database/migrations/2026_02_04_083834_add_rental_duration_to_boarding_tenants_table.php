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
            $table->integer('rental_duration')->default(1)->after('due_date')->comment('Duration in months');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('boarding_tenants', function (Blueprint $table) {
            $table->dropColumn('rental_duration');
        });
    }
};
