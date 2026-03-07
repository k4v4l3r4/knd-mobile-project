<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class WhatsAppService
{
    protected $url;
    protected $apiKey;
    protected $sender;
    protected $authToken;
    
    // Throttling mechanism
    protected static $lastSentAt = 0;
    protected $delaySeconds;

    public function __construct()
    {
        $this->url = config('services.whatsapp.url');
        $this->apiKey = config('services.whatsapp.api_key');
        $this->sender = config('services.whatsapp.sender');
        $this->authToken = config('services.whatsapp.auth');
        $this->delaySeconds = config('services.whatsapp.delay_seconds', 2);
    }

    /**
     * Enforce rate limiting by sleeping if necessary.
     */
    protected function throttle()
    {
        if ($this->delaySeconds <= 0) {
            return;
        }

        $now = microtime(true);
        $diff = $now - self::$lastSentAt;

        if ($diff < $this->delaySeconds) {
            $sleepMicroseconds = (int) (($this->delaySeconds - $diff) * 1000000);
            if ($sleepMicroseconds > 0) {
                Log::debug("WhatsAppService: Throttling for " . ($sleepMicroseconds / 1000000) . "s");
                usleep($sleepMicroseconds);
            }
        }

        self::$lastSentAt = microtime(true);
    }

    /**
     * Send a WhatsApp message.
     *
     * @param string $phone
     * @param string $message
     * @return bool
     */
    public function sendMessage(string $phone, string $message): bool
    {
        $this->throttle(); // Enforce rate limit

        Log::info("WhatsAppService: Preparing to send message to $phone");

        if (!$this->url) {
            Log::warning('WhatsApp configuration is incomplete.', [
                'url' => $this->url,
                'sender' => $this->sender,
            ]);
            return false;
        }

        // Format phone number
        // 1. Remove any non-numeric characters
        $phone = preg_replace('/[^0-9]/', '', $phone);

        // 2. Normalize to 62 format
        if (str_starts_with($phone, '0')) {
            // Replace leading '0' with '62'
            $phone = '62' . substr($phone, 1);
        } elseif (!str_starts_with($phone, '62')) {
            // If doesn't start with 62 (and didn't start with 0), prepend 62
            // This covers cases like '812...' becoming '62812...'
            $phone = '62' . $phone;
        }
        // If already starts with '62', leave it as is.

        Log::info("WhatsAppService: Formatted phone number: $phone");

        try {
            // Default payload structure compatible with MPWA server
            $payload = [
                'number' => $phone,
                'message' => $message,
            ];
            // Include sender if configured
            if (!empty($this->sender)) {
                $payload['sender'] = $this->sender;
            }
            
            Log::info("WhatsAppService: Sending request to {$this->url}");

            /** @var \Illuminate\Http\Client\Response $response */
            $client = Http::withoutVerifying()->timeout(30);
            // Use AUTH header if configured (MPWA server expects AUTH token)
            if (!empty($this->authToken)) {
                $client = $client->withHeaders(['AUTH' => $this->authToken]);
            } elseif (!empty($this->apiKey)) {
                // Fallback to legacy api_key if provided
                $payload['api_key'] = $this->apiKey;
            }

            $client->post($this->url, $payload);
            Log::info('WhatsApp message sent to ' . $phone);
            return true;
        } catch (\Exception $e) {
            Log::error('WhatsApp Service Exception: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Send generic text message (alias for sendMessage).
     *
     * @param string $phone
     * @param string $message
     * @return bool
     */
    public function sendText(string $phone, string $message): bool
    {
        return $this->sendMessage($phone, $message);
    }

    /**
     * Send OTP message.
     *
     * @param string $phone
     * @param string $otp
     * @return bool
     * @throws \Exception
     */
    public function sendOtp(string $phone, string $otp): bool
    {
        $message = "Yth. Pengguna RT Online,\n\n" .
                   "Berikut adalah kode verifikasi (OTP) Anda: *{$otp}*\n\n" .
                   "Demi keamanan, mohon jangan berikan kode ini kepada siapapun, termasuk pihak yang mengatasnamakan admin.\n\n" .
                   "Terima kasih.";
        return $this->sendMessage($phone, $message);
    }
}
