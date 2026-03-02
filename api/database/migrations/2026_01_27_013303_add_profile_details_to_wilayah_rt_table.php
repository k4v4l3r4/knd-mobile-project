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
            // Cek dulu, kalau kolom BELUM ada, baru buat
            if (!Schema::hasColumn('wilayah_rt', 'rt_name')) {
                $table->string('rt_name')->nullable();
            }
            if (!Schema::hasColumn('wilayah_rt', 'address')) {
                $table->text('address')->nullable();
            }
            if (!Schema::hasColumn('wilayah_rt', 'province')) {
                $table->string('province')->nullable();
            }
            if (!Schema::hasColumn('wilayah_rt', 'city')) {
                $table->string('city')->nullable();
            }
            if (!Schema::hasColumn('wilayah_rt', 'district')) {
                $table->string('district')->nullable();
            }
            if (!Schema::hasColumn('wilayah_rt', 'subdistrict')) {
                $table->string('subdistrict')->nullable();
            }
            if (!Schema::hasColumn('wilayah_rt', 'rw_number')) {
                $table->string('rw_number', 5)->nullable();
            }
            // Note: rt_number might already exist from create_wilayah_rt_table, check carefully
            if (!Schema::hasColumn('wilayah_rt', 'rt_number')) {
                $table->string('rt_number', 5)->nullable();
            } else {
                 // It might be integer or string, ensuring compatibility if needed
                 // But for now we just skip if exists
            }
            if (!Schema::hasColumn('wilayah_rt', 'logo_url')) {
                $table->string('logo_url')->nullable();
            }
            if (!Schema::hasColumn('wilayah_rt', 'structure_image_url')) {
                $table->string('structure_image_url')->nullable();
            }
             if (!Schema::hasColumn('wilayah_rt', 'postal_code')) {
                $table->string('postal_code')->nullable();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('wilayah_rt', function (Blueprint $table) {
            // We can drop columns if needed, but safe down is usually empty for additive migrations in dev
        });
    }
};
