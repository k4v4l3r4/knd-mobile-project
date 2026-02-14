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
        Schema::table('letters', function (Blueprint $table) {
            $table->string('verification_code')->nullable()->unique()->after('status');
            $table->timestamp('approved_at')->nullable()->after('verification_code');
            $table->foreignId('approver_id')->nullable()->after('approved_at')->constrained('users')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('letters', function (Blueprint $table) {
            $table->dropForeign(['approver_id']);
            $table->dropColumn(['verification_code', 'approved_at', 'approver_id']);
        });
    }
};
