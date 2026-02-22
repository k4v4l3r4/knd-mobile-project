<?php

namespace App\Services\Payment;

use App\Support\PaymentSettings;
use Illuminate\Support\Facades\Http;

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

                try {
                    $response = Http::withHeaders([
                        'X-INTERNAL-SECRET' => $sharedSecret,
                    ])
                        ->timeout($timeoutMs / 1000)
                        ->post($baseUrl . '/dana/create-order', [
                            'paymentId' => $reference,
                            'amount' => (float) $amount,
                            'productCode' => 'KND_UMKM',
                        ]);

                    if ($response->successful()) {
                        $data = $response->json();
                        if (!empty($data['redirectUrl'])) {
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
