<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Laporan Iuran Warga {{ $year }}</title>
    <style>
        @page {
            size: A4 landscape;
            margin: 1cm;
        }
        body {
            font-family: sans-serif;
            font-size: 10px;
            color: #333;
        }
        .header {
            text-align: center;
            margin-bottom: 20px;
        }
        .header h1 {
            margin: 0;
            font-size: 18px;
            text-transform: uppercase;
        }
        .header p {
            margin: 5px 0 0;
            font-size: 12px;
        }
        .meta {
            margin-bottom: 15px;
            width: 100%;
        }
        .meta td {
            vertical-align: top;
        }
        table.data {
            width: 100%;
            border-collapse: collapse;
            font-size: 9px;
        }
        table.data th, table.data td {
            border: 1px solid #ddd;
            padding: 4px;
        }
        table.data th {
            background-color: #f3f4f6;
            font-weight: bold;
            text-align: center;
        }
        table.data td.text-right {
            text-align: right;
        }
        table.data td.text-center {
            text-align: center;
        }
        .status-paid {
            color: #059669; /* Emerald 600 */
            font-weight: bold;
        }
        .status-partial {
            color: #d97706; /* Amber 600 */
            font-weight: bold;
        }
        .status-unpaid {
            color: #e11d48; /* Rose 600 */
        }
        .footer {
            margin-top: 30px;
            text-align: right;
            font-size: 10px;
        }
        .page-break {
            page-break-after: always;
        }
        .summary-box {
            margin-top: 20px;
            padding: 10px;
            background-color: #f9fafb;
            border: 1px solid #e5e7eb;
            width: 300px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Laporan Iuran Warga</h1>
        <p>{{ $rt_name }} - Tahun {{ $year }}</p>
    </div>

    <table class="meta">
        <tr>
            <td><strong>Filter Blok:</strong> {{ $filter_block }}</td>
            <td style="text-align: right;"><strong>Tanggal Cetak:</strong> {{ date('d/m/Y H:i') }}</td>
        </tr>
    </table>

    <table class="data">
        <thead>
            <tr>
                <th style="width: 150px; text-align: left;">Nama Warga</th>
                <th style="width: 50px;">Blok</th>
                <th>Jan</th>
                <th>Feb</th>
                <th>Mar</th>
                <th>Apr</th>
                <th>Mei</th>
                <th>Jun</th>
                <th>Jul</th>
                <th>Agu</th>
                <th>Sep</th>
                <th>Okt</th>
                <th>Nov</th>
                <th>Des</th>
                <th style="width: 70px;">Total</th>
            </tr>
        </thead>
        <tbody>
            @foreach($users as $user)
            <tr>
                <td>{{ $user['name'] }}</td>
                <td class="text-center">{{ $user['block'] }}</td>
                
                @foreach($user['months'] as $key => $month)
                    <td class="text-right">
                        @if($month['paid'] > 0)
                            <span class="{{ $month['status'] == 'PAID' ? 'status-paid' : ($month['status'] == 'PARTIAL' ? 'status-partial' : '') }}">
                                {{ number_format($month['paid'], 0, ',', '.') }}
                            </span>
                        @else
                            <span style="color: #ccc;">-</span>
                        @endif
                    </td>
                @endforeach

                <td class="text-right" style="font-weight: bold;">
                    {{ number_format($user['total_year'], 0, ',', '.') }}
                </td>
            </tr>
            @endforeach
        </tbody>
        <tfoot>
            <tr style="background-color: #f3f4f6; font-weight: bold;">
                <td colspan="2" style="text-align: right; padding-right: 10px;">Total Iuran Warga</td>
                @foreach($monthly_totals as $total)
                    <td class="text-right">{{ $total > 0 ? number_format($total, 0, ',', '.') : '-' }}</td>
                @endforeach
                <td class="text-right">{{ number_format($grand_total, 0, ',', '.') }}</td>
            </tr>
        </tfoot>
    </table>

    <div class="footer">
        <p>Dicetak oleh Sistem RT Online</p>
    </div>

    <div class="summary-box" style="page-break-inside: avoid;">
        <strong>Keterangan Warna:</strong>
        <ul style="margin: 5px 0 0 15px; padding: 0;">
            <li style="color: #059669;">Hijau: Lunas (>= {{ number_format($standard_fee, 0, ',', '.') }})</li>
            <li style="color: #d97706;">Kuning: Sebagian</li>
            <li style="color: #333;">Hitam/Strip: Belum Bayar</li>
        </ul>
    </div>
</body>
</html>
