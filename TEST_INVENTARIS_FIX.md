# Quick Test Guide - Inventaris Peminjaman Fix

## Summary of Fix
Fixed the "Server Error" when clicking "Ajukan Peminjaman" button by:
1. Adding comprehensive error handling in mobile app
2. Adding authentication validation in backend API
3. Adding detailed logging for debugging
4. Providing user-friendly error messages

## Files Changed
- ✅ `mobile-warga/src/screens/InventoryScreen.tsx`
- ✅ `api/app/Http/Controllers/Api/AssetController.php`
- ✅ `api/test_asset_loan.php` (test script added)

## How to Test

### Option 1: Run Backend Test Script
```powershell
cd c:\Users\Administrator\knd-rt-online\api
php test_asset_loan.php
```

This will check:
- ✓ WARGA users exist
- ✓ Assets with available quantity exist  
- ✓ Laravel Sanctum is configured
- ✓ Loan creation logic works
- ✓ Routes are properly set up

### Option 2: Test via Mobile App

**Prerequisites:**
1. Make sure you have a WARGA user account
2. Make sure there are assets with available quantity > 0
3. Login to the mobile app as WARGA user

**Steps:**
1. Open mobile app
2. Navigate to "Inventaris dan Peminjaman" menu
3. Select an asset with available stock
4. Click "Pinjam" or "Ajukan Peminjaman"
5. Fill in:
   - Quantity (must be ≤ available quantity)
   - Date (must be today or future date)
6. Click "Ajukan Peminjaman"

**Expected Results:**

✅ **Success Case:**
- Alert shows: "Pengajuan peminjaman berhasil dikirim"
- Modal closes
- Can see the loan in "Riwayat Saya" tab with status "PENDING"

⚠️ **If Session Expired (401):**
- Alert shows: "Sesi Anda telah berakhir. Silakan login ulang."
- Solution: Logout and login again

🚫 **If No Permission (403):**
- Alert shows: "Anda tidak memiliki izin untuk melakukan peminjaman."
- Solution: Contact admin to verify user role

💥 **If Server Error (500):**
- Alert shows: "Terjadi kesalahan pada server. Silakan coba lagi atau hubungi administrator."
- Check logs: `c:\Users\Administrator\knd-rt-online\api\storage\logs\laravel.log`
- Look for recent error entries with "Asset borrow error"

### Option 3: Test API Directly with PowerShell

```powershell
# Step 1: Login and get token (replace with your credentials)
$loginResponse = Invoke-RestMethod -Uri "http://localhost:8000/api/login" -Method POST -Body @{
    email = "warga@example.com"
    password = "password123"
} -ContentType "application/json"

$token = $loginResponse.token
Write-Host "Token: $token"

# Step 2: Get available assets
$assetsResponse = Invoke-RestMethod -Uri "http://localhost:8000/api/assets" -Method GET -Headers @{
    Authorization = "Bearer $token"
}

$assetId = $assetsResponse.data[0].id
Write-Host "Using Asset ID: $assetId"

# Step 3: Submit loan request
$loanResponse = Invoke-RestMethod -Uri "http://localhost:8000/api/assets/loan" -Method POST -Headers @{
    Authorization = "Bearer $token"
    ContentType = "application/json"
} -Body @{
    asset_id = $assetId
    quantity = 1
    loan_date = (Get-Date).ToString("yyyy-MM-dd")
} | ConvertTo-Json

Write-Host "Loan Response: $loanResponse"
```

## Debugging Checklist

### If Still Getting Errors:

**Frontend Checks:**
```bash
# 1. Check Metro bundler logs for console.error output
# 2. Check React Native Debugger console
# 3. Verify API base URL in api service
```

**Backend Checks:**
```powershell
# 1. Check Laravel logs
Get-Content c:\Users\Administrator\knd-rt-online\api\storage\logs\laravel.log -Tail 50

# 2. Verify database has required data
cd c:\Users\Administrator\knd-rt-online\api
php artisan tinker

# In tinker:
>>> User::where('role', 'warga')->count()
>>> Asset::where('available_quantity', '>', 0)->count()
>>> exit
```

**Authentication Checks:**
```powershell
# 1. Verify Sanctum is working
cd c:\Users\Administrator\knd-rt-online\api
php artisan route:list | findstr "sanctum"

# 2. Check if auth middleware is applied
php artisan route:list | findstr "assets/loan"
```

## Common Issues & Solutions

### Issue 1: "Unauthorized. Silakan login ulang."
**Cause:** User session expired or invalid token
**Solution:** 
- Logout from mobile app
- Clear app cache/data
- Login again
- Try submitting loan request

### Issue 2: "Stok tidak mencukupi"
**Cause:** Asset quantity is 0 or less than requested
**Solution:**
- Check asset stock in admin panel
- Add more assets or reduce quantity requested

### Issue 3: "Terjadi kesalahan pada server"
**Cause:** Backend error occurred
**Solution:**
- Check `storage/logs/laravel.log`
- Look for "Asset borrow error" entries
- Check exception details for root cause

### Issue 4: Network Error / No Response
**Cause:** API server not running or unreachable
**Solution:**
```powershell
# Start Laravel development server
cd c:\Users\Administrator\knd-rt-online\api
php artisan serve --port=8000

# Or check if already running
netstat -ano | findstr ":8000"
```

## Success Indicators

After successful fix, you should see:

1. **Mobile App Console:**
   ```
   Loan submission response: {success: true, message: "...", data: {...}}
   ```

2. **Database:**
   ```sql
   SELECT * FROM asset_loans ORDER BY id DESC LIMIT 1;
   -- Should show new loan with status='PENDING'
   ```

3. **Admin Panel:**
   - New notification appears for admins
   - Loan appears in "Inventaris" > "Daftar Peminjaman"

4. **User's "Riwayat Saya" Tab:**
   - Shows the new loan with PENDING status

## Rollback Plan

If issues persist, you can revert:

```bash
# Git rollback (if using version control)
git checkout HEAD -- mobile-warga/src/screens/InventoryScreen.tsx
git checkout HEAD -- api/app/Http/Controllers/Api/AssetController.php
```

Or restore from backup files if created.

## Contact Support

For persistent issues:
1. Collect all error logs
2. Note exact steps to reproduce
3. Check system requirements (PHP version, extensions, etc.)
4. Verify database migrations are up to date
