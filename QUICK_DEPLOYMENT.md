# 🚀 Quick Deployment Guide - Production Server

## For Server: `/www/wwwroot/knd-mobile-project`

### ✅ Step-by-Step Deployment

#### 1. Upload New Code Files

**Backend (API) - Upload these 3 files:**
```
/www/wwwroot/knd-mobile-project/api/app/Http/Controllers/Api/ReportController.php
/www/wwwroot/knd-mobile-project/api/app/Http/Controllers/Api/Warga/DashboardController.php
/www/wwwroot/knd-mobile-project/api/app/Console/Commands/CleanupDummyData.php
```

**Mobile App - Upload these 3 files:**
```
/www/wwwroot/knd-mobile-project/mobile-warga/src/screens/BansosScreen.tsx
/www/wwwroot/knd-mobile-project/mobile-warga/src/screens/HomeScreen.tsx
/www/wwwroot/knd-mobile-project/mobile-warga/src/screens/ReportScreen.tsx
```

---

#### 2. Run Backend Commands

SSH into your server and run:

```bash
cd /www/wwwroot/knd-mobile-project/api

# Clear all cache
php artisan cache:clear
php artisan config:clear
php artisan route:clear

# Run data cleanup
php artisan data:cleanup-dummy
```

**Expected output:**
```
🧹 Starting Data Cleanup...

📋 Cleaning up Reports...
  - Menghapus: Rudal Balistik
  - Menghapus: Penyerangan Pos Ronda
  + Menambahkan laporan realistis...
    ✓ Lampu Jalan Mati di Gang 3
    ✓ Jadwal Kerja Bakti Minggu Ini
    ✓ Sampah Belum Diangkut 2 Hari
✅ Reports cleanup complete!

🗳️  Cleaning up Polls...
  - Menghapus: [unrealistic polls]
  + Menambahkan voting realistis...
    ✓ Pemilihan Ketua RT 05 Periode 2026-2029
    ✓ Usulan Kegiatan 17 Agustus 2026
✅ Polls cleanup complete!

✨ Data cleanup completed successfully!
```

---

#### 3. Restart Services (Optional but Recommended)

```bash
# Restart PHP-FPM (if using aaPanel)
/etc/init.d/php-fpm-8.1 restart
# OR for other PHP versions:
# /etc/init.d/php-fpm-7.4 restart

# Restart Nginx
/etc/init.d/nginx restart

# Restart queue workers (if running)
cd /www/wwwroot/knd-mobile-project/api
php artisan queue:restart
```

---

#### 4. Rebuild Mobile App (If Needed)

For web version:
```bash
cd /www/wwwroot/knd-mobile-project/mobile-warga
npm install
npx expo export:web
```

For Android APK:
```bash
cd /www/wwwroot/knd-mobile-project/mobile-warga
eas build --platform android
```

---

### ✅ Testing Checklist

After deployment, test each feature:

#### 1. Test Back Button Fix (Bansos)
- ✅ Login as ADMIN_RT
- ✅ Go to Bansos menu
- ✅ Click "Tambah Penerima"
- ✅ Press hardware back button (Android) or gesture back
- ✅ **Expected:** Modal closes cleanly, no visual artifacts

#### 2. Test Report Notifications
**As Citizen (Warga):**
- ✅ Submit new report with title "Test Laporan"
- ✅ Check citizen phone for confirmation notification

**As RT Admin:**
- ✅ Check notification bell shows red badge
- ✅ Tap notification → opens Report screen
- ✅ See the new report in list

#### 3. Test Badge Counter
- ✅ Login as ADMIN_RT or RT
- ✅ Check "Laporan" menu icon
- ✅ **Expected:** Red badge with number appears if there are pending reports

#### 4. Test WhatsApp Contact Button
- ✅ Login as ADMIN_RT
- ✅ Open "Laporan" menu
- ✅ Find a report with reporter phone number
- ✅ Click green "Hubungi Warga" button
- ✅ **Expected:** WhatsApp opens with pre-filled message:
  ```
  Halo [Nama Warga], saya dari pengurus RT terkait laporan Anda: "[Judul Laporan]". Mohon informasi lebih lanjut.
  ```

#### 5. Verify Clean Data
- ✅ Open Reports list
- ✅ **Check:** No unrealistic titles like "Rudal Balistik"
- ✅ **Check:** Realistic reports like "Lampu Jalan Mati", "Kerja Bakti", etc.

- ✅ Open Voting/Polls
- ✅ **Check:** No unrealistic polls
- ✅ **Check:** Realistic voting like "Pemilihan Ketua RT", "Kegiatan 17 Agustus"

---

### 🔧 Troubleshooting

#### Error: `Failed opening required 'bootstrap/app.php'`
**Solution:** Make sure you're running commands from the `api` directory:
```bash
cd /www/wwwroot/knd-mobile-project/api
php artisan data:cleanup-dummy
```

#### Error: Class 'CleanupDummyData' not found
**Solution:** Regenerate autoload files:
```bash
cd /www/wwwroot/knd-mobile-project/api
composer dump-autoload
php artisan data:cleanup-dummy
```

#### Badge counter not showing
**Solution:** 
1. Check database has pending reports:
```bash
cd /www/wwwroot/knd-mobile-project/api
php artisan tinker
>>> App\Models\Report::where('status', 'PENDING')->count();
```
2. Clear mobile app cache/data
3. Re-login as RT user

#### WhatsApp button not appearing
**Solution:**
1. Ensure report has reporter phone number
2. Check user role is ADMIN_RT or RT
3. Verify phone number format in database (should be like `08xxxxxxxxxx`)

---

### 📞 Support

If you encounter any issues during deployment:

1. Check Laravel logs:
```bash
tail -f /www/wwwroot/knd-mobile-project/api/storage/logs/laravel.log
```

2. Check nginx error log:
```bash
tail -f /www/server/logs/error.log
```

3. Verify PHP version matches requirements (PHP 8.1+)

---

### ✅ Success Criteria

Deployment is successful when:
- ✅ All cache cleared without errors
- ✅ Data cleanup runs successfully
- ✅ Back button closes modals properly
- ✅ Report notifications work (two-way)
- ✅ Badge counter shows on Report menu
- ✅ WhatsApp button works for contacting reporters
- ✅ Database contains only realistic data

**Ready for production demo!** 🎉
