<?php

namespace App\Notifications;

use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use App\Services\FirebaseNotificationService;

class OrderStatusUpdated extends Notification implements ShouldQueue
{
    use Queueable;

    protected $order;
    protected $oldStatus;
    protected $newStatus;

    /**
     * Create a new notification instance.
     */
    public function __construct(Order $order, string $oldStatus, string $newStatus)
    {
        $this->order = $order;
        $this->oldStatus = $oldStatus;
        $this->newStatus = $newStatus;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database', 'firebase'];
    }

    /**
     * Get the database representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'order_id' => $this->order->id,
            'order_number' => $this->order->order_number,
            'old_status' => $this->oldStatus,
            'new_status' => $this->newStatus,
            'message' => "Status pesanan #{$this->order->order_number} telah berubah menjadi {$this->getStatusLabel($this->newStatus)}",
        ];
    }

    /**
     * Send the notification via Firebase push notification.
     */
    public function toFirebase(object $notifiable): ?array
    {
        // Check if user has device tokens
        if (empty($notifiable->device_tokens)) {
            return null;
        }

        $service = app(FirebaseNotificationService::class);
        
        $statusLabels = [
            'PENDING_PAYMENT' => 'Menunggu Pembayaran',
            'WAITING_CONFIRMATION' => 'Menunggu Konfirmasi',
            'PAID' => 'Sudah Dibayar',
            'PROCESSING' => 'Diproses',
            'SHIPPED' => 'Dikirim',
            'DELIVERED' => 'Diterima',
            'COMPLETED' => 'Selesai',
            'CANCELLED' => 'Dibatalkan',
        ];

        $title = 'Update Pesanan';
        $body = "Status pesanan Anda #{$this->order->order_number} telah berubah menjadi " . 
                ($statusLabels[$this->newStatus] ?? $this->newStatus);

        $data = [
            'type' => 'order_status_update',
            'order_id' => (string) $this->order->id,
            'order_number' => $this->order->order_number,
            'old_status' => $this->oldStatus,
            'new_status' => $this->newStatus,
            'timestamp' => now()->toIso8601String(),
        ];

        // Send to all user's devices
        $deviceTokens = is_array($notifiable->device_tokens) 
            ? $notifiable->device_tokens 
            : json_decode($notifiable->device_tokens, true) ?? [];

        foreach ($deviceTokens as $token) {
            $service->sendToDevice($token, $title, $body, $data);
        }

        return null;
    }

    /**
     * Get status label.
     */
    protected function getStatusLabel(string $status): string
    {
        $labels = [
            'PENDING_PAYMENT' => 'Menunggu Pembayaran',
            'WAITING_CONFIRMATION' => 'Menunggu Konfirmasi',
            'PAID' => 'Sudah Dibayar',
            'PROCESSING' => 'Diproses',
            'SHIPPED' => 'Dikirim',
            'DELIVERED' => 'Diterima',
            'COMPLETED' => 'Selesai',
            'CANCELLED' => 'Dibatalkan',
        ];

        return $labels[$status] ?? $status;
    }
}
