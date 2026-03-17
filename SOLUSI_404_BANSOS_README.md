# SOLUSI ERROR 404 "Lihat Foto" - BANSOS

## 🚨 STATUS: TIDAK ADA FOTO DI DATABASE

Hasil investigasi menunjukkan:
- ✅ Storage link sudah ada
- ✅ APP_URL sudah benar (https://api.afnet.my.id)
- ✅ Model BansosHistory sudah punya accessor untuk URL
- ❌ **TIDAK ADA evidence_photo di database**

## ⚠️ PENYEBAB ERROR 404

Error 404 muncul karena **BELUM ADA foto yang diupload** saat menyalurkan bantuan. Tombol "Lihat Foto" hanya muncul JIKA ada foto (`item.evidence_photo`).

Jika Anda melihat error 404, kemungkinan:

1. **Data uji coba tanpa foto** - Mencoba klik "Lihat Foto" pada data dummy/demo
2. **Upload gagal** - Proses upload foto tidak berhasil saat distribusi
3. **File terhapus** - Foto pernah diupload tapi file-nya terhapus dari storage

## ✅ CARA MEMPERBAIKI

### Langkah 1: Upload Foto Bukti

1. Buka **Web Admin**: https://api.afnet.my.id/dashboard/bansos
2. Pilih tab **"Penyaluran"** atau **"Riwayat"**
3. Klik tombol **"Salurkan"** pada penerima dengan status **LAYAK**
4. Isi form penyaluran:
   ```
   Nama Program: BLT Januari 2026
   Jumlah: 300000
   ```
5. **PENTING**: Klik bagian **"Bukti Foto (Opsional)"** dan upload foto
   - Klik area upload
   - Pilih file gambar dari komputer
   - Pastikan preview foto muncul
6. Klik **"Konfirmasi Penyaluran"**

### Langkah 2: Verifikasi Foto Tersimpan

Jalankan script verifikasi:

```bash
cd C:\Users\Administrator\knd-rt-online
php test_bansos_photo_url.php
```

Harusnya muncul output seperti ini jika berhasil:

```
1. DATABASE CHECK:
   Found 1 records with evidence photos:

   ID: 1
   Program: BLT Januari 2026
   Path in DB: bansos_evidence/abc123def456.jpg
   evidence_photo_url attribute: https://api.afnet.my.id/storage/bansos_evidence/abc123def456.jpg
   Full server path: C:\...\storage\app\public\bansos_evidence\abc123def456.jpg
   ✓ File EXISTS on server
   Expected public URL: https://api.afnet.my.id/storage/bansos_evidence/abc123def456.jpg

3. STORAGE SYMLINK CHECK:
   ✓ Symlink exists
   ✓ Symlink points to correct location

4. URL ACCESSIBILITY TEST:
   Testing URL: https://api.afnet.my.id/storage/bansos_evidence/abc123def456.jpg
   ✓ URL is ACCESSIBLE (HTTP 200)
```

### Langkah 3: Test di Browser

1. Buka tab **"Riwayat"** di web-admin
2. Cari penyaluran yang baru dibuat
3. Klik tombol **"Lihat Foto"**
4. Foto harusnya terbuka di tab baru **TANPA ERROR 404**

## 🔧 TROUBLESHOOTING

### Jika Upload Gagal

**Gejala**: Form submit tapi foto tidak tersimpan

**Solusi**:
```bash
# Cek folder permissions
cd api
chmod -R 775 storage/app/public

# Clear cache
php artisan config:clear
php artisan cache:clear
```

### Jika File Tidak Ditemukan di Server

**Gejala**: `test_bansos_photo_url.php` menunjukkan "✗ File NOT FOUND"

**Kemungkinan Penyebab**:
1. Upload gagal sebagian (DB terupdate tapi file tidak)
2. File terhapus manual
3. Folder storage berbeda environment (development vs production)

**Solusi**:
```bash
# Re-create storage link
cd api
php artisan storage:link --force

# Verify folder exists
dir storage\app\public\bansos_evidence
```

### Jika URL Masih 404 Setelah Upload

**Kemungkinan**: Web server configuration issue

**Untuk Production Server (Linux)**:
```bash
# Set proper permissions
sudo chown -R www-data:www-data /var/www/html/api/storage/app/public
sudo chmod -R 775 /var/www/html/api/storage/app/public
sudo chmod -R 755 /var/www/html/api/public/storage

# Restart web server
sudo systemctl restart nginx
# atau
sudo systemctl restart apache2
```

**Untuk Local Development (Windows)**:
```powershell
# Run Laravel development server
cd api
php artisan serve
```

Pastikan akses via: http://localhost:8000/storage/bansos_evidence/foto.jpg

## 📊 TESTING checklist

Setelah upload foto, pastikan semua ini ✓:

- [ ] Foto ter-upload saat form distribute
- [ ] Path tersimpan di database (kolom evidence_photo)
- [ ] File fisik ada di `storage/app/public/bansos_evidence/`
- [ ] Script `test_bansos_photo_url.php` menunjukkan semua ✓
- [ ] URL accessible via browser (HTTP 200)
- [ ] Tombol "Lihat Foto" berfungsi tanpa 404

## 🎯 KESIMPULAN

**Error 404 "Lihat Foto" terjadi karena BELUM ADA foto yang diupload.**

**Solusi**: 
1. Upload foto bukti saat menyalurkan bantuan
2. Verifikasi dengan `test_bansos_photo_url.php`
3. Test tombol "Lihat Foto" di browser

**Fix sudah tersedia di**:
- ✅ Model accessor: `api/app/Models/BansosHistory.php`
- ✅ Frontend URL handler: `web-admin/app/dashboard/bansos/page.tsx`
- ✅ Verification script: `test_bansos_photo_url.php`

---

**Updated**: March 17, 2026
**Priority**: HIGH
**Status**: READY FOR TESTING
