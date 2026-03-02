<?php

namespace App\Services;

use App\Models\Transaction;
use Illuminate\Support\Str;

class DanaPaymentService
{
    public function createOrder(Transaction $transaction): array
    {
        $baseUrl = rtrim((string) env('DANA_SANDBOX_BASE_URL'), '/');
        $merchantId = env('DANA_MERCHANT_ID');
        $clientId = env('DANA_CLIENT_ID');
        $clientSecret = env('DANA_CLIENT_SECRET');
        $callbackUrl = env('DANA_CALLBACK_URL');

        if (!$baseUrl || !$merchantId || !$clientId || !$clientSecret || !$callbackUrl) {
            throw new \RuntimeException('DANA configuration is incomplete.');
        }

        $reference = $transaction->dana_reference_no;
        if (!$reference) {
            $reference = 'IURAN-' . $transaction->id . '-' . Str::random(6);
            $transaction->dana_reference_no = $reference;
            $transaction->save();
        }

        $timestamp = now()->toIso8601String();

        $body = [
            'merchantId' => $merchantId,
            'clientId' => $clientId,
            'merchantTransId' => $reference,
            'amount' => (float) $transaction->amount,
            'currency' => 'IDR',
            'callbackUrl' => $callbackUrl,
            'description' => $transaction->description ?: 'Pembayaran iuran warga',
            'timestamp' => $timestamp,
        ];

        $signaturePayload = $merchantId . '|' . $clientId . '|' . $reference . '|' . (float) $transaction->amount . '|' . $timestamp;
        $signature = hash_hmac('sha256', $signaturePayload, $clientSecret);

        $context = stream_context_create([
            'http' => [
                'method' => 'POST',
                'header' => implode("\r\n", [
                    'Content-Type: application/json',
                    'X-SIGNATURE: ' . $signature,
                ]),
                'content' => json_encode($body),
                'timeout' => 10,
            ],
        ]);

        $raw = file_get_contents($baseUrl . '/dana/create-order', false, $context);
        if ($raw === false) {
            throw new \RuntimeException('Failed to create DANA order.');
        }

        $data = json_decode($raw, true) ?: [];

        $paymentUrl = $data['paymentUrl'] ?? ($data['redirectUrl'] ?? null);
        if ($paymentUrl) {
            $transaction->payment_url = $paymentUrl;
            $transaction->save();
        }

        return $data;
    }
}
