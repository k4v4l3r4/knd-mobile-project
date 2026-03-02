<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Invoice {{ $invoice->invoice_number }}</title>
    <style>
        body {
            font-family: 'Helvetica', 'Arial', sans-serif;
            color: #1f2937;
            line-height: 1.5;
            font-size: 14px;
        }
        .container {
            width: 100%;
            margin: 0 auto;
            padding: 20px;
        }
        .header-table {
            width: 100%;
            margin-bottom: 40px;
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 20px;
        }
        .logo-text {
            font-size: 24px;
            font-weight: bold;
            color: #059669; /* Emerald 600 */
            text-transform: uppercase;
        }
        .tagline {
            font-size: 12px;
            color: #6b7280;
            margin-top: 5px;
        }
        .invoice-title {
            font-size: 28px;
            font-weight: bold;
            color: #111827;
            text-align: right;
        }
        
        .status-badge {
            display: inline-block;
            padding: 6px 12px;
            border-radius: 9999px;
            font-weight: bold;
            font-size: 12px;
            text-transform: uppercase;
            text-align: center;
        }
        .status-PAID { background-color: #d1fae5; color: #065f46; border: 1px solid #059669; }
        .status-UNPAID { background-color: #fee2e2; color: #b91c1c; border: 1px solid #dc2626; }
        .status-DRAFT { background-color: #f3f4f6; color: #374151; border: 1px solid #9ca3af; }
        .status-CANCELED { background-color: #f3f4f6; color: #9ca3af; text-decoration: line-through; }

        .info-table {
            width: 100%;
            margin-bottom: 40px;
        }
        .info-col {
            width: 33.33%;
            vertical-align: top;
        }
        .info-label {
            font-weight: bold;
            color: #4b5563;
            font-size: 12px;
            text-transform: uppercase;
            margin-bottom: 4px;
        }
        .info-value {
            margin-bottom: 12px;
            color: #111827;
        }

        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 40px;
        }
        .items-table th {
            background-color: #f9fafb;
            color: #374151;
            font-weight: bold;
            text-transform: uppercase;
            font-size: 12px;
            padding: 12px 16px;
            text-align: left;
            border-bottom: 1px solid #e5e7eb;
        }
        .items-table td {
            padding: 12px 16px;
            border-bottom: 1px solid #f3f4f6;
            color: #374151;
        }
        .text-right { text-align: right; }
        
        .summary-table {
            width: 40%;
            margin-left: auto;
            border-collapse: collapse;
        }
        .summary-row td {
            padding: 8px 0;
            border-bottom: 1px solid #f3f4f6;
        }
        .summary-label {
            font-weight: bold;
            color: #4b5563;
        }
        .total-row td {
            border-top: 2px solid #e5e7eb;
            border-bottom: none;
            padding-top: 12px;
            font-size: 18px;
            font-weight: bold;
            color: #059669;
        }

        .footer {
            margin-top: 60px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            font-size: 11px;
            color: #9ca3af;
        }
        .notes-box {
            background-color: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            padding: 15px;
            margin-top: 20px;
            font-size: 12px;
            color: #4b5563;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <table class="header-table">
            <tr>
                <td style="vertical-align: top;">
                    <div class="logo-text">RT-Online SuperApp</div>
                    <div class="tagline">Sistem Administrasi Digital RT–RW</div>
                </td>
                <td style="text-align: right; vertical-align: top;">
                    <div class="invoice-title">INVOICE</div>
                    <div style="margin-top: 10px;">
                        <span class="status-badge status-{{ $invoice->status }}">
                            {{ $invoice->status }}
                        </span>
                    </div>
                </td>
            </tr>
        </table>

        <!-- Info Columns -->
        <table class="info-table">
            <tr>
                <td class="info-col">
                    <div class="info-label">DITAGIHKAN KE:</div>
                    <div class="info-value">
                        <strong>{{ $tenant->name }}</strong><br>
                        @if($tenant->address)
                            {{ $tenant->address }}<br>
                        @endif
                        Tenant ID: {{ $tenant->id }}<br>
                        Type: {{ $tenant->billing_mode === 'RW' ? 'Rukun Warga (RW)' : 'Rukun Tetangga (RT)' }}
                    </div>
                </td>
                <td class="info-col">
                    <div class="info-label">BILLING OWNER:</div>
                    <div class="info-value">
                        @if($invoice->billingOwner)
                            <strong>{{ $invoice->billingOwner->name }}</strong><br>
                            {{ $invoice->billingOwner->billing_mode === 'RW' ? 'Centralized RW Billing' : 'Independent RT Billing' }}
                        @else
                            <strong>System Administrator</strong>
                        @endif
                    </div>
                </td>
                <td class="info-col" style="text-align: right;">
                    <div class="info-label">INVOICE NUMBER</div>
                    <div class="info-value"><strong>{{ $invoice->invoice_number }}</strong></div>

                    <div class="info-label">ISSUED DATE</div>
                    <div class="info-value">{{ $invoice->issued_at ? $invoice->issued_at->format('d M Y') : '-' }}</div>

                    <div class="info-label">DUE DATE</div>
                    <div class="info-value">{{ $invoice->due_at ? $invoice->due_at->format('d M Y') : 'Upon Receipt' }}</div>
                </td>
            </tr>
        </table>

        <!-- Items Table -->
        <table class="items-table">
            <thead>
                <tr>
                    <th style="width: 40%">Plan Details</th>
                    <th style="width: 20%">Type</th>
                    <th style="width: 20%">Period</th>
                    <th class="text-right" style="width: 20%">Amount (IDR)</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>
                        <strong>{{ $invoice->plan_code }} Plan</strong><br>
                        <span style="font-size: 12px; color: #6b7280;">
                            @if($invoice->service_period_start && $invoice->service_period_end)
                                {{ $invoice->service_period_start->format('d M Y') }} — {{ $invoice->service_period_end->format('d M Y') }}
                            @elseif($invoice->invoice_type === 'LIFETIME')
                                Lifetime Access
                            @else
                                Period not specified
                            @endif
                        </span>
                    </td>
                    <td>{{ $invoice->invoice_type }}</td>
                    <td>
                        @if($invoice->invoice_type === 'LIFETIME')
                            One-time
                        @elseif($invoice->subscription && $invoice->subscription->billing_period)
                            {{ $invoice->subscription->billing_period }}
                        @else
                            -
                        @endif
                    </td>
                    <td class="text-right">
                        {{ number_format($invoice->amount, 0, ',', '.') }}
                    </td>
                </tr>
            </tbody>
        </table>

        <!-- Summary -->
        <table class="summary-table">
            <tr class="summary-row">
                <td class="summary-label">Subtotal</td>
                <td class="text-right">{{ number_format($invoice->amount, 0, ',', '.') }}</td>
            </tr>
            <tr class="summary-row">
                <td class="summary-label">Tax (0%)</td>
                <td class="text-right">0</td>
            </tr>
            <tr class="summary-row total-row">
                <td>Total</td>
                <td class="text-right">Rp {{ number_format($invoice->amount, 0, ',', '.') }}</td>
            </tr>
        </table>

        <!-- Notes -->
        <div class="notes-box">
            <strong>Catatan:</strong><br>
            @if($invoice->invoice_type === 'LIFETIME')
                Pembayaran ini bersifat sekali bayar dan berlaku seumur hidup selama sistem RT-Online SuperApp beroperasi.
            @else
                Langganan akan diperpanjang sesuai periode jika pembayaran dilakukan. Harap lakukan pembayaran sebelum tanggal jatuh tempo.
            @endif
            @if($invoice->notes)
                <br><br><em>{{ $invoice->notes }}</em>
            @endif
        </div>

        <!-- Footer -->
        <div class="footer">
            <p>
                Terima kasih telah menggunakan RT-Online SuperApp.<br>
                Dokumen ini dibuat secara otomatis oleh sistem komputer dan sah tanpa tanda tangan basah.<br>
                &copy; {{ date('Y') }} RT-Online SuperApp. All rights reserved.
            </p>
        </div>
    </div>
</body>
</html>
