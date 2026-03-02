<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('emergency_alerts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->enum('type', ['KEBAKARAN', 'MALING', 'MEDIS', 'LAINNYA']);
            $table->enum('status', ['OPEN', 'RESOLVED'])->default('OPEN');
            $table->decimal('latitude', 10, 8)->nullable();
            $table->decimal('longitude', 11, 8)->nullable();
            $table->timestamps();
        });

        Schema::create('emergency_contacts', function (Blueprint $table) {
            $table->id();
            $table->string('name'); // e.g., Polsek, RSUD
            $table->string('number');
            $table->string('type'); // POLISI, RS, DAMKAR, SECURITY
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('emergency_contacts');
        Schema::dropIfExists('emergency_alerts');
    }
};
