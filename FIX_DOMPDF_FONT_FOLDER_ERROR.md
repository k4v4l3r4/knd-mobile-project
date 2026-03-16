# ✅ FIX: DomPDF Font Folder Error - Generate PDF Surat (RT Role)

## Problem
Error saat generate PDF surat pada fitur "Setujui Layanan Surat" untuk role RT karena **folder fonts tidak ada** atau **tidak memiliki permission yang benar**.

**Error Message:**
```
DomPDF\Exception: The requested font folder does not exist or cannot be written.
```

---

## Solution: Fix Font Folder on Production Server

### Step 1: SSH into Production Server

```bash
ssh user@your-server.com
# atau
ssh root@your-server-ip
```

### Step 2: Create Font Directory

```bash
# Navigate to API directory
cd /www/wwwroot/knd-mobile-project/api

# Create fonts directory if it doesn't exist
mkdir -p storage/fonts

# Verify created
ls -la storage/ | grep fonts
# Should show: drwxr-xr-x fonts
```

### Step 3: Set Correct Permissions

```bash
# Give full permissions to storage directory
chmod -R 775 /www/wwwroot/knd-mobile-project/api/storage

# Set correct ownership (www-data or www, depending on your server)
chown -R www-data:www-data /www/wwwroot/knd-mobile-project/api/storage

# OR if using different user
chown -R www:www /www/wwwroot/knd-mobile-project/api/storage

# Verify permissions
ls -la storage/
# Should show: drwxrwxr-x (775) or drwxr-xr-x (755)
```

### Step 4: Clear Laravel Cache

```bash
cd /www/wwwroot/knd-mobile-project/api

# Clear all caches
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear

# Optional: Optimize for production
php artisan config:cache
php artisan route:cache
```

### Step 5: Verify DomPDF Configuration

Check if `config/dompdf.php` exists and has correct paths:

```bash
cd /www/wwwroot/knd-mobile-project/api
cat config/dompdf.php | grep -A 2 "font_dir\|font_cache"
```

**Expected configuration:**
```php
'font_dir' => storage_path('fonts'),
'font_cache' => storage_path('fonts'),
```

If the file doesn't exist, publish the default config:
```bash
php artisan vendor:publish --provider="Barryvdh\DomPDF\ServiceProvider"
```

### Step 6: Test PDF Generation

1. Login as RT admin
2. Go to Layanan Surat
3. Approve a surat request
4. Click "Generate PDF" or "Download PDF"
5. Should download successfully without font errors

---

## Alternative: Quick One-Liner Commands

If you want to execute all commands at once:

```bash
# SSH and execute all commands
ssh user@your-server.com << 'EOF'
cd /www/wwwroot/knd-mobile-project/api
mkdir -p storage/fonts
chmod -R 775 storage
chown -R www-data:www-data storage
php artisan config:clear
php artisan cache:clear
echo "✓ Font folder created and permissions set successfully!"
EOF
```

---

## Verification Checklist

After executing commands, verify:

### ✅ 1. Directory Exists
```bash
ls -la /www/wwwroot/knd-mobile-project/api/storage/fonts
# Should show directory listing
```

### ✅ 2. Permissions Are Correct
```bash
stat -c "%a %U:%G %n" /www/wwwroot/knd-mobile-project/api/storage/fonts
# Should show: 775 www-data:www-data storage/fonts (or similar)
```

### ✅ 3. Can Write to Directory
```bash
cd /www/wwwroot/knd-mobile-project/api/storage/fonts
touch test.txt
echo "test" > test.txt
cat test.txt
rm test.txt
# All commands should succeed without permission errors
```

### ✅ 4. Laravel Can Access Path
```bash
cd /www/wwwroot/knd-mobile-project/api
php -r "echo storage_path('fonts') . PHP_EOL;"
# Should output: /www/wwwroot/knd-mobile-project/api/storage/fonts
```

### ✅ 5. No Errors in Logs
```bash
tail -f storage/logs/laravel.log
# Generate a PDF, should NOT see font folder errors
```

---

## Common Issues & Solutions

### Issue 1: Permission Denied

**Symptom:**
```
mkdir: cannot create directory 'storage/fonts': Permission denied
```

**Solution:**
```bash
# You're not logged in as correct user
# Either:
sudo mkdir -p storage/fonts
sudo chown -R www-data:www-data storage/fonts

# OR login as www-data user
sudo su -s /bin/bash www-data
```

### Issue 2: Wrong Ownership

**Symptom:**
```
PDF generation still fails with permission errors
```

**Cause:** Web server user differs from command line user

**Solution:**
```bash
# Find out who web server runs as
ps aux | grep -E 'apache|nginx|php-fpm'

# If shows 'nginx', use:
chown -R nginx:nginx storage/fonts

# If shows 'httpd', use:
chown -R httpd:httpd storage/fonts
```

### Issue 3: SELinux Blocking

**Symptom (CentOS/RHEL):**
```
Permissions are correct but still getting errors
```

**Cause:** SELinux security context

**Solution:**
```bash
# Check SELinux status
getenforce

# If Enforcing, set context
chcon -R -t httpd_sys_rw_content_t storage/fonts

# Or temporarily disable for testing
setenforce 0
```

### Issue 4: Read-Only Filesystem

**Symptom:**
```
Cannot create directory: Read-only file system
```

**Cause:** Container or mount is read-only

**Solution:**
```bash
# Check if filesystem is mounted read-only
mount | grep www

# Remount as read-write
mount -o remount,rw /www

# Then retry creation
mkdir -p storage/fonts
```

---

## DomPDF Configuration Details

### Check config/dompdf.php

```php
<?php

return [
    // ...
    
    /**
     * The location of the custom fonts
     */
    'font_dir' => env('DOMPDF_FONT_DIR', storage_path('fonts')),

    /**
     * The location of the temporary font data
     */
    'font_cache' => env('DOMPDF_FONT_CACHE', storage_path('fonts')),

    // ...
];
```

### If config/dompdf.php Doesn't Exist

```bash
# Publish DomPDF configuration
cd /www/wwwroot/knd-mobile-project/api
php artisan vendor:publish --provider="Barryvdh\DomPDF\ServiceProvider" --tag="config"

# This creates config/dompdf.php
```

### Environment Variables (Optional)

Add to `.env`:
```env
DOMPDF_FONT_DIR=/www/wwwroot/knd-mobile-project/api/storage/fonts
DOMPDF_FONT_CACHE=/www/wwwroot/knd-mobile-project/api/storage/fonts
```

Then clear config cache:
```bash
php artisan config:clear
```

---

## Testing PDF Generation

### Test Command Line PDF Generation

Create a test script:

```bash
cd /www/wwwroot/knd-mobile-project/api
cat > test_pdf.php << 'EOF'
<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Barryvdh\DomPDF\Facade\Pdf;

$pdf = Pdf::loadView('welcome');
$pdf->save(storage_path('fonts/test.pdf'));

echo "✓ PDF generated successfully!\n";
echo "✓ Font folder is writable!\n";
EOF

php test_pdf.php
rm test_pdf.php
```

### Test via Web Interface

1. **Login as RT admin**
2. **Navigate to:** Layanan Surat → Pilih surat pending
3. **Click:** "Setujui" or "Generate PDF"
4. **Expected:** PDF downloads successfully
5. **Check logs:** No font-related errors

---

## Post-Fix Monitoring

### Monitor Storage Usage

```bash
# Check disk space used by fonts folder
du -sh /www/wwwroot/knd-mobile-project/api/storage/fonts

# Monitor growth
watch -n 60 'du -sh /www/wwwroot/knd-mobile-project/api/storage/fonts'
```

### Clean Old Font Cache (Monthly)

```bash
# Remove old cached font files (keep .ttf/.otf if any)
find /www/wwwroot/knd-mobile-project/api/storage/fonts -name "*.php" -mtime +30 -delete

# Or clean entire cache (will regenerate on next PDF)
rm -rf /www/wwwroot/knd-mobile-project/api/storage/fonts/*
```

---

## Files That May Need Updates

### Only if DomPDF config is wrong:

**File:** `/www/wwwroot/knd-mobile-project/api/config/dompdf.php`

**Should contain:**
```php
'font_dir' => storage_path('fonts'),
'font_cache' => storage_path('fonts'),
```

**DO NOT modify unless necessary!** Default config should work.

---

## Summary

### Quick Fix (Copy-Paste Commands):

```bash
# SSH into server
ssh user@your-server.com

# Execute these commands:
cd /www/wwwroot/knd-mobile-project/api
mkdir -p storage/fonts
chmod -R 775 storage
chown -R www-data:www-data storage
php artisan config:clear
php artisan cache:clear

echo "✅ Done! Test PDF generation now."
```

### Expected Outcome:

✅ Font folder created  
✅ Permissions set correctly  
✅ Laravel can write to folder  
✅ PDF generation works  
✅ No more font errors  

---

**Estimated Time:** 2-5 minutes  
**Risk Level:** LOW  
**Rollback:** Simply delete the folder if needed

---

**Created:** March 16, 2026  
**Priority:** HIGH (blocks PDF generation)  
**Tested:** Pending user confirmation
