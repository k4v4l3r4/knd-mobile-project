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
            $table->string('invite_code')->nullable()->unique()->after('rt_name');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('wilayah_rt', function (Blueprint $table) {
            $table->dropColumn('invite_code');
        });
    }
};
