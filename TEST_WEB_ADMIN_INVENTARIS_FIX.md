# Quick Test Guide - Web Admin Inventaris Loan Actions Fix

## Summary of Fix
Fixed the "Server Error" when clicking approve/reject/return buttons in web admin's "Inventaris & Peminjaman" menu by:
1. Adding comprehensive error handling in web frontend
2. Adding authentication validation and error handling in backend API
3. Adding detailed logging for debugging
4. Providing user-friendly error messages

## Files Changed
- ✅ `web-admin/app/dashboard/inventaris/page.tsx`
- ✅ `api/app/Http/Controllers/Api/AssetController.php` (approveLoan, rejectLoan, returnAsset)

## How to Test

### Prerequisites
1. ✅ Have at least one WARGA user account
2. ✅ Have at least 3 assets with available quantity > 0
3. ✅ Have at least 3 pending loan requests (create from mobile app as WARGA)
4. ✅ Login to web admin as RT/admin role

### Test Scenario 1: Approve Loan ✅

**Steps:**
```
1. Login to web admin as RT
2. Navigate to "Inventaris & Peminjaman" 
3. Click on "Daftar Peminjaman" tab (if exists) or scroll to loan requests section
4. Find a loan with status "Menunggu" (PENDING)
5. Click the green checkmark button (✓)
6. When prompted, enter: "Test approval note" (or leave empty)
7. Click OK
```

**Expected Result:**
- ✅ Toast notification: "Peminjaman berhasil disetujui"
- ✅ Loan status changes from "Menunggu" to "Disetujui"
- ✅ Asset stock decreases by loan quantity
- ✅ Page auto-refreshes showing updated list
- ✅ Browser console shows: `Processing approve for loan {id}` and response data

**Verify in Database:**
```sql
-- Check loan status changed to APPROVED
SELECT id, status, admin_note, updated_at 
FROM asset_loans 
WHERE id = {loan_id}
ORDER BY updated_at DESC 
LIMIT 1;

-- Check asset stock decreased
SELECT a.id, a.name, a.available_quantity, a.total_quantity
FROM assets a
JOIN asset_loans l ON l.asset_id = a.id
WHERE l.id = {loan_id};
```

### Test Scenario 2: Reject Loan ❌

**Steps:**
```
1. Find another loan with status "Menunggu" (PENDING)
2. Click the red X button
3. When prompted, enter: "Test rejection - insufficient items"
4. Click OK
```

**Expected Result:**
- ✅ Toast notification: "Peminjaman berhasil ditolak"
- ✅ Loan status changes from "Menunggu" to "Ditolak"
- ✅ Asset stock remains unchanged
- ✅ Admin note contains rejection reason
- ✅ Page auto-refreshes
- ✅ Browser console shows processing logs

**Verify in Database:**
```sql
SELECT id, status, admin_note, updated_at 
FROM asset_loans 
WHERE id = {loan_id}
ORDER BY updated_at DESC 
LIMIT 1;
```

### Test Scenario 3: Return Asset 🔄

**Steps:**
```
1. Find a loan with status "Disetujui" (APPROVED)
2. Click the blue return button (↺ or similar icon)
3. Confirm the action (no prompt, direct action)
```

**Expected Result:**
- ✅ Toast notification: "Aset berhasil dikembalikan"
- ✅ Loan status changes from "Disetujui" to "Dikembalikan"
- ✅ Asset stock increases back to original quantity
- ✅ Return date is set to current timestamp
- ✅ Page auto-refreshes
- ✅ Browser console shows processing logs

**Verify in Database:**
```sql
SELECT id, status, return_date, updated_at 
FROM asset_loans 
WHERE id = {loan_id}
ORDER BY updated_at DESC 
LIMIT 1;

-- Check asset stock increased
SELECT a.id, a.name, a.available_quantity, a.total_quantity
FROM assets a
JOIN asset_loans l ON l.asset_id = a.id
WHERE l.id = {loan_id};
```

### Test Scenario 4: User Cancels Prompt ⛔

**Steps:**
```
1. Find a PENDING loan
2. Click approve button
3. When prompt appears, click CANCEL (not OK)
```

**Expected Result:**
- ✅ No API call is made
- ✅ No toast notification
- ✅ Loan status remains "Menunggu"
- ✅ Modal/dialog closes
- ✅ Console shows no error logs

### Test Scenario 5: Session Expired 🔐

**Steps:**
```
1. Login to web admin
2. Open another tab and logout from first tab
3. In first tab, try to approve a loan
```

**Expected Result:**
- ✅ Toast notification: "Sesi Anda telah berakhir. Silakan login ulang."
- ✅ Optionally redirects to login page
- ✅ No database changes

### Test Scenario 6: Invalid Loan Status ⚠️

**Steps:**
```
1. Try to approve a loan that's already APPROVED or REJECTED
   (You may need to manually modify the page or use API testing tool)
```

**Expected Result:**
- ✅ Toast notification: "Status peminjaman tidak valid"
- ✅ No database changes
- ✅ Console shows 400 error

### Test Scenario 7: Insufficient Stock 📦

**Setup:**
```sql
-- Manually set asset stock to 0
UPDATE assets SET available_quantity = 0 WHERE id = {asset_id};
```

**Steps:**
```
1. Create a loan request for that asset (from mobile app)
2. Try to approve it from web admin
```

**Expected Result:**
- ✅ Toast notification: "Stok aset tidak mencukupi saat ini"
- ✅ Transaction rolls back
- ✅ No stock changes

## Debugging Checklist

### If Getting "Server Error":

**1. Check Browser Console:**
```javascript
// Look for these logs:
Processing approve for loan 123
approve response: {...}
// OR
approve error: Error: ...
approve response: {...}
```

**2. Check Laravel Logs:**
```powershell
# PowerShell
Get-Content c:\Users\Administrator\knd-rt-online\api\storage\logs\laravel.log -Tail 50

# Look for:
[timestamp] local.ERROR: Asset loan approve error: ...
```

**3. Verify Authentication:**
```powershell
# Check if Sanctum is working
cd c:\Users\Administrator\knd-rt-online\api
php artisan route:list | findstr "sanctum"
```

**4. Check Database State:**
```sql
-- Verify loan exists and is PENDING
SELECT id, status, user_id, asset_id, quantity 
FROM asset_loans 
WHERE id = {loan_id};

-- Verify asset exists with sufficient stock
SELECT id, name, available_quantity, total_quantity
FROM assets 
WHERE id = {asset_id};

-- Verify user has RT role
SELECT id, name, email, role, rt_id
FROM users 
WHERE id = {admin_user_id};
```

**5. Test API Directly:**

Using PowerShell:
```powershell
# Get auth token (login first)
$loginBody = @{
    email = "admin@example.com"
    password = "password"
} | ConvertTo-Json

$tokenResponse = Invoke-RestMethod -Uri "http://localhost:8000/api/login" -Method POST -Body $loginBody -ContentType "application/json"
$token = $tokenResponse.token

# Test approve endpoint
$approveBody = @{
    admin_note = "Test approval from PowerShell"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:8000/api/assets/loans/{LOAN_ID}/approve" -Method POST -Headers @{
        Authorization = "Bearer $token"
        ContentType = "application/json"
    } -Body $approveBody
    
    Write-Host "Success: $($response | ConvertTo-Json)"
} catch {
    Write-Host "Error: $($_.Exception.Message)"
    Write-Host "Response: $($_.ErrorDetails.Message)"
}
```

## Success Indicators

After successful fix implementation:

### Frontend (Browser):
- ✅ Clear success/error toasts with specific messages
- ✅ Console logs showing request/response data
- ✅ Auto-refresh after successful actions
- ✅ No JavaScript errors in console
- ✅ Smooth UX flow

### Backend (Laravel Logs):
```
[datetime] local.INFO: Processing loan approval...
[datetime] local.ERROR: Asset loan approve error: [error details]
```

### Database:
```sql
-- All three statuses should exist
SELECT status, COUNT(*) as count
FROM asset_loans
GROUP BY status;
-- Should show: PENDING, APPROVED, REJECTED, RETURNED
```

### User Notifications:
```sql
-- Check notifications were created
SELECT n.title, n.message, n.type, n.is_read
FROM notifications n
WHERE n.type = 'ASSET_LOAN'
ORDER BY n.created_at DESC
LIMIT 10;
```

## Common Issues & Solutions

### Issue 1: "Sesi Anda telah berakhir"
**Cause:** Token expired or invalid
**Solution:** Logout → Clear browser cache → Login again

### Issue 2: "Stok aset tidak mencukupi"
**Cause:** Asset quantity is 0 or less than loan quantity
**Solution:** 
- Add more assets
- Reduce loan quantity
- Check for other approved loans using same asset

### Issue 3: "Status peminjaman tidak valid"
**Cause:** Trying to approve/reject non-PENDING loan
**Solution:** Only process loans with status = 'PENDING'

### Issue 4: Button doesn't respond
**Cause:** JavaScript error or demo mode active
**Solution:**
- Check browser console for errors
- Verify not in demo mode
- Hard refresh (Ctrl+F5)

### Issue 5: Page doesn't refresh after action
**Cause:** fetchLoans() function error
**Solution:**
- Check network tab for failed requests
- Verify API endpoint `/assets/loans/requests` is accessible
- Check console for errors

## Rollback Plan

If critical issues occur:

```bash
# Git rollback (if version controlled)
git checkout HEAD -- web-admin/app/dashboard/inventaris/page.tsx
git checkout HEAD -- api/app/Http/Controllers/Api/AssetController.php

# Or restore from backup
```

## Contact Support

For persistent issues:
1. Collect browser console logs
2. Collect Laravel error logs
3. Note exact steps to reproduce
4. Include database state screenshots
5. Document user roles and permissions
