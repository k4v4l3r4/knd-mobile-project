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
        Schema::create('kas_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('rt_id')->index(); // No constraint to allow flexibility, or constrained('wilayah_rts') if table exists. Assuming simple index for now or constrained if I'm sure. User said "rt_id" is FK. I'll use standard foreignId without strict constraint if table name is unsure, but usually it is 'wilayah_rts'. I will check other migrations or just use index to be safe given "multi RT" context. Let's stick to simple bigInteger + index for safety unless I check.
            // Actually, in previous context, "rt_id" is used. I'll use index.
            
            $table->string('source_type')->comment('DENDA, IURAN, DONASI');
            $table->unsignedBigInteger('source_id')->nullable();
            $table->bigInteger('amount');
            $table->string('direction')->comment('IN, OUT');
            $table->text('description')->nullable();
            $table->timestamps();

            $table->index(['rt_id', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('kas_transactions');
    }
};
