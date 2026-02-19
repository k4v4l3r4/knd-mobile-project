<?php

namespace App\Services\Payment;

use App\Support\PaymentSettings;

class UmkmPaymentGatewayService
{
    public function createInstruction(float $amount, array $meta = [], ?string $channel = null): array
    {
        $resolvedChannel = $channel ?: PaymentSettings::getGateway('umkm');

        return [
            'channel' => $resolvedChannel,
            'amount_total' => $amount,
            'reference' => $meta['reference'] ?? null,
            'expires_at' => now()->addDay()->toDateTimeString(),
            'meta' => $meta,
        ];
    }
}

