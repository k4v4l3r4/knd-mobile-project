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
        Schema::table('wilayah_rt', function (Blueprint $table) {
            if (!Schema::hasColumn('wilayah_rt', 'contact_phone')) {
                $table->string('contact_phone')->nullable()->after('postal_code');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('wilayah_rt', function (Blueprint $table) {
            if (Schema::hasColumn('wilayah_rt', 'contact_phone')) {
                $table->dropColumn('contact_phone');
            }
        });
    }
};

