<?php

namespace App\Services\Payment;

use App\Models\Transaction;
use App\Support\PaymentSettings;

class IuranPaymentGatewayService
{
    public function createInstruction(Transaction $transaction, ?string $channel = null): array
    {
        $resolvedChannel = $channel ?: PaymentSettings::getGateway('iuran_warga');

        return [
            'channel' => $resolvedChannel,
            'amount_total' => $transaction->amount,
            'reference' => $transaction->id,
            'expires_at' => now()->addDay()->toDateTimeString(),
            'meta' => [],
        ];
    }
}

