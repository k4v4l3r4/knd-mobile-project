<?php

namespace App\Services\Payment;

use App\Support\PaymentSettings;

class UmkmPaymentGatewayService
{
    public function createInstruction(float $amount, array $meta = [], ?string $channel = null): array
    {
        $resolvedChannel = $channel ?: PaymentSettings::getGateway('umkm');

        if ($resolvedChannel === 'DANA') {
            $config = config('services.payment_engine');
            $baseUrl = isset($config['base_url']) ? rtrim($config['base_url'], '/') : null;
            $timeoutMs = isset($config['timeout_ms']) ? (int) $config['timeout_ms'] : 5000;
            $sharedSecret = $config['shared_secret'] ?? null;

            if ($baseUrl && $sharedSecret) {
                $reference = $meta['reference'] ?? ('UMKM-' . uniqid());

                $url = $baseUrl . '/dana/create-order';
                $payload = [
                    'paymentId' => $reference,
                    'amount' => (float) $amount,
                    'productCode' => 'KND_UMKM',
                ];

                $context = stream_context_create([
                    'http' => [
                        'method' => 'POST',
                        'header' => implode("\r\n", [
                            'Content-Type: application/json',
                            'X-INTERNAL-SECRET: ' . $sharedSecret,
                        ]),
                        'content' => json_encode($payload),
                        'timeout' => $timeoutMs / 1000,
                    ],
                ]);

                try {
                    $raw = file_get_contents($url, false, $context);
                    if ($raw !== false) {
                        $data = json_decode($raw, true);
                        if (is_array($data) && !empty($data['redirectUrl'])) {
                            $meta['dana_redirect_url'] = $data['redirectUrl'];
                        }
                    }
                } catch (\Throwable $e) {
                }

                $meta['reference'] = $reference;
            }
        }

        return [
            'channel' => $resolvedChannel,
            'amount_total' => $amount,
            'reference' => $meta['reference'] ?? null,
            'expires_at' => now()->addDay()->toDateTimeString(),
            'meta' => $meta,
        ];
    }
}
