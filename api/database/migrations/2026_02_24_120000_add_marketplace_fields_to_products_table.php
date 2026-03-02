<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->unsignedInteger('stock')->nullable()->after('discount_price');
            $table->string('shipping_type')->default('LOCAL')->after('stock');
            $table->decimal('shipping_fee_flat', 12, 2)->nullable()->after('shipping_type');
            $table->text('variant_note')->nullable()->after('description');
            $table->text('specifications')->nullable()->after('variant_note');
            $table->json('labels')->nullable()->after('specifications');
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn([
                'stock',
                'shipping_type',
                'shipping_fee_flat',
                'variant_note',
                'specifications',
                'labels',
            ]);
        });
    }
};

