<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Validasi Gagal - RT Online</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50 min-h-screen flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
        <div class="bg-red-600 p-6 text-center">
            <div class="mx-auto bg-white rounded-full w-20 h-20 flex items-center justify-center mb-4">
                <svg class="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
            </div>
            <h1 class="text-white text-2xl font-bold">TIDAK DITEMUKAN</h1>
            <p class="text-red-100 mt-1 text-sm">Dokumen Tidak Valid atau Palsu</p>
        </div>
        
        <div class="p-8 text-center space-y-4">
            <p class="text-gray-600">
                Maaf, kode verifikasi yang Anda scan tidak ditemukan dalam database kami.
            </p>
            
            <div class="bg-red-50 p-4 rounded-xl border border-red-100">
                <p class="text-sm text-red-800">
                    Pastikan Anda memindai QR Code dari dokumen resmi yang dikeluarkan oleh RT Online.
                </p>
            </div>
        </div>

        <div class="bg-gray-50 p-4 text-center text-xs text-gray-400">
            &copy; {{ date('Y') }} RT Online SuperApp
        </div>
    </div>
</body>
</html>
