<?php

namespace App\Services;

use Kreait\Firebase\Factory;
use Kreait\Firebase\Messaging\CloudMessage;
use Kreait\Firebase\Messaging\Notification;
use Illuminate\Support\Facades\Log;

class FirebaseNotificationService
{
    protected $messaging;

    public function __construct()
    {
        try {
            // Initialize Firebase with service account
            $factory = (new Factory)
                ->withServiceAccount(base_path(env('FIREBASE_CREDENTIALS', 'firebase-credentials.json')));
            
            $this->messaging = $factory->createMessaging();
        } catch (\Exception $e) {
            Log::error('Firebase initialization failed: ' . $e->getMessage());
            $this->messaging = null;
        }
    }

    /**
     * Send push notification to a single device token
     */
    public function sendToDevice(string $deviceToken, string $title, string $body, array $data = []): bool
    {
        if (!$this->messaging) {
            Log::warning('Firebase messaging not initialized, skipping notification');
            return false;
        }

        try {
            $message = CloudMessage::new()
                ->withToken($deviceToken)
                ->withNotification(Notification::create($title, $body))
                ->withData($data);

            $this->messaging->send($message);
            
            Log::info('Firebase notification sent successfully', [
                'token' => substr($deviceToken, 0, 20) . '...',
                'title' => $title,
                'data' => $data,
            ]);

            return true;
        } catch (\Exception $e) {
            Log::error('Firebase notification failed: ' . $e->getMessage(), [
                'token' => substr($deviceToken, 0, 20) . '...',
                'title' => $title,
            ]);

            return false;
        }
    }

    /**
     * Send push notification to multiple device tokens (batch)
     */
    public function sendToDevices(array $deviceTokens, string $title, string $body, array $data = []): array
    {
        if (!$this->messaging || empty($deviceTokens)) {
            return ['success' => 0, 'failure' => count($deviceTokens)];
        }

        $messages = [];
        foreach ($deviceTokens as $token) {
            $messages[] = CloudMessage::new()
                ->withToken($token)
                ->withNotification(Notification::create($title, $body))
                ->withData($data);
        }

        try {
            $report = $this->messaging->sendAll($messages);

            $result = [
                'success' => $report->successes()->count(),
                'failure' => $report->failures()->count(),
            ];

            Log::info('Firebase batch notification sent', $result);

            return $result;
        } catch (\Exception $e) {
            Log::error('Firebase batch notification failed: ' . $e->getMessage());
            
            return ['success' => 0, 'failure' => count($deviceTokens)];
        }
    }

    /**
     * Send notification to a topic (e.g., all users in a specific RT)
     */
    public function sendToTopic(string $topic, string $title, string $body, array $data = []): bool
    {
        if (!$this->messaging) {
            return false;
        }

        try {
            $message = CloudMessage::new()
                ->withTopic($topic)
                ->withNotification(Notification::create($title, $body))
                ->withData($data);

            $this->messaging->send($message);

            Log::info('Firebase topic notification sent', [
                'topic' => $topic,
                'title' => $title,
            ]);

            return true;
        } catch (\Exception $e) {
            Log::error('Firebase topic notification failed: ' . $e->getMessage());
            
            return false;
        }
    }

    /**
     * Send order status update notification
     */
    public function sendOrderStatusNotification(
        string $deviceToken,
        string $orderNumber,
        string $oldStatus,
        string $newStatus,
        int $orderId
    ): bool {
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
        $body = "Status pesanan Anda #{$orderNumber} telah berubah menjadi " . ($statusLabels[$newStatus] ?? $newStatus);

        $data = [
            'type' => 'order_status_update',
            'order_id' => (string) $orderId,
            'order_number' => $orderNumber,
            'old_status' => $oldStatus,
            'new_status' => $newStatus,
            'timestamp' => now()->toIso8601String(),
        ];

        return $this->sendToDevice($deviceToken, $title, $body, $data);
    }

    /**
     * Send payment confirmation notification
     */
    public function sendPaymentConfirmation(
        string $deviceToken,
        string $orderNumber,
        int $orderId
    ): bool {
        $title = 'Pembayaran Dikonfirmasi';
        $body = "Pembayaran untuk pesanan #{$orderNumber} telah dikonfirmasi. Pesanan akan segera diproses.";

        $data = [
            'type' => 'payment_confirmed',
            'order_id' => (string) $orderId,
            'order_number' => $orderNumber,
            'timestamp' => now()->toIso8601String(),
        ];

        return $this->sendToDevice($deviceToken, $title, $body, $data);
    }

    /**
     * Send shipping notification with courier info
     */
    public function sendShippingNotification(
        string $deviceToken,
        string $orderNumber,
        string $courierName,
        ?string $trackingNumber,
        int $orderId
    ): bool {
        $title = 'Pesanan Dikirim';
        $body = "Pesanan #{$orderNumber} sedang dikirim via {$courierName}. ";
        
        if ($trackingNumber) {
            $body .= "No. Resi: {$trackingNumber}";
        }

        $data = [
            'type' => 'order_shipped',
            'order_id' => (string) $orderId,
            'order_number' => $orderNumber,
            'courier_name' => $courierName,
            'tracking_number' => $trackingNumber ?? '',
            'timestamp' => now()->toIso8601String(),
        ];

        return $this->sendToDevice($deviceToken, $title, $body, $data);
    }
}
