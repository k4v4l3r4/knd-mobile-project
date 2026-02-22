<?php

namespace App\Services\Payment;

use App\Models\Transaction;
use App\Support\PaymentSettings;
use Illuminate\Support\Facades\Http;

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
                try {
                    $response = Http::withHeaders([
                        'X-INTERNAL-SECRET' => $sharedSecret,
                    ])
                        ->timeout($timeoutMs / 1000)
                        ->post($baseUrl . '/dana/create-order', [
                            'paymentId' => 'IURAN-' . $transaction->id,
                            'amount' => (float) $transaction->amount,
                            'productCode' => 'KND_IURAN',
                        ]);

                    if ($response->successful()) {
                        $data = $response->json();
                        if (!empty($data['redirectUrl'])) {
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
