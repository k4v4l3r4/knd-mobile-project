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
        Schema::table('notifications', function (Blueprint $table) {
            // Check if user_id exists before trying to modify it
            if (Schema::hasColumn('notifications', 'user_id')) {
                // Drop foreign key constraint if it exists
                // We need to know the constraint name, usually notifications_user_id_foreign
                // Safest way is to drop it by array
                try {
                    $table->dropForeign(['user_id']);
                } catch (\Exception $e) {
                    // Ignore if FK doesn't exist
                }

                // Rename user_id to notifiable_id
                $table->renameColumn('user_id', 'notifiable_id');
            }

            // Add notifiable_type if it doesn't exist
            if (!Schema::hasColumn('notifications', 'notifiable_type')) {
                $table->string('notifiable_type')->default('App\\Models\\User')->after('id');
            }
            
            // Add index for polymorphic relation
            $table->index(['notifiable_type', 'notifiable_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('notifications', function (Blueprint $table) {
            if (Schema::hasColumn('notifications', 'notifiable_id')) {
                $table->renameColumn('notifiable_id', 'user_id');
                $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            }

            if (Schema::hasColumn('notifications', 'notifiable_type')) {
                $table->dropColumn('notifiable_type');
            }
            
            $table->dropIndex(['notifiable_type', 'notifiable_id']);
        });
    }
};
