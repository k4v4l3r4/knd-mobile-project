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
        Schema::table('products', function (Blueprint $table) {
            $table->string('shopee_url')->nullable()->after('whatsapp');
            $table->string('tokopedia_url')->nullable()->after('shopee_url');
            $table->string('facebook_url')->nullable()->after('tokopedia_url');
            $table->string('instagram_url')->nullable()->after('facebook_url');
            $table->string('tiktok_url')->nullable()->after('instagram_url');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn([
                'shopee_url',
                'tokopedia_url',
                'facebook_url',
                'instagram_url',
                'tiktok_url',
            ]);
        });
    }
};
