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
        Schema::create('bansos_histories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('recipient_id')->constrained('bansos_recipients')->onDelete('cascade');
            $table->string('program_name');
            $table->date('date_received');
            $table->decimal('amount', 15, 2)->nullable(); // Monetary value if applicable
            $table->string('evidence_photo')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('bansos_histories');
    }
};
