<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrderItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'order_id',
        'product_id',
        'product_name',
        'quantity',
        'price',
        'subtotal',
        'product_snapshot',
        'variant_options',
        'notes',
    ];

    protected $casts = [
        'product_snapshot' => 'array',
        'variant_options' => 'array',
        'quantity' => 'integer',
        'price' => 'decimal:2',
        'subtotal' => 'decimal:2',
    ];

    /**
     * Get the order this item belongs to
     */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    /**
     * Get the product (for reference - product might be deleted)
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /**
     * Get variant options formatted for display
     */
    public function getFormattedVariants(): array
    {
        if (!$this->variant_options) {
            return [];
        }
        
        $formatted = [];
        foreach ($this->variant_options as $groupName => $options) {
            if (is_array($options)) {
                foreach ($options as $option) {
                    $formatted[] = "{$groupName}: {$option['name']}";
                }
            }
        }
        
        return $formatted;
    }
}
