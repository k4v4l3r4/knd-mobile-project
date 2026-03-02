<?php

namespace App\Services\Payment;

use App\Models\Transaction;
use App\Support\PaymentSettings;

class IuranPaymentGatewayService
{
    public function createInstruction(Transaction $transaction, ?string $channel = null): array
    {
        $settings = PaymentSettings::all();
        $mode = $settings['iuran_warga_mode'] ?? 'SPLIT';
        $resolvedChannel = $channel ?: PaymentSettings::getGateway('iuran_warga');

        $meta = [];

        if ($resolvedChannel === 'DANA') {
            if (!empty($transaction->payment_url)) {
                $meta['payment_url'] = $transaction->payment_url;
            }
        }

        $instruction = [
            'channel' => $resolvedChannel,
            'payment_mode' => $mode,
            'amount_total' => $transaction->amount,
            'reference' => $transaction->id,
            'expires_at' => now()->addDay()->toDateTimeString(),
            'meta' => $meta,
        ];

        if ($mode === 'SPLIT') {
            $config = $settings['iuran_warga_config'] ?? [];
            $instruction['meta']['split_config'] = [
                'platform_fee_percent' => (float) ($config['platform_fee_percent'] ?? 0),
            ];
        }

        return $instruction;
    }
}
