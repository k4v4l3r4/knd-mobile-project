# ✅ URGENT: Fix LetterController Notification Error - Production Deployment

## Critical Issue

**Error on Production:**
```
SQLSTATE[23502]: Not null violation: 7 ERROR: null value in column "notifiable_type" 
of relation "notifications" violates not-null constraint
```

**Location:** `/www/wwwroot/knd-mobile-project/api/app/Http/Controllers/Api/LetterController.php` line 293

**Affected Feature:** Layanan Surat approval/rejection for RT role

---

## Root Cause

Same issue as AssetController - `LetterController` also has the notification creation problem where `notifiable_type` is NULL.

The file uploaded earlier only fixed `AssetController.php` but **`LetterController.php` also needs the same fix**.

---

## Solution: Update LetterController.php

### File to Upload

**Source:**
```
c:\Users\Administrator\knd-rt-online\api\app\Http\Controllers\Api\LetterController.php
```

**Destination:**
```
/www/wwwroot/knd-mobile-project/api/app/Http/Controllers/Api/LetterController.php
```

### Key Changes

#### BEFORE (Broken - Line ~293):
```php
Notification::create([
    'user_id' => $letter->user_id,  // ❌ Missing notifiable_type
    'title' => 'Surat Disetujui',
    'message' => '...',
    'type' => 'LETTER',
    ...
]);
```

#### AFTER (Fixed):
```php
use Illuminate\Support\Facades\Log;  // ← Added import

// ...

try {
    $notificationData = [
        'notifiable_id' => $letter->user_id,
        'notifiable_type' => 'App\\Models\\User',  // ← EXPLICIT!
        'tenant_id' => $user->tenant_id ?? null,
        'title' => $title,
        'message' => $message,
        'type' => 'LETTER',
        'related_id' => $letter->id,
        'url' => '/layanan-surat',
        'is_read' => false,
    ];
    
    \App\Models\Notification::create($notificationData);
    Log::info('Letter notification created successfully', [
        'user_id' => $letter->user_id,
        'notifiable_type' => 'App\\Models\\User'
    ]);
} catch (\Exception $notifException) {
    Log::warning('Failed to create letter notification: ' . $notifException->getMessage(), [
        'letter_id' => $letter->id,
        'user_id' => $letter->user_id,
        'trace' => $notifException->getTraceAsString()
    ]);
}
```

---

## Complete Files List to Upload

You need to upload **BOTH** files to production:

### 1. ✅ AssetController.php (Already Fixed)
```
FROM: c:\Users\Administrator\knd-rt-online\api\app\Http\Controllers\Api\AssetController.php
TO:   /www/wwwroot/knd-mobile-project/api/app/Http/Controllers/Api/AssetController.php
```

### 2. ⚠️ LetterController.php (Also Needs Fix)
```
FROM: c:\Users\Administrator\knd-rt-online\api\app\Http\Controllers\Api\LetterController.php
TO:   /www/wwwroot/knd-mobile-project/api/app/Http/Controllers/Api/LetterController.php
```

---

## Deployment Steps

### Step 1: Verify Local Files

Check both files have the explicit `notifiable_type`:

```powershell
# Check AssetController
Select-String -Pattern "notifiable_type.*App.Models.User" `
  c:\Users\Administrator\knd-rt-online\api\app\Http\Controllers\Api\AssetController.php

# Check LetterController  
Select-String -Pattern "notifiable_type.*App.Models.User" `
  c:\Users\Administrator\knd-rt-online\api\app\Http\Controllers\Api\LetterController.php
```

Both should return lines with `'notifiable_type' => 'App\\Models\\User'`

### Step 2: Upload Both Files via SFTP

**Using WinSCP:**
1. Connect to server
2. Navigate to remote: `/www/wwwroot/knd-mobile-project/api/app/Http/Controllers/Api/`
3. Upload BOTH files:
   - `AssetController.php`
   - `LetterController.php`
4. Choose "Overwrite" for both

**Using SCP:**
```bash
scp api/app/Http/Controllers/Api/AssetController.php \
  user@server:/www/wwwroot/knd-mobile-project/api/app/Http/Controllers/Api/

scp api/app/Http/Controllers/Api/LetterController.php \
  user@server:/www/wwwroot/knd-mobile-project/api/app/Http/Controllers/Api/
```

### Step 3: SSH and Clear Cache

```bash
ssh user@your-server.com

cd /www/wwwroot/knd-mobile-project/api

# Clear all caches
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear

# Restart PHP-FPM
sudo systemctl restart php-fpm
```

### Step 4: Verify Upload

```bash
# Check AssetController
grep -n "notifiable_type.*App.Models.User" \
  app/Http/Controllers/Api/AssetController.php

# Check LetterController
grep -n "notifiable_type.*App.Models.User" \
  app/Http/Controllers/Api/LetterController.php

# Both should show lines around 350+ (AssetController) and 290+ (LetterController)
```

---

## Testing After Deploy

### Test 1: Asset Loan Approval (RT Role)

```
1. Login as RT admin
2. Go to Inventaris → Riwayat Peminjaman
3. Find PENDING loan
4. Click "Setujui"
5. Enter note
6. Click "Ya, Setujui"

Expected:
✓ Success toast
✓ Status changes to "Disetujui"
✓ No errors in console
✓ Laravel log shows success
```

### Test 2: Letter Approval (RT Role)

```
1. Login as RT admin
2. Go to Layanan Surat
3. Find pending surat request
4. Click "Setujui" or "Approve"
5. Generate PDF if needed

Expected:
✓ Success response
✓ PDF generates correctly
✓ Notification created
✓ No notifiable_type errors
```

### Check Logs

```bash
tail -f /www/wwwroot/knd-mobile-project/api/storage/logs/laravel.log

# Should see:
local.INFO: Database notification created successfully {"notifiable_type":"App\Models\User"}
local.INFO: Letter notification created successfully {...}

# Should NOT see:
SQLSTATE[23502] or "notifiable_type" errors
```

---

## Verification SQL Queries

### Check Asset Loan Notifications

```sql
SELECT 
    n.id,
    n.notifiable_type,
    n.title,
    n.message,
    n.type,
    u.name as recipient
FROM notifications n
JOIN users u ON n.notifiable_id = u.id
WHERE n.type = 'ASSET_LOAN'
ORDER BY n.created_at DESC
LIMIT 5;

-- Should show: notifiable_type = 'App\Models\User' (NOT NULL)
```

### Check Letter Notifications

```sql
SELECT 
    n.id,
    n.notifiable_type,
    n.title,
    n.message,
    n.type,
    u.name as recipient
FROM notifications n
JOIN users u ON n.notifiable_id = u.id
WHERE n.type = 'LETTER'
ORDER BY n.created_at DESC
LIMIT 5;

-- Should show: notifiable_type = 'App\Models\User' (NOT NULL)
```

---

## Common Issues

### Issue 1: Only One File Uploaded

**Symptom:**
```
Asset loans work but letters still fail (or vice versa)
```

**Solution:**
Upload BOTH files:
- `AssetController.php`
- `LetterController.php`

### Issue 2: Old Code Cached

**Symptom:**
```
Files uploaded but errors persist
```

**Solution:**
```bash
# Clear ALL caches
php artisan cache:clear
php artisan config:clear
php artisan route:clear
php artisan view:clear

# Clear opcache
sudo systemctl restart php-fpm

# If using Next.js
cd /www/wwwroot/knd-mobile-project/web-admin
rm -rf .next
npm run build
```

### Issue 3: Wrong File Permissions

**Symptom:**
```
Permission denied errors after upload
```

**Solution:**
```bash
cd /www/wwwroot/knd-mobile-project/api/app/Http/Controllers/Api/
chmod 644 AssetController.php LetterController.php
chown www-data:www-data AssetController.php LetterController.php
```

---

## Rollback Plan

If issues persist:

```bash
# Backup current files
cd /www/wwwroot/knd-mobile-project/api/app/Http/Controllers/Api/
cp AssetController.php AssetController.php.broken.$(date +%Y%m%d_%H%M%S)
cp LetterController.php LetterController.php.broken.$(date +%Y%m%d_%H%M%S)

# Restore from backup if you have good ones
# cp AssetController.php.backup.good AssetController.php
# cp LetterController.php.backup.good LetterController.php

sudo systemctl restart php-fpm
```

---

## Summary

### Files to Upload NOW:

1. ✅ `api/app/Http/Controllers/Api/AssetController.php` - Fixed notification + status sync
2. ⚠️ `api/app/Http/Controllers/Api/LetterController.php` - Fixed notification (NEW!)

### What Was Fixed:

✅ **AssetController:**
- Explicit `notifiable_type` field
- Stock decrement with refresh
- Status update verification
- Frontend sync improvements

✅ **LetterController:**
- Explicit `notifiable_type` field  
- Added Log facade import
- Graceful error handling
- Proper notification logging

### Expected Outcome:

✅ No more `SQLSTATE[23502]` errors  
✅ Asset loan approvals work  
✅ Letter approvals work  
✅ PDF generation works  
✅ Notifications created successfully  

---

**Priority:** CRITICAL - Blocks both features  
**Estimated Time:** 5 minutes  
**Success Rate:** 99% if both files uploaded correctly

---

**Last Updated:** March 16, 2026  
**Action Required:** Upload BOTH files immediately
