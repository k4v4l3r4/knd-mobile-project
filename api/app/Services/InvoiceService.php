<?php

namespace App\Services;

use App\Models\Order;
use Illuminate\Support\Facades\View;

class InvoiceService
{
    /**
     * Generate HTML invoice for printing
     */
    public function generateHtml(Order $order): string
    {
        $html = view('invoices.order', compact('order'))->render();
        return $html;
    }

    /**
     * Generate simple invoice data for mobile display
     */
    public function generateInvoiceData(Order $order): array
    {
        return [
            'order_number' => $order->order_number,
            'order_date' => $order->created_at->format('d M Y, H:i'),
            'status' => $order->status,
            'status_label' => Order::getStatusLabels()[$order->status] ?? $order->status,
            
            // Customer info
            'customer' => [
                'name' => $order->user->name,
                'phone' => $order->user->phone ?? '-',
                'address' => $order->user->address ?? '-',
            ],
            
            // Items
            'items' => $order->items->map(function($item) {
                return [
                    'product_name' => $item->product_name,
                    'quantity' => $item->quantity,
                    'price' => $item->price,
                    'subtotal' => $item->subtotal,
                    'variants' => $item->variant_options,
                    'notes' => $item->notes,
                ];
            }),
            
            // Payment summary
            'subtotal' => $order->subtotal,
            'shipping_fee' => $order->shipping_fee,
            'service_fee' => $order->service_fee,
            'app_fee' => $order->app_fee,
            'discount' => $order->discount,
            'total' => $order->total,
            
            // Courier info
            'courier_info' => $order->courier_info,
            'tracking_number' => $order->tracking_number,
            'tracking_link' => $order->tracking_link,
            
            // Notes
            'notes' => json_decode($order->notes, true),
        ];
    }

    /**
     * Format currency to Rupiah
     */
    public function formatRupiah(float $amount): string
    {
        return 'Rp ' . number_format($amount, 0, ',', '.');
    }
}
