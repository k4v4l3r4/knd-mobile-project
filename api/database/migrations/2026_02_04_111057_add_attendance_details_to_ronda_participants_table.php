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
        Schema::table('ronda_participants', function (Blueprint $table) {
            $table->timestamp('attendance_at')->nullable()->after('status');
            $table->boolean('is_fined')->default(false)->after('attendance_at');
            $table->decimal('fine_amount', 10, 2)->nullable()->after('is_fined');
            $table->text('notes')->nullable()->after('fine_amount');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('ronda_participants', function (Blueprint $table) {
            $table->dropColumn(['attendance_at', 'is_fined', 'fine_amount', 'notes']);
        });
    }
};
