<?php

namespace App\Services\Payment;

class PaymentResult
{
    public string $status;
    public string $paymentMode;
    public string $provider;
    public array $instruction;

    public function __construct(string $status, string $paymentMode, string $provider, array $instruction = [])
    {
        $this->status = $status;
        $this->paymentMode = $paymentMode;
        $this->provider = $provider;
        $this->instruction = $instruction;
    }
}
