# Fix Absensi Ronda - Time Tolerance & Timezone Sync

## Masalah
Warga tidak bisa melakukan absensi ronda meskipun sudah menunjukkan waktu yang tepat (misal 22:21), karena sistem menampilkan error:
> "Absensi hanya dapat dilakukan pada jam operasional (22:19 - 00:05)"

**Penyebab:**
1. Tidak ada toleransi waktu antara jam server dan HP warga
2. Timezone Laravel belum di-set ke Asia/Jakarta (masih UTC)
3. Pesan error tidak menampilkan informasi waktu server untuk debugging

## Solusi yang Diterapkan

### 1. Timezone Configuration ✅
**File:** `api/config/app.php`
- Mengubah default timezone dari `UTC` ke `Asia/Jakarta` (WIB)
- Menambahkan environment variable `APP_TIMEZONE` untuk fleksibilitas

**File:** `api/.env` dan `api/.env.example`
- Menambahkan `APP_TIMEZONE=Asia/Jakarta`

### 2. Time Tolerance (5 Menit) ✅
**File:** `api/app/Http/Controllers/Api/RondaController.php`
- Menambahkan toleransi waktu **5 menit** pada validasi jam operasional
- Jika selisih waktu antara HP warga dan server ≤ 5 menit, absensi tetap diperbolehkan
- Ini mengatasi masalah sinkronisasi waktu antara device warga dan server

### 3. Improved Error Messages ✅
Pesan error sekarang menampilkan:
- Jam server saat ini (H:i:s)
- Tanggal server (Y-m-d)
- Jadwal operasional ronda
- Informasi berapa menit terlalu cepat atau terlambat
- Besarnya toleransi yang diberikan

**Contoh Error Message Baru:**
```
Absensi hanya dapat dilakukan pada jam operasional ronda (22:00 - 04:00). 
Jam server saat ini: 22:21:35 (2026-03-15) - Sudah terlambat 21 menit dari jadwal berakhir.
```

**Response JSON Error:**
```json
{
  "success": false,
  "message": "Absensi hanya dapat dilakukan pada jam operasional ronda (22:00 - 04:00). Jam server saat ini: 22:21:35 (2026-03-15) - Sudah terlambat 21 menit dari jadwal berakhir.",
  "server_time": "22:21:35",
  "server_date": "2026-03-15",
  "operational_start": "22:00",
  "operational_end": "04:00",
  "tolerance_minutes": 5
}
```

## Logic Validasi Waktu dengan Tolerance

### Skenario 1: Shift Hari yang Sama (08:00 - 16:00)
- Waktu sekarang: 07:57 → **Ditolak** (terlalu cepat 3 menit, masih dalam tolerance)
- Waktu sekarang: 07:54 → **Ditolak** (terlalu cepat 6 menit, luar tolerance)
- Waktu sekarang: 08:00 - 16:00 → **Diterima** ✅
- Waktu sekarang: 16:03 → **Diterima** ✅ (terlambat 3 menit, masih dalam tolerance)
- Waktu sekarang: 16:06 → **Ditolak** (terlambat 6 menit, luar tolerance)

### Skenario 2: Shift Lintas Hari (22:00 - 04:00)
- Waktu sekarang: 21:56 → **Diterima** ✅ (terlalu cepat 4 menit, masih tolerance)
- Waktu sekarang: 22:00 - 23:59 → **Diterima** ✅
- Waktu sekarang: 00:00 - 04:00 → **Diterima** ✅
- Waktu sekarang: 04:03 → **Diterima** ✅ (terlambat 3 menit, masih tolerance)
- Waktu sekarang: 04:06 → **Ditolak** (terlambat 6 menit, luar tolerance)
- Waktu sekarang: 05:00 - 21:55 → **Ditolak** (di luar jadwal)

## Testing

### Test Case 1: Absensi dengan Waktu dalam Tolerance
```bash
curl -X POST https://api.afnet.my.id/api/ronda-schedules/scan-attendance \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "qr_token": "{QR_TOKEN}",
    "latitude": -6.2088,
    "longitude": 106.8456
  }'
```

### Test Case 2: Cek Response Error Detail
Jika absensi ditolak karena waktu, response akan berisi detail lengkap termasuk `server_time`.

## Database Migration Check

Pastikan database menggunakan timezone yang benar:

```sql
-- Cek timezone setting MySQL
SHOW VARIABLES LIKE 'time_zone';

-- Set session timezone (jika perlu)
SET time_zone = '+07:00';
```

## Deployment Steps

1. **Update Production Server:**
   ```bash
   cd /path/to/api
   php artisan config:clear
   php artisan cache:clear
   ```

2. **Verify Timezone:**
   ```bash
   php artisan tinker
   >>> now()->timezone
   => "Asia/Jakarta"
   >>> now()->format('Y-m-d H:i:s')
   => "2026-03-15 22:21:35"
   ```

3. **Test Absensi:**
   - Coba absensi pada waktu yang mepet dengan tolerance
   - Verifikasi error message menampilkan server time

## Files Modified

1. ✅ `api/config/app.php` - Timezone configuration
2. ✅ `api/.env` - Added APP_TIMEZONE
3. ✅ `api/.env.example` - Added APP_TIMEZONE example
4. ✅ `api/app/Http/Controllers/Api/RondaController.php` - Time validation with tolerance **FROM DATABASE**
5. ✅ `api/app/Services/RondaFineService.php` - Already using tolerance from database

## Integration with Pengaturan Denda Ronda

### Web Admin Settings Page
**URL:** `/dashboard/jadwal-ronda/pengaturan-denda`
**File:** `web-admin/app/dashboard/jadwal-ronda/pengaturan-denda/page.tsx`

**Settings Structure:**
```typescript
interface FineSetting {
  fine_type: "TIDAK_HADIR" | "TELAT" | "PULANG_CEPAT";
  amount: number;              // Nominal denda
  tolerance_minutes: number;   // Toleransi waktu (menit)
  is_active: boolean;          // Aktif/tidak aturan ini
}
```

### How It Works Now

**1. Admin Configures Tolerance:**
- Buka menu "Pengaturan Denda Ronda"
- Set tolerance untuk TELAT = 15 menit (contoh)
- Klik "Simpan Perubahan"
- Data tersimpan di tabel `ronda_fine_settings`

**2. Warga Absensi (Controller):**
- System mengambil tolerance dari database (`tolerance_minutes`)
- Fallback ke 5 menit jika tidak ada konfigurasi
- Validasi: `|currentTime - scheduleTime| <= toleranceMinutes`

**3. Generate Denda (Service):**
- Saat close schedule, system generate denda
- Menggunakan tolerance yang SAMA dari database
- Konsisten antara validasi absensi dan generate denda

### Example Flow

```
Admin Setting: TELAT tolerance = 15 menit

Scenario 1: Warga absen telat 10 menit
✅ Controller: ACCEPTED (10 < 15)
✅ Service: NO FINE (10 < 15)
Result: Tidak kena denda

Scenario 2: Warga absen telat 20 menit
❌ Controller: REJECTED (20 > 15)
Result: Tidak bisa absensi

Scenario 3: Warga absen telat 18 menit (dengan tolerance controller)
✅ Controller: ACCEPTED (18 > 15, tapi masih dalam tolerance)
❌ Service: FINED (18 > 15)
Result: Bisa absensi tapi kena denda TELAT
```

**Note:** Untuk menghindari kebingungan, tolerance di controller sekarang diambil dari database setting (TELAT tolerance), bukan hardcoded 5 menit lagi.

## Next Steps (Optional Improvements)

1. **Configurable Tolerance:** Simpan nilai tolerance di database (misal di tabel `rt_settings`) agar bisa diubah-ubah tanpa deploy code
2. **Time Sync Warning:** Tampilkan warning di mobile app jika waktu HP berbeda jauh dengan server time
3. **Grace Period UI:** Tampilkan countdown di mobile app kapan waktu absensi berikutnya akan dibuka

## Notes

- Tolerance 5 menit dianggap cukup untuk mengakomodasi perbedaan waktu antara server dan device warga
- GPS validation tetap berjalan seperti sebelumnya - warga harus berada dalam radius lokasi ronda
- Timezone Asia/Jakarta (WIB = UTC+7) sesuai dengan lokasi Indonesia
