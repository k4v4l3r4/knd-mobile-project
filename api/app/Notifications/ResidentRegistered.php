<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ResidentRegistered extends Notification
{
    use Queueable;

    public $user;
    public $message;

    /**
     * Create a new notification instance.
     */
    public function __construct($user, $message = null)
    {
        $this->user = $user;
        $this->message = $message ?? "Warga baru {$user->name} telah terdaftar.";
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'id' => $this->id,
            'title' => 'Warga Baru Terdaftar',
            'message' => $this->message,
            'text' => $this->message,
            'url' => null,
            'type' => 'INFO',
            'user_id' => $this->user->id,
            'user_name' => $this->user->name,
        ];
    }
    
    /**
     * Get the database representation of the notification.
     * (Optional, falls back to toArray if not present)
     */
    public function toDatabase(object $notifiable): array
    {
        return $this->toArray($notifiable);
    }
}
