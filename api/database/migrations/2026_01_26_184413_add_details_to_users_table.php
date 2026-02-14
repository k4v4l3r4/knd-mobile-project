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
            $table->string('kk_number')->nullable()->after('nik');
            $table->enum('gender', ['L', 'P'])->nullable()->after('kk_number');
            $table->string('place_of_birth')->nullable()->after('gender');
            $table->date('date_of_birth')->nullable()->after('place_of_birth');
            $table->text('address')->nullable()->after('date_of_birth');
            $table->string('religion')->nullable()->after('address');
            $table->enum('marital_status', ['BELUM_KAWIN', 'KAWIN', 'CERAI_HIDUP', 'CERAI_MATI'])->nullable()->after('religion');
            $table->string('occupation')->nullable()->after('marital_status');
            $table->enum('status_in_family', ['KEPALA_KELUARGA', 'ISTRI', 'ANAK', 'FAMILI_LAIN'])->nullable()->after('occupation');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'kk_number',
                'gender',
                'place_of_birth',
                'date_of_birth',
                'address',
                'religion',
                'marital_status',
                'occupation',
                'status_in_family'
            ]);
        });
    }
};
