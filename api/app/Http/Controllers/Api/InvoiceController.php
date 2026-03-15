<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Services\InvoiceService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\View;

class InvoiceController extends Controller
{
    /**
     * Display invoice for printing
     */
    public function print(Order $order, InvoiceService $invoiceService)
    {
        $html = $invoiceService->generateHtml($order);
        return response($html);
    }

    /**
     * Get invoice data as JSON (for mobile)
     */
    public function json(Order $order, InvoiceService $invoiceService)
    {
        $data = $invoiceService->generateInvoiceData($order);
        
        return response()->json([
            'invoice' => $data,
        ]);
    }
}
