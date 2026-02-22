<?php

namespace App\Services\Payment;

use App\Models\Transaction;
use App\Support\PaymentSettings;

class IuranPaymentGatewayService
{
    public function createInstruction(Transaction $transaction, ?string $channel = null): array
    {
        $resolvedChannel = $channel ?: PaymentSettings::getGateway('iuran_warga');

        $meta = [];

        if ($resolvedChannel === 'DANA') {
            $config = config('services.payment_engine');
            $baseUrl = isset($config['base_url']) ? rtrim($config['base_url'], '/') : null;
            $timeoutMs = isset($config['timeout_ms']) ? (int) $config['timeout_ms'] : 5000;
            $sharedSecret = $config['shared_secret'] ?? null;

            if ($baseUrl && $sharedSecret) {
                $url = $baseUrl . '/dana/create-order';
                $payload = [
                    'paymentId' => 'IURAN-' . $transaction->id,
                    'amount' => (float) $transaction->amount,
                    'productCode' => 'KND_IURAN',
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
            }
        }

        return [
            'channel' => $resolvedChannel,
            'amount_total' => $transaction->amount,
            'reference' => $transaction->id,
            'expires_at' => now()->addDay()->toDateTimeString(),
            'meta' => $meta,
        ];
    }
}
