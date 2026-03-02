<?php 
use Illuminate\Database\Migrations\Migration; 
use Illuminate\Database\Schema\Blueprint; 
use Illuminate\Support\Facades\Schema; 

return new class extends Migration { 
    public function up(): void { 
        // Update Tabel Wilayah RT (Profil) 
        if (!Schema::hasColumn('wilayah_rt', 'rt_name')) { 
            Schema::table('wilayah_rt', function (Blueprint $table) { 
                $table->string('rt_name')->nullable(); 
                $table->string('address')->nullable(); 
                $table->string('postal_code')->nullable(); 
                $table->string('logo_url')->nullable(); 
                $table->string('structure_image_url')->nullable(); 
            }); 
        } 
        // Tabel Wallets (Kas & Bank) 
        if (!Schema::hasTable('wallets')) {
            Schema::create('wallets', function (Blueprint $table) { 
                $table->id(); 
                $table->unsignedBigInteger('rt_id'); 
                $table->string('name'); 
                $table->enum('type', ['CASH', 'BANK']); 
                $table->string('bank_name')->nullable(); 
                $table->string('account_number')->nullable(); 
                $table->decimal('balance', 15, 2)->default(0); 
                $table->timestamps(); 
            }); 
        }
        // Tabel Activity Categories 
        if (!Schema::hasTable('activity_categories')) {
            Schema::create('activity_categories', function (Blueprint $table) { 
                $table->id(); 
                $table->unsignedBigInteger('rt_id'); 
                $table->string('name'); 
                $table->text('description')->nullable(); 
                $table->timestamps(); 
            }); 
        }
    } 
    public function down(): void { 
        Schema::dropIfExists('activity_categories'); 
        Schema::dropIfExists('wallets'); 
        // Dropping columns from wilayah_rt is tricky if we don't know if they existed before
        // But for this task, we can skip it or try to drop them
        Schema::table('wilayah_rt', function (Blueprint $table) {
            $table->dropColumn(['rt_name', 'address', 'postal_code', 'logo_url', 'structure_image_url']);
        });
    } 
};