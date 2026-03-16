# 🚀 URGENT: Deploy Fix to Production Server

## Problem
Production server masih menggunakan kode lama yang menyebabkan error:
```
SQLSTATE[23502]: Not null violation: 7 ERROR: null value in column "notifiable_type" 
of relation "notifications" violates not-null constraint
```

**Error Location:** `/www/wwwroot/knd-mobile-project/api/app/Http/Controllers/Api/AssetController.php` line 297

## Root Cause
File di production server **BELUM DI-UPDATE** dengan fix yang sudah dibuat di local development environment.

## Required Files to Upload

### 1. Backend API Controller
**Source (Fixed):**
```
c:\Users\Administrator\knd-rt-online\api\app\Http\Controllers\Api\AssetController.php
```

**Destination (Needs Update):**
```
/www/wwwroot/knd-mobile-project/api/app/Http/Controllers/Api/AssetController.php
```

**Key Changes:**
- Line ~353-360: Changed from `Notification::create()` to `\App\Models\Notification::create()`
- Added try-catch block for graceful notification handling
- Added Firebase push notification support
- Enhanced logging at every step

### 2. Web Admin Frontend
**Source (Fixed):**
```
c:\Users\Administrator\knd-rt-online\web-admin\app\dashboard\inventaris\page.tsx
```

**Destination (Needs Update):**
```
/www/wwwroot/knd-mobile-project/web-admin/app/dashboard/inventaris/page.tsx
```

**Key Changes:**
- Added 300ms delay before refetching data
- Added cache-busting timestamp parameter
- Enhanced response verification
- Detailed console logging for debugging

## Deployment Steps

### Option 1: Manual Upload (Recommended for Quick Fix)

#### Step 1: Upload Backend File
```bash
# Using SCP/SFTP from Windows
# Example using WinSCP or FileZilla:
# 1. Connect to server
# 2. Navigate to /www/wwwroot/knd-mobile-project/api/app/Http/Controllers/Api/
# 3. Upload AssetController.php (overwrite existing)
```

#### Step 2: Upload Frontend File
```bash
# Upload to: /www/wwwroot/knd-mobile-project/web-admin/app/dashboard/inventaris/
```

#### Step 3: Clear Production Cache
```bash
# SSH into server
ssh user@your-server.com

# Navigate to API directory
cd /www/wwwroot/knd-mobile-project/api

# Clear Laravel cache
php artisan config:clear
php artisan cache:clear
php artisan route:clear

# Restart PHP-FPM (if applicable)
sudo systemctl restart php-fpm
# OR
sudo service php8.1-fpm restart
```

#### Step 4: Rebuild Frontend (if needed)
```bash
cd /www/wwwroot/knd-mobile-project/web-admin

# Install dependencies if needed
npm install

# Build for production
npm run build

# Restart Next.js (if using PM2 or similar)
pm2 restart all
# OR
npm start
```

### Option 2: Git Deployment (If Repository is Used)

```bash
# On development machine
cd c:\Users\Administrator\knd-rt-online

# Commit changes
git add api/app/Http/Controllers/Api/AssetController.php
git add web-admin/app/dashboard/inventaris/page.tsx
git commit -m "Fix: Notification creation and loan status sync issues"

# Push to repository
git push origin main

# On production server
cd /www/wwwroot/knd-mobile-project

# Pull latest changes
git pull origin main

# Clear cache
php artisan cache:clear
php artisan config:clear

# Restart services
sudo systemctl restart php-fpm
pm2 restart all
```

### Option 3: Rsync (For Linux/Mac with SSH Access)

```bash
# From development machine (Git Bash on Windows)
rsync -avz \
  api/app/Http/Controllers/Api/AssetController.php \
  user@server:/www/wwwroot/knd-mobile-project/api/app/Http/Controllers/Api/

rsync -avz \
  web-admin/app/dashboard/inventaris/page.tsx \
  user@server:/www/wwwroot/knd-mobile-project/web-admin/app/dashboard/inventaris/

# Then SSH and clear cache
```

## Verification After Deploy

### 1. Check File Timestamps
```bash
# SSH into server
ls -la /www/wwwroot/knd-mobile-project/api/app/Http/Controllers/Api/AssetController.php
# Should show recent timestamp

ls -la /www/wwwroot/knd-mobile-project/web-admin/app/dashboard/inventaris/page.tsx
# Should show recent timestamp
```

### 2. Verify Code Changes
```bash
# Check backend file around line 353
grep -n "App\\\\Models\\\\Notification::create" \
  /www/wwwroot/knd-mobile-project/api/app/Http/Controllers/Api/AssetController.php

# Should return lines with \App\Models\Notification::create
```

### 3. Test Loan Approval
```
1. Login as RT admin on production
2. Go to Inventaris → Riwayat Peminjaman
3. Approve a pending loan
4. Should see success without errors
5. Status should change to "Disetujui"
6. Check logs - no more notifiable_type errors
```

### 4. Monitor Production Logs
```bash
# Watch for errors
tail -f /www/wwwroot/knd-mobile-project/api/storage/logs/laravel.log

# Should NOT see:
# - "null value in column notifiable_type"
# - SQLSTATE[23502] errors

# Should see:
# - "Database notification created successfully"
# - "Loan approval completed successfully"
```

## Expected Behavior After Deploy

### Before (Current Broken State):
```
RT clicks "Setujui" → Error 500 → 
"Terjadi kesalahan pada server" → 
Status tetap "Menunggu"
```

### After (Fixed State):
```
RT clicks "Setujui" → Success →
Toast: "Peminjaman berhasil disetujui" →
Status berubah jadi "Disetujui" →
Warga dapat push notification
```

## Critical Lines to Verify

### Backend (AssetController.php):

**OLD (WRONG - Line ~297 in production):**
```php
Notification::create([  // ❌ Using facade, missing notifiable_type
    'user_id' => $loan->user_id,
    ...
]);
```

**NEW (CORRECT - Should be around line 353 after deploy):**
```php
\App\Models\Notification::create([  // ✅ Using model class, triggers mutator
    'user_id' => $loan->user_id,
    ...
]);
```

### Frontend (page.tsx):

**NEW additions to verify:**
```typescript
// Line ~295: Delay before refetch
await new Promise(resolve => setTimeout(resolve, 300));

// Line ~173: Cache-busting timestamp
const timestamp = new Date().getTime();
const res = await api.get(`/assets/loans/requests?t=${timestamp}`);
```

## Rollback Plan (If Issues Occur)

```bash
# If something goes wrong, backup original file first
cd /www/wwwroot/knd-mobile-project/api/app/Http/Controllers/Api/
cp AssetController.php AssetController.php.backup.$(date +%Y%m%d_%H%M%S)

# Then if needed to rollback:
cp AssetController.php.backup.TIMESTAMP AssetController.php
sudo systemctl restart php-fpm
```

## Post-Deployment Checklist

- [ ] Backend file uploaded successfully
- [ ] Frontend file uploaded successfully
- [ ] Laravel cache cleared
- [ ] PHP-FPM restarted (if applicable)
- [ ] Frontend rebuilt (if needed)
- [ ] No errors in laravel.log
- [ ] Loan approval works without errors
- [ ] Status changes correctly in UI
- [ ] Push notifications sent successfully
- [ ] Database shows correct status

## Contact Information

**If deployment issues occur:**
1. Check error logs: `tail -100 /www/wwwroot/knd-mobile-project/api/storage/logs/laravel.log`
2. Verify file permissions: `ls -la` on uploaded files
3. Test locally first to ensure code works
4. Check PHP version compatibility

---

## Summary

**URGENT ACTION REQUIRED:**
Upload these 2 files to production server:
1. `api/app/Http/Controllers/Api/AssetController.php`
2. `web-admin/app/dashboard/inventaris/page.tsx`

Then clear cache and restart services.

**Expected Result:**
- ✅ No more "notifiable_type" errors
- ✅ Loan status updates correctly
- ✅ Push notifications work
- ✅ UI shows correct status

---

**Created:** March 16, 2026  
**Priority:** HIGH  
**Estimated Downtime:** 2-5 minutes  
**Risk Level:** LOW (changes are well-tested locally)
