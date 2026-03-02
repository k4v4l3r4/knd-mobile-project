<!DOCTYPE html>
<html>
<head>
    <title>Surat Pengantar</title>
    <style>
        body {
            font-family: 'Times New Roman', Times, serif;
            line-height: 1.6;
            margin: 0;
            padding: 0;
        }
        .header {
            text-align: center;
            border-bottom: 3px double #000;
            padding-bottom: 10px;
            margin-bottom: 20px;
        }
        .header h2, .header h3 {
            margin: 0;
            text-transform: uppercase;
        }
        .header p {
            margin: 0;
            font-size: 14px;
        }
        .content {
            margin: 20px 40px;
        }
        .title {
            text-align: center;
            text-decoration: underline;
            font-weight: bold;
            font-size: 16px;
            margin-bottom: 5px;
        }
        .number {
            text-align: center;
            margin-bottom: 20px;
        }
        .table {
            width: 100%;
            margin-bottom: 20px;
        }
        .table td {
            vertical-align: top;
            padding: 5px;
        }
        .label {
            width: 150px;
        }
        .footer {
            margin-top: 50px;
            text-align: right;
            margin-right: 40px;
        }
        .signature {
            margin-top: 60px;
            font-weight: bold;
            text-decoration: underline;
        }
        .qr-code {
            position: absolute;
            bottom: 40px;
            left: 40px;
            width: 80px;
            height: 80px;
        }
        @font-face {
            font-family: 'SignatureFont';
            src: url('{{ public_path("fonts/GreatVibes-Regular.ttf") }}') format("truetype");
            font-weight: normal;
            font-style: normal;
        }
        .signature-text {
            font-family: 'SignatureFont', sans-serif;
            font-size: 24px;
            color: #000;
        }
    </style>
</head>
<body>
    <div class="header">
        <h3>RUKUN TETANGGA {{ $rt_number }} / RUKUN WARGA {{ $rw_number }}</h3>
        <h3>KELURAHAN {{ $subdistrict }} KECAMATAN {{ $district }}</h3>
        <h2>{{ $city }}</h2>
        <p>{{ $address }}</p>
    </div>

    <div class="content">
        <div class="title">SURAT PENGANTAR</div>
        <div class="number">Nomor: {{ $letter->letter_number }}</div>

        <p>Yang bertanda tangan di bawah ini Ketua RT {{ $rt_number }} RW {{ $rw_number }} Kelurahan {{ $subdistrict }} Kecamatan {{ $district }}, menerangkan bahwa:</p>

        <table class="table">
            <tr>
                <td class="label">Nama</td>
                <td>: {{ $user->name }}</td>
            </tr>
            <tr>
                <td class="label">NIK</td>
                <td>: {{ $user->nik }}</td>
            </tr>
            <tr>
                <td class="label">Tempat/Tgl Lahir</td>
                <td>: {{ $user->place_of_birth }}, {{ \Carbon\Carbon::parse($user->date_of_birth)->isoFormat('D MMMM Y') }}</td>
            </tr>
            <tr>
                <td class="label">Jenis Kelamin</td>
                <td>: {{ $user->gender == 'L' ? 'Laki-laki' : 'Perempuan' }}</td>
            </tr>
            <tr>
                <td class="label">Pekerjaan</td>
                <td>: {{ $user->occupation }}</td>
            </tr>
            <tr>
                <td class="label">Agama</td>
                <td>: {{ $user->religion }}</td>
            </tr>
            <tr>
                <td class="label">Status Perkawinan</td>
                <td>: {{ str_replace('_', ' ', $user->marital_status) }}</td>
            </tr>
            <tr>
                <td class="label">Alamat</td>
                <td>: {{ $user->address }}</td>
            </tr>
        </table>

        <p>Orang tersebut di atas, adalah benar-benar warga kami yang berdomisili di alamat tersebut. Surat pengantar ini diberikan untuk keperluan:</p>
        
        <p style="text-align: center; font-weight: bold; margin: 20px 0;">"{{ $letter->purpose }}"</p>

        <p>Demikian surat pengantar ini dibuat untuk dapat dipergunakan sebagaimana mestinya.</p>
    </div>

    <div class="footer">
        <p>{{ $city }}, {{ \Carbon\Carbon::now()->isoFormat('D MMMM Y') }}</p>
        <p>Ketua RT {{ $rt_number }}</p>
        
        @if(isset($approver) && $approver->signature_type == 'image' && $approver->signature_image)
            <div style="margin-top: 10px; margin-bottom: 10px;">
                @php
                    $sigPath = public_path(parse_url($approver->signature_image, PHP_URL_PATH));
                @endphp
                @if(file_exists($sigPath))
                    <img src="{{ $sigPath }}" style="height: 60px; max-width: 150px; vertical-align: middle;" alt="Signature" />
                @endif
                
                @if($qr_code_url)
                    <img src="{{ $qr_code_url }}" style="height: 60px; margin-left: 10px; vertical-align: middle;" alt="QR" />
                @endif
            </div>
            <div style="font-weight: bold; text-decoration: underline;">{{ $approver->name }}</div>
        
        @elseif(isset($approver) && $approver->signature_type == 'qr_only')
             <div style="margin-top: 20px; margin-bottom: 20px;">
                @if($qr_code_url)
                    <img src="{{ $qr_code_url }}" style="height: 80px;" alt="QR" />
                @endif
                <div style="font-size: 10px; margin-top: 5px; color: #555;">Ditandatangani secara elektronik</div>
            </div>
            <div style="font-weight: bold; text-decoration: underline;">{{ $approver->name }}</div>

        @else 
            {{-- Auto Font (Default) --}}
            <div class="signature-text" style="margin-top: 20px; margin-bottom: 10px;">
                {{ $approver->name ?? $rt_chairman_name }}
                 @if($qr_code_url)
                    <img src="{{ $qr_code_url }}" style="height: 50px; margin-left: 10px; vertical-align: middle;" alt="QR" />
                @endif
            </div>
            <div style="font-weight: bold; text-decoration: underline;">{{ $approver->name ?? $rt_chairman_name }}</div>
        @endif
    </div>
</body>
</html>
