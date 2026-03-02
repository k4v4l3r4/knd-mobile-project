<?php

namespace App\Services;

use App\Mail\BillingReminder;
use App\Services\WhatsAppService;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;

class BillingNotificationService
{
    protected $whatsAppService;

    public function __construct(WhatsAppService $whatsAppService)
    {
        $this->whatsAppService = $whatsAppService;
    }

    /**
     * Send Dual Notification (Email + WhatsApp) for Billing Reminder.
     *
     * @param object $user User object (must have email, phone, name)
     * @param string $dueDate Format: YYYY-MM-DD
     * @param string $paymentUrl
     * @param string $supportUrl
     * @return void
     */
    public function sendDualNotification($user, $dueDate, $paymentUrl, $supportUrl)
    {
        Log::info("BillingNotificationService: Sending dual notification to {$user->email} / {$user->phone}");

        // 1. Kirim Email menggunakan Mailable
        try {
            Mail::to($user->email)->send(new BillingReminder(
                $user->name,
                $dueDate,
                $paymentUrl,
                $supportUrl
            ));
            Log::info("BillingNotificationService: Email sent to {$user->email}");
        } catch (\Exception $e) {
            Log::error("BillingNotificationService: Failed to send email to {$user->email}. Error: " . $e->getMessage());
        }

        // 2. Kirim WhatsApp menggunakan WhatsAppService
        try {
            $waMessage = "Halo *{$user->name}*, pengingat layanan Anda akan berakhir pada *{$dueDate}*. Perpanjang sekarang: {$paymentUrl}";
            
            // Using sendText (alias added to WhatsAppService)
            $this->whatsAppService->sendText($user->phone, $waMessage);
            Log::info("BillingNotificationService: WhatsApp sent to {$user->phone}");
        } catch (\Exception $e) {
            Log::error("BillingNotificationService: Failed to send WhatsApp to {$user->phone}. Error: " . $e->getMessage());
        }
    }
}
