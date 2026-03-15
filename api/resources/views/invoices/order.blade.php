<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice - {{ $order->order_number }}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f5f5f5;
            padding: 20px;
        }
        
        .invoice-container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        
        .invoice-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        
        .invoice-header h1 {
            font-size: 28px;
            margin-bottom: 5px;
        }
        
        .invoice-header p {
            opacity: 0.9;
            font-size: 14px;
        }
        
        .invoice-body {
            padding: 30px;
        }
        
        .section {
            margin-bottom: 25px;
        }
        
        .section-title {
            font-size: 16px;
            font-weight: bold;
            color: #667eea;
            margin-bottom: 12px;
            padding-bottom: 8px;
            border-bottom: 2px solid #667eea;
        }
        
        .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
        }
        
        .info-item {
            padding: 12px;
            background: #f8f9fa;
            border-radius: 8px;
        }
        
        .info-label {
            font-size: 12px;
            color: #666;
            margin-bottom: 4px;
        }
        
        .info-value {
            font-size: 14px;
            font-weight: 600;
            color: #333;
        }
        
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
        }
        
        .items-table thead {
            background: #667eea;
            color: white;
        }
        
        .items-table th {
            padding: 12px;
            text-align: left;
            font-size: 14px;
        }
        
        .items-table td {
            padding: 12px;
            border-bottom: 1px solid #e0e0e0;
        }
        
        .items-table tr:last-child td {
            border-bottom: none;
        }
        
        .items-table tr:hover {
            background: #f8f9fa;
        }
        
        .summary-table {
            width: 100%;
            margin-top: 20px;
        }
        
        .summary-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 15px;
            border-bottom: 1px solid #e0e0e0;
        }
        
        .summary-row.subtotal {
            background: #f8f9fa;
            font-weight: 600;
        }
        
        .summary-row.total {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            font-size: 18px;
            font-weight: bold;
            border-bottom: none;
            border-radius: 8px;
            margin-top: 10px;
        }
        
        .status-badge {
            display: inline-block;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
        }
        
        .status-pending { background: #fef3c7; color: #92400e; }
        .status-processing { background: #dbeafe; color: #1e40af; }
        .status-shipped { background: #cffafe; color: #0e7490; }
        .status-completed { background: #d1fae5; color: #065f46; }
        .status-cancelled { background: #fee2e2; color: #991b1b; }
        
        .footer {
            text-align: center;
            padding: 20px;
            background: #f8f9fa;
            color: #666;
            font-size: 12px;
            border-top: 2px solid #e0e0e0;
        }
        
        .print-button {
            display: block;
            width: 200px;
            margin: 20px auto;
            padding: 12px 24px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-align: center;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            border: none;
            font-size: 14px;
        }
        
        .print-button:hover {
            opacity: 0.9;
        }
        
        @media print {
            body {
                background: white;
                padding: 0;
            }
            
            .invoice-container {
                box-shadow: none;
            }
            
            .print-button {
                display: none;
            }
        }
        
        @page {
            size: A4;
            margin: 20mm;
        }
    </style>
</head>
<body>
    <div class="invoice-container">
        <!-- Header -->
        <div class="invoice-header">
            <h1>📦 INVOICE PESANAN</h1>
            <p>KND RT Online - Sistem Manajemen Pesanan</p>
        </div>
        
        <!-- Body -->
        <div class="invoice-body">
            <!-- Order Info -->
            <div class="section">
                <div class="section-title">INFORMASI PESANAN</div>
                <div class="info-grid">
                    <div class="info-item">
                        <div class="info-label">Nomor Invoice</div>
                        <div class="info-value">{{ $order->order_number }}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Tanggal Order</div>
                        <div class="info-value">{{ $order->created_at->format('d M Y, H:i') }}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Status</div>
                        <div class="info-value">
                            <span class="status-badge status-{{ strtolower($order->status) }}">
                                {{ Order::getStatusLabels()[$order->status] ?? $order->status }}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Customer Info -->
            <div class="section">
                <div class="section-title">INFORMASI PELANGGAN</div>
                <div class="info-grid">
                    <div class="info-item">
                        <div class="info-label">Nama Pelanggan</div>
                        <div class="info-value">{{ $order->user->name }}</div>
                    </div>
                    @if($order->user->phone)
                    <div class="info-item">
                        <div class="info-label">Nomor Telepon</div>
                        <div class="info-value">{{ $order->user->phone }}</div>
                    </div>
                    @endif
                    @if($order->user->address)
                    <div class="info-item" style="grid-column: span 2;">
                        <div class="info-label">Alamat</div>
                        <div class="info-value">{{ $order->user->address }}</div>
                    </div>
                    @endif
                </div>
            </div>
            
            <!-- Courier Info -->
            @if($order->courier_info || $order->tracking_number || $order->tracking_link)
            <div class="section">
                <div class="section-title">INFORMASI PENGIRIMAN</div>
                <div class="info-grid">
                    @if($order->courier_info)
                    <div class="info-item">
                        <div class="info-label">Kurir / Ekspedisi</div>
                        <div class="info-value">{{ $order->courier_info['name'] ?? '-' }}</div>
                    </div>
                    @endif
                    @if($order->courier_info && $order->courier_info['phone'])
                    <div class="info-item">
                        <div class="info-label">Kontak Kurir</div>
                        <div class="info-value">{{ $order->courier_info['phone'] }}</div>
                    </div>
                    @endif
                    @if($order->tracking_number)
                    <div class="info-item">
                        <div class="info-label">Nomor Resi</div>
                        <div class="info-value">{{ $order->tracking_number }}</div>
                    </div>
                    @endif
                    @if($order->tracking_link)
                    <div class="info-item">
                        <div class="info-label">Link Tracking</div>
                        <div class="info-value" style="font-size: 12px; word-break: break-all;">
                            {{ $order->tracking_link }}
                        </div>
                    </div>
                    @endif
                </div>
            </div>
            @endif
            
            <!-- Items -->
            <div class="section">
                <div class="section-title">DETAIL PESANAN</div>
                <table class="items-table">
                    <thead>
                        <tr>
                            <th>No</th>
                            <th>Produk</th>
                            <th>Qty</th>
                            <th>Harga Satuan</th>
                            <th>Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach($order->items as $index => $item)
                        <tr>
                            <td>{{ $index + 1 }}</td>
                            <td>
                                <strong>{{ $item->product_name }}</strong>
                                @if($item->variant_options)
                                    <br><small style="color: #666;">
                                        {{ is_array($item->variant_options) ? implode(', ', $item->variant_options) : $item->variant_options }}
                                    </small>
                                @endif
                                @if($item->notes)
                                    <br><small style="color: #999;">Catatan: {{ $item->notes }}</small>
                                @endif
                            </td>
                            <td>{{ $item->quantity }}</td>
                            <td>Rp {{ number_format($item->price, 0, ',', '.') }}</td>
                            <td>Rp {{ number_format($item->subtotal, 0, ',', '.') }}</td>
                        </tr>
                        @endforeach
                    </tbody>
                </table>
                
                <!-- Payment Summary -->
                <div class="summary-table">
                    <div class="summary-row subtotal">
                        <span>Subtotal</span>
                        <span>Rp {{ number_format($order->subtotal, 0, ',', '.') }}</span>
                    </div>
                    
                    @if($order->shipping_fee > 0)
                    <div class="summary-row">
                        <span>Ongkos Kirim</span>
                        <span>Rp {{ number_format($order->shipping_fee, 0, ',', '.') }}</span>
                    </div>
                    @endif
                    
                    @if($order->service_fee > 0)
                    <div class="summary-row">
                        <span>Biaya Layanan</span>
                        <span>Rp {{ number_format($order->service_fee, 0, ',', '.') }}</span>
                    </div>
                    @endif
                    
                    @if($order->app_fee > 0)
                    <div class="summary-row">
                        <span>Biaya Aplikasi</span>
                        <span>Rp {{ number_format($order->app_fee, 0, ',', '.') }}</span>
                    </div>
                    @endif
                    
                    @if($order->discount > 0)
                    <div class="summary-row" style="color: #dc2626;">
                        <span>Diskon</span>
                        <span>- Rp {{ number_format($order->discount, 0, ',', '.') }}</span>
                    </div>
                    @endif
                    
                    <div class="summary-row total">
                        <span><strong>TOTAL PEMBAYARAN</strong></span>
                        <span><strong>Rp {{ number_format($order->total, 0, ',', '.') }}</strong></span>
                    </div>
                </div>
            </div>
            
            <!-- Notes -->
            @php $notes = json_decode($order->notes, true); @endphp
            @if($notes && count($notes) > 0)
            <div class="section">
                <div class="section-title">CATATAN PESANAN</div>
                @foreach($notes as $seller => $note)
                <div class="info-item" style="margin-bottom: 10px;">
                    <div class="info-label">{{ $seller }}</div>
                    <div class="info-value">{{ $note }}</div>
                </div>
                @endforeach
            </div>
            @endif
        </div>
        
        <!-- Footer -->
        <div class="footer">
            <p><strong>Terima kasih atas pesanan Anda!</strong></p>
            <p>Untuk informasi lebih lanjut, silakan hubungi customer service kami.</p>
            <p style="margin-top: 10px;">Invoice ini dibuat secara otomatis dan sah tanpa tanda tangan.</p>
        </div>
    </div>
    
    <!-- Print Button -->
    <button onclick="window.print()" class="print-button">
        🖨️ Cetak Invoice
    </button>
    
    <script>
        // Auto-print on load if needed
        // window.onload = function() { window.print(); }
    </script>
</body>
</html>
