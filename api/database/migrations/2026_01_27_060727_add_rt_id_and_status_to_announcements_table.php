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
        Schema::table('announcements', function (Blueprint $table) {
            $table->foreignId('rt_id')->nullable()->after('id')->constrained('wilayah_rt')->onDelete('cascade');
            $table->enum('status', ['DRAFT', 'PUBLISHED'])->default('DRAFT')->after('image_url');
            $table->dropColumn('is_active');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('announcements', function (Blueprint $table) {
            $table->dropForeign(['rt_id']);
            $table->dropColumn(['rt_id', 'status']);
            $table->boolean('is_active')->default(true);
        });
    }
};
