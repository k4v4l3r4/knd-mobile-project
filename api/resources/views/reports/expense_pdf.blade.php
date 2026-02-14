<!DOCTYPE html>
<html>
<head>
    <title>Laporan Pengeluaran RT</title>
    <style>
        @page {
            size: A4 portrait;
            margin: 2.5cm;
        }
        body {
            font-family: sans-serif;
            font-size: 12px;
        }
        .header {
            text-align: center;
            margin-bottom: 20px;
        }
        .header h1 {
            margin: 0;
            font-size: 18px;
        }
        .header h2 {
            margin: 5px 0;
            font-size: 14px;
            color: #555;
        }
        .meta {
            margin-bottom: 20px;
            width: 100%;
        }
        .summary-box {
            width: 100%;
            margin-bottom: 20px;
            border-collapse: collapse;
        }
        .summary-box td {
            border: 1px solid #ddd;
            padding: 10px;
            text-align: center;
        }
        .summary-title {
            font-weight: bold;
            color: #666;
            display: block;
            margin-bottom: 5px;
        }
        .summary-value {
            font-size: 18px;
            font-weight: bold;
            color: #EF4444;
        }
        
        table.data {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        table.data th, table.data td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }
        table.data th {
            background-color: #f4f4f4;
            font-weight: bold;
        }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .badge {
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: bold;
            background-color: #fee2e2; 
            color: #991b1b;
        }
        .footer {
            margin-top: 40px;
            text-align: right;
        }
        .footer p { margin: 2px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>LAPORAN PENGELUARAN RT</h1>
        <h2>{{ $rt_name }}</h2>
        <p>Periode: {{ $period }}</p>
    </div>

    <table class="summary-box">
        <tr>
            <td>
                <span class="summary-title">Total Pengeluaran</span>
                <span class="summary-value">Rp {{ number_format($total_out, 0, ',', '.') }}</span>
            </td>
        </tr>
    </table>

    <h3>Rincian Pengeluaran</h3>
    <table class="data">
        <thead>
            <tr>
                <th width="15%">Tanggal</th>
                <th width="20%">Kategori</th>
                <th width="45%">Keterangan</th>
                <th width="20%" class="text-right">Jumlah</th>
            </tr>
        </thead>
        <tbody>
            @forelse($transactions as $tx)
                <tr>
                    <td>{{ date('d/m/Y', strtotime($tx->created_at)) }}</td>
                    <td>
                        <span class="badge">
                            {{ $tx->source_type }}
                        </span>
                    </td>
                    <td>{{ $tx->description }}</td>
                    <td class="text-right">
                        Rp {{ number_format($tx->amount, 0, ',', '.') }}
                    </td>
                </tr>
            @empty
                <tr>
                    <td colspan="4" class="text-center">Tidak ada data pengeluaran pada periode ini.</td>
                </tr>
            @endforelse
        </tbody>
    </table>

    <div class="footer">
        <p>{{ $city }}, {{ date('d F Y') }}</p>
        <p>Mengetahui,</p>
        <br><br><br>
        <p><strong>Ketua RT</strong></p>
    </div>
</body>
</html>
