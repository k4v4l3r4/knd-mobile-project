<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Invoice {{ $invoice->invoice_number }}</title>
    <style>
        body {
            font-family: 'Helvetica', 'Arial', sans-serif;
            color: #333;
            line-height: 1.6;
        }
        .container {
            width: 100%;
            margin: 0 auto;
        }
        .header {
            text-align: center;
            margin-bottom: 40px;
            border-bottom: 2px solid #eee;
            padding-bottom: 20px;
        }
        .logo {
            font-size: 24px;
            font-weight: bold;
            color: #059669; /* Emerald 600 */
        }
        .invoice-title {
            font-size: 32px;
            font-weight: bold;
            color: #333;
            margin-top: 10px;
        }
        .status-badge {
            display: inline-block;
            padding: 5px 10px;
            border-radius: 4px;
            font-weight: bold;
            font-size: 14px;
            text-transform: uppercase;
        }
        .status-PAID { background-color: #d1fae5; color: #065f46; border: 1px solid #065f46; }
        .status-UNPAID { background-color: #fee2e2; color: #b91c1c; border: 1px solid #b91c1c; }
        .status-DRAFT { background-color: #f3f4f6; color: #374151; border: 1px solid #374151; }
        
        .details-table {
            width: 100%;
            margin-bottom: 30px;
        }
        .details-table td {
            vertical-align: top;
            padding: 5px;
        }
        .billing-to {
            width: 50%;
        }
        .invoice-info {
            width: 50%;
            text-align: right;
        }
        
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
        }
        .items-table th {
            background-color: #f9fafb;
            padding: 12px;
            text-align: left;
            border-bottom: 2px solid #ddd;
        }
        .items-table td {
            padding: 12px;
            border-bottom: 1px solid #eee;
        }
        .total-row td {
            font-weight: bold;
            border-top: 2px solid #333;
            font-size: 18px;
        }
        
        .footer {
            margin-top: 50px;
            text-align: center;
            font-size: 12px;
            color: #666;
            border-top: 1px solid #eee;
            padding-top: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">RT-Online SuperApp</div>
            <div class="invoice-title">INVOICE</div>
            <div class="status-badge status-{{ $invoice->status }}">
                {{ $invoice->status }}
            </div>
        </div>

        <table class="details-table">
            <tr>
                <td class="billing-to">
                    <strong>Billed To:</strong><br>
                    {{ $tenant->name }}<br>
                    {{ $tenant->address ?? 'Address not provided' }}<br>
                    {{ $tenant->email ?? 'Email not provided' }}<br>
                    <strong>Tenant ID:</strong> {{ $tenant->id }}
                </td>
                <td class="invoice-info">
                    <strong>Invoice Number:</strong> {{ $invoice->invoice_number }}<br>
                    <strong>Date Issued:</strong> {{ $invoice->issued_at ? $invoice->issued_at->format('d M Y') : '-' }}<br>
                    <strong>Due Date:</strong> {{ $invoice->due_at ? $invoice->due_at->format('d M Y') : 'Upon Receipt' }}<br>
                    @if($invoice->paid_at)
                    <strong>Paid Date:</strong> {{ $invoice->paid_at->format('d M Y') }}
                    @endif
                </td>
            </tr>
        </table>

        <table class="items-table">
            <thead>
                <tr>
                    <th>Description</th>
                    <th style="text-align: right;">Amount (IDR)</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>
                        <strong>{{ $invoice->invoice_type }} Plan</strong><br>
                        <span style="color: #666; font-size: 14px;">
                            Plan Code: {{ $invoice->plan_code }}
                            @if($invoice->service_period_start && $invoice->service_period_end)
                                <br>Period: {{ $invoice->service_period_start->format('d M Y') }} - {{ $invoice->service_period_end->format('d M Y') }}
                            @endif
                        </span>
                        @if($invoice->notes)
                            <br><em style="font-size: 12px; color: #888;">{{ $invoice->notes }}</em>
                        @endif
                    </td>
                    <td style="text-align: right;">
                        {{ number_format($invoice->amount, 0, ',', '.') }}
                    </td>
                </tr>
                <tr class="total-row">
                    <td style="text-align: right;">Total</td>
                    <td style="text-align: right;">Rp {{ number_format($invoice->amount, 0, ',', '.') }}</td>
                </tr>
            </tbody>
        </table>

        <div class="footer">
            <p>Thank you for using RT-Online SuperApp.</p>
            <p>This is a computer-generated document. No signature is required.</p>
            <p>&copy; {{ date('Y') }} RT-Online SuperApp. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
