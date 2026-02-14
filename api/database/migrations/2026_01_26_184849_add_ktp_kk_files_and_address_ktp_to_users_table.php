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
            $table->text('address_ktp')->nullable()->after('address');
            $table->string('ktp_image_path')->nullable()->after('photo_url');
            $table->string('kk_image_path')->nullable()->after('ktp_image_path');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['address_ktp', 'ktp_image_path', 'kk_image_path']);
        });
    }
};
