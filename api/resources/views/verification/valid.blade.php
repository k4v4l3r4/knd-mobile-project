<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Validasi Dokumen Digital - RT Online</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50 min-h-screen flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
        <div class="bg-green-600 p-6 text-center">
            <div class="mx-auto bg-white rounded-full w-20 h-20 flex items-center justify-center mb-4">
                <svg class="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
            </div>
            <h1 class="text-white text-2xl font-bold">DOKUMEN ASLI</h1>
            <p class="text-green-100 mt-1 text-sm">Terverifikasi Digital</p>
        </div>
        
        <div class="p-6 space-y-6">
            <div class="text-center border-b border-gray-100 pb-6">
                <p class="text-gray-500 text-sm">Kode Verifikasi</p>
                <p class="text-xl font-mono font-bold text-gray-800 tracking-wider">{{ $letter->verification_code }}</p>
            </div>

            <div class="space-y-4">
                <div>
                    <label class="text-xs font-semibold text-gray-400 uppercase">Jenis Surat</label>
                    <p class="text-gray-800 font-medium">{{ $letter->type }}</p>
                </div>
                
                <div>
                    <label class="text-xs font-semibold text-gray-400 uppercase">Pemohon</label>
                    <p class="text-gray-800 font-medium">{{ $letter->user->name }}</p>
                    <p class="text-sm text-gray-500">{{ $letter->user->nik }}</p>
                </div>

                <div>
                    <label class="text-xs font-semibold text-gray-400 uppercase">Tanggal Disetujui</label>
                    <p class="text-gray-800 font-medium">{{ $letter->approved_at ? $letter->approved_at->translatedFormat('d F Y H:i') : '-' }}</p>
                </div>

                <div>
                    <label class="text-xs font-semibold text-gray-400 uppercase">Penandatangan</label>
                    <p class="text-gray-800 font-medium">Ketua RT {{ $letter->rt->rt_number ?? '-' }}</p>
                    <p class="text-sm text-gray-500">Kec. {{ $letter->rt->district ?? '-' }}, Kel. {{ $letter->rt->subdistrict ?? '-' }}</p>
                </div>
            </div>

            <div class="bg-blue-50 p-4 rounded-xl text-xs text-blue-800 leading-relaxed">
                <span class="font-bold">Catatan:</span> Dokumen ini telah ditandatangani secara elektronik oleh sistem RT Online dan sah secara hukum sesuai dengan ketentuan yang berlaku.
            </div>
        </div>

        <div class="bg-gray-50 p-4 text-center text-xs text-gray-400">
            &copy; {{ date('Y') }} RT Online SuperApp
        </div>
    </div>
</body>
</html>
