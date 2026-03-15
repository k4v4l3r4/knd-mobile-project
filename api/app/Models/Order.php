<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Carbon\Carbon;
use App\Models\User;

/**
 * @property User $user
 * @property \Illuminate\Database\Eloquent\Collection $items
 */
class Order extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'order_number',
        'status',
        'subtotal',
        'shipping_fee',
        'service_fee',
        'app_fee',
        'discount',
        'total',
        'notes',
        'courier_info',
        'paid_at',
        'shipped_at',
        'delivered_at',
        'completed_at',
        'cancelled_at',
        'payment_method',
        'payment_instruction_id',
    ];

    protected $casts = [
        'courier_info' => 'array',
        'subtotal' => 'decimal:2',
        'shipping_fee' => 'decimal:2',
        'service_fee' => 'decimal:2',
        'app_fee' => 'decimal:2',
        'discount' => 'decimal:2',
        'total' => 'decimal:2',
        'paid_at' => 'datetime',
        'shipped_at' => 'datetime',
        'delivered_at' => 'datetime',
        'completed_at' => 'datetime',
        'cancelled_at' => 'datetime',
    ];

    // Status constants
    const STATUS_PENDING_PAYMENT = 'PENDING_PAYMENT';
    const STATUS_WAITING_CONFIRMATION = 'WAITING_CONFIRMATION';
    const STATUS_PAID = 'PAID';
    const STATUS_PROCESSING = 'PROCESSING';
    const STATUS_SHIPPED = 'SHIPPED';
    const STATUS_DELIVERED = 'DELIVERED';
    const STATUS_COMPLETED = 'COMPLETED';
    const STATUS_CANCELLED = 'CANCELLED';

    // Human-readable status labels
    public static function getStatusLabels(): array
    {
        return [
            self::STATUS_PENDING_PAYMENT => 'Menunggu Pembayaran',
            self::STATUS_WAITING_CONFIRMATION => 'Menunggu Konfirmasi',
            self::STATUS_PAID => 'Sudah Dibayar',
            self::STATUS_PROCESSING => 'Diproses',
            self::STATUS_SHIPPED => 'Dikirim',
            self::STATUS_DELIVERED => 'Diterima',
            self::STATUS_COMPLETED => 'Selesai',
            self::STATUS_CANCELLED => 'Dibatalkan',
        ];
    }

    // Status timeline for display
    public function getStatusTimeline(): array
    {
        $timeline = [];
        $statuses = self::getStatusLabels();
        
        foreach ($statuses as $status => $label) {
            $timestamp = null;
            $isCompleted = false;
            
            switch ($status) {
                case self::STATUS_PENDING_PAYMENT:
                    $timestamp = $this->created_at;
                    $isCompleted = true; // Always completed (order created)
                    break;
                case self::STATUS_WAITING_CONFIRMATION:
                    $timestamp = $this->created_at;
                    $isCompleted = in_array($this->status, [
                        self::STATUS_WAITING_CONFIRMATION,
                        self::STATUS_PAID,
                        self::STATUS_PROCESSING,
                        self::STATUS_SHIPPED,
                        self::STATUS_DELIVERED,
                        self::STATUS_COMPLETED,
                    ]);
                    break;
                case self::STATUS_PAID:
                    $timestamp = $this->paid_at;
                    $isCompleted = $this->paid_at !== null;
                    break;
                case self::STATUS_PROCESSING:
                    $timestamp = $this->updated_at;
                    $isCompleted = in_array($this->status, [
                        self::STATUS_PROCESSING,
                        self::STATUS_SHIPPED,
                        self::STATUS_DELIVERED,
                        self::STATUS_COMPLETED,
                    ]);
                    break;
                case self::STATUS_SHIPPED:
                    $timestamp = $this->shipped_at;
                    $isCompleted = $this->shipped_at !== null;
                    break;
                case self::STATUS_DELIVERED:
                    $timestamp = $this->delivered_at;
                    $isCompleted = $this->delivered_at !== null;
                    break;
                case self::STATUS_COMPLETED:
                    $timestamp = $this->completed_at;
                    $isCompleted = $this->completed_at !== null;
                    break;
                case self::STATUS_CANCELLED:
                    $timestamp = $this->cancelled_at;
                    $isCompleted = $this->cancelled_at !== null;
                    break;
            }
            
            $timeline[] = [
                'status' => $status,
                'label' => $label,
                'timestamp' => $timestamp?->toIso8601String(),
                'is_completed' => $isCompleted,
                'is_current' => $this->status === $status,
            ];
        }
        
        return $timeline;
    }

    /**
     * Get the user who placed the order
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the items in this order
     */
    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    /**
     * Generate unique order number
     */
    public static function generateOrderNumber(): string
    {
        $date = Carbon::now()->format('Ymd');
        $random = strtoupper(substr(md5(uniqid()), 0, 6));
        return "ORD-{$date}-{$random}";
    }

    /**
     * Check if order can be cancelled
     */
    public function canBeCancelled(): bool
    {
        return in_array($this->status, [
            self::STATUS_PENDING_PAYMENT,
            self::STATUS_WAITING_CONFIRMATION,
            self::STATUS_PAID,
        ]);
    }

    /**
     * Update order status with timestamp
     */
    public function updateStatus(string $newStatus): void
    {
        $validStatuses = array_keys(self::getStatusLabels());
        
        if (!in_array($newStatus, $validStatuses)) {
            throw new \InvalidArgumentException("Invalid status: {$newStatus}");
        }
        
        $this->status = $newStatus;
        
        // Set appropriate timestamp
        switch ($newStatus) {
            case self::STATUS_PAID:
                $this->paid_at = now();
                break;
            case self::STATUS_SHIPPED:
                $this->shipped_at = now();
                break;
            case self::STATUS_DELIVERED:
                $this->delivered_at = now();
                break;
            case self::STATUS_COMPLETED:
                $this->completed_at = now();
                break;
            case self::STATUS_CANCELLED:
                $this->cancelled_at = now();
                break;
        }
        
        $this->save();
    }

    /**
     * Scope to get orders by status
     */
    public function scopeByStatus($query, string $status)
    {
        return $query->where('status', $status);
    }

    /**
     * Scope to get active orders (not cancelled)
     */
    public function scopeActive($query)
    {
        return $query->whereNotIn('status', [self::STATUS_CANCELLED]);
    }
}
