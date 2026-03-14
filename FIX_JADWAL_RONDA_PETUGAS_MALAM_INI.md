# Perbaikan Jadwal Ronda - Petugas Malam Ini

## Masalah
Pada menu "Jadwal Ronda" role warga, module "Petugas Malam Ini" menampilkan Hari dan tanggal yang tidak sesuai dengan yang ACTIVE. 

**Contoh:**
- Hari ini: **Sabtu, 14 Maret 2026**
- Schedule active: 9-15 Maret 2026 (WEEKLY)
- Yang ditampilkan: **Senin, 09 Mar 2026** ❌ (tanggal mulai schedule)
- Seharusnya: **Sabtu, 14 Mar 2026** ✅ (hari ini sebenarnya)

## Penyebab
1. **Ordering yang salah**: Schedule diurutkan berdasarkan `created_at DESC`, sehingga schedule yang paling baru dibuat selalu muncul pertama, bukan yang paling sesuai dengan hari ini.

2. **Label tanggal yang salah**: Field `day_of_week` menggunakan `start_date` dari schedule, bukan tanggal hari ini yang sebenarnya. Untuk schedule WEEKLY yang mencakup beberapa hari (contoh: 9-15 Maret), seharusnya menampilkan tanggal HARI INI, bukan tanggal mulai.

## Solusi

### File yang Diubah

#### 1. `api/app/Http/Controllers/Api/PatrolController.php`

**Perubahan 1: Ordering Schedule (Line ~119-133)**
```php
// SEBELUM:
->orderByDesc('created_at')

// SESUDAH:
->orderBy('schedule_type', 'desc') // WEEKLY sebelum DAILY
->orderBy('start_time', 'asc')     // Shift paling awal dulu
```

**Alasan**: 
- WEEKLY schedules lebih prioritas daripada DAILY
- Untuk shift malam yang sama, yang mulai paling awal (misal 22:00) ditampilkan dulu

**Perubahan 2: Logic day_of_week (Line ~190-241)**
```php
// SEBELUM: Menggunakan start_date schedule
if ($schedule->start_date) {
    $parsed = Carbon::parse($schedule->start_date);
    $dayNameId = $dayMapId[$parsed->format('l')] ?? $parsed->format('l');
    $dateLabel = $parsed->format('d M Y');
    $dayLabel = "{$dayNameId}, {$dateLabel}";
}

// SESUDAH: Cek apakah hari ini ada dalam range schedule
if ($schedule->start_date && $schedule->end_date) {
    $startCarbon = Carbon::parse($schedule->start_date);
    $endCarbon = Carbon::parse($schedule->end_date);
    
    if ($todayCarbon->between($startCarbon, $endCarbon)) {
        // Hari ini ada dalam range - gunakan TANGGAL HARI INI
        $dayLabel = "{$todayDayNameId}, {$todayDateLabel}";
    } else {
        // Fallback ke start_date
        $dayLabel = "{$dayNameId}, {$dateLabel}";
    }
}
```

**Alasan**: 
- Untuk schedule WEEKLY (9-15 Maret), jika hari ini Sabtu 14 Maret, tampilkan "Sabtu, 14 Mar 2026"
- Hanya gunakan start_date untuk schedule DAILY atau jika tanggal tidak ada dalam range

#### 2. `test_patrol_today.php`

Updated test file untuk mencerminkan ordering baru:
```php
->orderBy('schedule_type', 'desc')
->orderBy('start_time', 'asc')
```

## Hasil Testing

### Sebelum Fix
```
Schedule ID: 102
  Shift Name: Legit Schedule
  Type: WEEKLY
  Start Date: 2026-03-09
  End Date: 2026-03-15
  ➤ Display Label: Legit Schedule — Senin, 09 Mar 2026 ❌
  ✓ Within Range: YES
  ★ Correct Label: Legit Schedule — Sabtu, 14 Mar 2026
```

### Sesudah Fix
```
Schedule #1
  ID: 102
  Shift Name: Legit Schedule
  Type: WEEKLY
  Date Range: 2026-03-09 s/d 2026-03-15
  Time: 22:00:00 - 04:00:00
  ➤ day_of_week (API Response): Legit Schedule — Sabtu, 14 Mar 2026 ✅
```

## Test Files

Dibuat 2 file testing untuk verifikasi:

1. **`test_patrol_today.php`** - Testing query dasar dan ordering
2. **`test_patrol_api_transform.php`** - Simulasi EXACT transformation API untuk memverifikasi output

Jalankan test:
```bash
php test_patrol_api_transform.php
```

## Dampak

### Mobile App (warga)
- Badge "Petugas Malam Ini" sekarang menampilkan **hari dan tanggal yang BENAR**
- Contoh: "Sabtu, 14 Mar 2026" alih-alih "Senin, 09 Mar 2026"

### Web Admin
- Tidak ada dampak langsung (hanya backend fix)
- Ordering schedule lebih konsisten (WEEKLY dulu, lalu by start_time)

## Edge Cases yang Ditangani

1. **WEEKLY schedule dengan date range**: Gunakan tanggal hari ini jika dalam range ✅
2. **DAILY schedule tanpa end_date**: Gunakan start_date ✅  
3. **Legacy schedule tanpa dates**: Gunakan tanggal hari ini sebagai fallback ✅
4. **Multiple schedules aktif**: Urutkan by type (WEEKLY first) then by start_time ✅

## Tanggal Fix
2026-03-14

## Status
✅ **SELESAI - Siap untuk Production**
