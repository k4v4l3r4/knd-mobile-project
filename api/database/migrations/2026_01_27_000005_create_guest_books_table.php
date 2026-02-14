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
        // Dropping if exists to ensure clean state for this feature request
        Schema::dropIfExists('guest_books');

        Schema::create('guest_books', function (Blueprint $table) {
            $table->id();
            $table->foreignId('rt_id')->constrained('wilayah_rt')->onDelete('cascade');
            $table->foreignId('host_user_id')->nullable()->constrained('users')->onDelete('set null'); // Warga yang dikunjungi
            $table->string('guest_name');
            $table->string('guest_phone')->nullable();
            $table->string('origin')->nullable(); // Asal/Alamat
            $table->string('purpose'); // Keperluan
            $table->dateTime('visit_date'); // Tanggal & Jam berkunjung
            $table->string('id_card_photo')->nullable(); // Foto KTP
            $table->enum('status', ['CHECK_IN', 'CHECK_OUT'])->default('CHECK_IN');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('guest_books');
    }
};
