<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pengingat Perpanjangan Layanan</title>
    <style>
        /* Base Reset */
        body {
            margin: 0;
            padding: 0;
            background-color: #f8fafc; /* Light Gray Background */
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            -webkit-font-smoothing: antialiased;
            color: #334155; /* Slate 700 */
        }
        
        /* Container */
        .wrapper {
            width: 100%;
            table-layout: fixed;
            background-color: #f8fafc;
            padding-bottom: 40px;
        }
        
        .main-content {
            background-color: #ffffff;
            margin: 0 auto;
            width: 100%;
            max-width: 600px;
            border-radius: 12px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03); /* Soft Shadow */
            overflow: hidden;
        }

        /* Header */
        .header {
            padding: 32px 40px 0 40px;
            text-align: center;
        }
        
        .header-title {
            font-size: 24px;
            font-weight: 700;
            color: #1e293b; /* Dark Blue / Slate 800 */
            margin: 0;
            letter-spacing: -0.5px;
        }
        
        /* Body */
        .body-section {
            padding: 32px 40px;
            text-align: left;
        }
        
        .greeting {
            font-size: 16px;
            margin-bottom: 16px;
            color: #334155;
        }
        
        .message {
            font-size: 16px;
            line-height: 1.6;
            color: #475569; /* Slate 600 */
            margin-bottom: 24px;
        }
        
        /* Key Info Box */
        .info-box {
            background-color: #f1f5f9; /* Slate 100 */
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            margin-bottom: 32px;
            border: 1px solid #e2e8f0;
        }
        
        .info-label {
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #64748b; /* Slate 500 */
            margin-bottom: 8px;
            font-weight: 600;
        }
        
        .due-date {
            font-size: 20px;
            font-weight: 700;
            color: #0f172a; /* Slate 900 */
        }

        /* CTA Button */
        .cta-container {
            text-align: center;
            margin-bottom: 32px;
        }
        
        .cta-button {
            background-color: #2563eb; /* Bright Blue */
            color: #ffffff;
            padding: 14px 32px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            font-size: 16px;
            display: inline-block;
            transition: background-color 0.2s;
        }
        
        .cta-button:hover {
            background-color: #1d4ed8;
        }

        /* Footer Steps */
        .footer-steps {
            background-color: #f8fafc;
            padding: 32px 40px;
            border-top: 1px solid #e2e8f0;
        }
        
        .step-item {
            margin-bottom: 12px;
            font-size: 14px;
            color: #64748b;
            display: flex;
            align-items: start;
        }
        
        .step-number {
            font-weight: 700;
            color: #2563eb;
            margin-right: 8px;
            min-width: 20px;
        }

        .help-link {
            text-align: center;
            margin-top: 24px;
            font-size: 13px;
            color: #94a3b8;
        }
        
        .help-link a {
            color: #2563eb;
            text-decoration: none;
        }

        /* Mobile Responsive */
        @media screen and (max-width: 600px) {
            .main-content {
                width: 100% !important;
                border-radius: 0 !important;
            }
            .header, .body-section, .footer-steps {
                padding: 24px 20px !important;
            }
        }
    </style>
</head>
<body>
    <div class="wrapper">
        <div style="height: 40px;"></div> <!-- Spacer -->
        
        <div class="main-content">
            <!-- Header -->
            <div class="header">
                <h1 class="header-title">Pengingat Perpanjangan Layanan</h1>
            </div>

            <!-- Body -->
            <div class="body-section">
                <p class="greeting">Yth. {{ $customerName ?? '[Nama Pelanggan]' }},</p>
                
                <p class="message">
                    Masa aktif layanan berlangganan Anda akan segera berakhir. 
                    Untuk memastikan layanan tetap berjalan tanpa gangguan, mohon segera lakukan perpanjangan sebelum tanggal jatuh tempo.
                </p>

                <!-- Key Info -->
                <div class="info-box">
                    <div class="info-label">Jatuh Tempo</div>
                    <div class="due-date">{{ $dueDate ?? '2026-03-02' }}</div>
                </div>

                <!-- CTA Button -->
                <div class="cta-container">
                    <a href="{{ $paymentUrl ?? '#' }}" class="cta-button">Perpanjang Sekarang</a>
                </div>
            </div>

            <!-- Footer Steps -->
            <div class="footer-steps">
                <div style="font-weight: 600; color: #334155; margin-bottom: 12px; font-size: 14px;">Cara Pembayaran:</div>
                
                <div class="step-item">
                    <span class="step-number">1.</span>
                    <span>Klik tombol "Perpanjang Sekarang" di atas.</span>
                </div>
                <div class="step-item">
                    <span class="step-number">2.</span>
                    <span>Pilih metode pembayaran yang Anda inginkan.</span>
                </div>
                <div class="step-item">
                    <span class="step-number">3.</span>
                    <span>Selesaikan transaksi dan layanan akan diperpanjang otomatis.</span>
                </div>

                <div class="help-link">
                    Butuh bantuan? <a href="{{ $supportUrl ?? '#' }}">Hubungi Tim Support</a>
                </div>
                
                <div style="text-align: center; margin-top: 20px; color: #cbd5e1; font-size: 12px;">
                    &copy; {{ date('Y') }} RT Online System. All rights reserved.
                </div>
            </div>
        </div>
        
        <div style="height: 40px;"></div> <!-- Spacer -->
    </div>
</body>
</html>
