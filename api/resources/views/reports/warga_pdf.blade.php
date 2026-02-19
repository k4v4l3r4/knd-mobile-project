<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Data Warga</title>
    <style>
        @page {
            size: A4 portrait;
            margin: 2cm;
        }
        body {
            font-family: sans-serif;
            font-size: 11px;
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
            margin: 4px 0 0;
            font-size: 12px;
        }
        .meta {
            margin-bottom: 15px;
            width: 100%;
        }
        .meta td {
            padding: 2px 0;
        }
        table.data {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
        }
        table.data th,
        table.data td {
            border: 1px solid #ddd;
            padding: 4px 6px;
        }
        table.data th {
            background-color: #f3f4f6;
            font-weight: bold;
            font-size: 10px;
        }
        table.data td {
            font-size: 9px;
        }
        .text-center {
            text-align: center;
        }
        .text-right {
            text-align: right;
        }
        .footer {
            margin-top: 30px;
            text-align: right;
            font-size: 11px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>DATA WARGA</h1>
        <p>{{ $rt_name }}</p>
    </div>

    <table class="meta">
        <tr>
            <td><strong>Jumlah Warga:</strong> {{ $wargas->count() }}</td>
            <td class="text-right"><strong>Tanggal Cetak:</strong> {{ $generated_at->format('d/m/Y H:i') }}</td>
        </tr>
    </table>

    <table class="data">
        <thead>
            <tr>
                <th class="text-center" style="width: 25px;">No</th>
                <th style="width: 140px;">Nama</th>
                <th style="width: 90px;">NIK</th>
                <th style="width: 90px;">No. KK</th>
                <th style="width: 80px;">No. Telp</th>
                <th style="width: 80px;">Hubungan Keluarga</th>
                <th style="width: 40px;">JK</th>
                <th style="width: 80px;">Tempat Lahir</th>
                <th style="width: 70px;">Tanggal Lahir</th>
                <th style="width: 55px;">Umur</th>
                <th style="width: 60px;">Agama</th>
                <th>Alamat</th>
                <th style="width: 40px;">Blok</th>
                <th style="width: 30px;">RT</th>
                <th style="width: 30px;">RW</th>
            </tr>
        </thead>
        <tbody>
            @forelse($wargas as $index => $warga)
                <tr>
                    <td class="text-center">{{ $index + 1 }}</td>
                    <td>{{ $warga->name }}</td>
                    <td>{{ $warga->nik }}</td>
                    <td>{{ $warga->kk_number }}</td>
                    <td>{{ $warga->phone }}</td>
                    <td>{{ $warga->status_in_family }}</td>
                    <td class="text-center">{{ $warga->gender }}</td>
                    <td>{{ $warga->place_of_birth }}</td>
                    @php
                        $birth = null;
                        if (!empty($warga->date_of_birth)) {
                            try {
                                $birth = \Carbon\Carbon::parse($warga->date_of_birth);
                            } catch (\Exception $e) {
                                $birth = null;
                            }
                        }
                    @endphp
                    <td class="text-center">
                        @if($birth)
                            {{ $birth->format('d/m/Y') }}
                        @else
                            -
                        @endif
                    </td>
                    <td class="text-center">
                        @if($birth)
                            {{ $birth->age }} Tahun
                        @else
                            -
                        @endif
                    </td>
                    <td>{{ $warga->religion }}</td>
                    <td>{{ $warga->address }}</td>
                    <td class="text-center">{{ $warga->block }}</td>
                    <td class="text-center">{{ $warga->address_rt }}</td>
                    <td class="text-center">{{ $warga->address_rw }}</td>
                </tr>
            @empty
                <tr>
                    <td colspan="15" class="text-center">Tidak ada data warga.</td>
                </tr>
            @endforelse
        </tbody>
    </table>

    <div class="footer">
        <p>{{ $city }}, {{ $generated_at->format('d F Y') }}</p>
        <p>Mengetahui,</p>
        <br><br><br>
        <p><strong>Ketua RT</strong></p>
    </div>
</body>
</html>
