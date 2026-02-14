<?php

namespace App\Services\Payment;

use App\Models\Invoice;

interface PaymentStrategy
{
    public function pay(Invoice $invoice): PaymentResult;
}
