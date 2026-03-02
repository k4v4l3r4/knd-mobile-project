<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('wilayah_rt', function (Blueprint $table) {
            $table->string('latitude')->nullable()->after('postal_code');
            $table->string('longitude')->nullable()->after('latitude');
            $table->string('sk_image_url')->nullable()->after('structure_image_url');
        });
    }

    public function down(): void
    {
        Schema::table('wilayah_rt', function (Blueprint $table) {
            $table->dropColumn(['latitude', 'longitude', 'sk_image_url']);
        });
    }
};
