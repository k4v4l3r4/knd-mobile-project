<?php

namespace App\Observers;

use App\Models\Notification;
use App\Models\User;
use App\Services\FCMService;
use Illuminate\Support\Facades\Log;

class NotificationObserver
{
    protected $fcmService;

    public function __construct(FCMService $fcmService)
    {
        $this->fcmService = $fcmService;
    }

    /**
     * Handle the Notification "created" event.
     */
    public function created(Notification $notification): void
    {
        try {
            // Find the user associated with this notification
            $user = null;
            if ($notification->notifiable_type === User::class) {
                $user = User::find($notification->notifiable_id);
            } elseif ($notification->user_id) { // Backward compatibility
                $user = User::find($notification->user_id);
            }

            if ($user && $user->fcm_token) {
                $title = $notification->title ?? 'New Notification';
                $body = $notification->message ?? '';
                
                // Prepare data payload (convert all to strings)
                $data = [
                    'notification_id' => (string) $notification->id,
                    'type' => (string) ($notification->type ?? 'DEFAULT'),
                    'related_id' => (string) ($notification->related_id ?? ''),
                    'url' => (string) ($notification->url ?? ''),
                    'click_action' => 'FLUTTER_NOTIFICATION_CLICK', // Common for Flutter/RN
                ];

                // Send FCM
                $this->fcmService->sendNotification($user->fcm_token, $title, $body, $data);
            }
        } catch (\Exception $e) {
            Log::error('NotificationObserver Error: ' . $e->getMessage());
        }
    }
}
