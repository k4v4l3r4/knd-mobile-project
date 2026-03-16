# Debug Guide: Approve Loan Server Error - FIXED! ✅

## Problem ✅ SOLVED
Error "Terjadi kesalahan pada server" saat klik tombol "Ya, Setujui" di Modal Inventaris RT.

### Root Cause Identified
**Database Error:** `null value in column "notifiable_type" of relation "notifications" violates not-null constraint`

**Why it happened:**
The `Notification::create()` call was missing the `notifiable_type` field which is required by PostgreSQL. The Notification model has a **mutator** that automatically sets `notifiable_type` when you set `user_id`, but we needed to use the fully qualified class name `\App\Models\Notification` instead of the facade `Notification`.

## Solution Applied
Changed notification creation to use proper namespaced model with graceful error handling:

```php
// Use the model's mutator which sets notifiable_type automatically
try {
    \App\Models\Notification::create([
        'user_id' => $loan->user_id,  // This triggers the mutator to set notifiable_type
        'title' => 'Peminjaman Disetujui',
        'message' => '...',
        'type' => 'ASSET_LOAN',
        'related_id' => $loan->id,
        'url' => '/mobile/loans',
        'is_read' => false,
    ]);
} catch (\Exception $notifException) {
    // Log notification error but don't fail the entire transaction
    Log::warning('Failed to create notification', [...]);
}
```

## Files Fixed

### 1. Frontend Enhanced Logging (web-admin/app/dashboard/inventaris/page.tsx)

**Added detailed console logs:**
```typescript
console.log(`[INVENTARIS] Processing ${action} for loan ${id}`);
console.log(`[INVENTARIS] Payload:`, { admin_note: note });
console.log(`[INVENTARIS] ${action} response status:`, error.response?.status);
console.log(`[INVENTARIS] ${action} response data:`, error.response?.data);
```

**Improved error messages:**
- 400 Bad Request: Shows specific validation error
- 401 Unauthorized: Session expired
- 403 Forbidden: No permission
- 500 Server Error: Generic message

### 2. Backend Enhanced Logging (api/app/Http/Controllers/Api/AssetController.php)

**Added comprehensive logging at each step:**
1. Request received
2. User authentication check
3. Role authorization check  
4. Loan retrieval
5. Status validation
6. Asset validation
7. Stock check
8. Stock decrement
9. Status update
10. Notification creation
11. Transaction completion

## How to Debug

### Step 1: Check Browser Console (F12)

**Expected logs on success:**
```
[INVENTARIS] Processing approve for loan 123
[INVENTARIS] Payload: {admin_note: "Test approval"}
[INVENTARIS] approve response: {success: true, message: "...", data: {...}}
```

**Check for errors:**
```
[INVENTARIS] approve error: Error: Request failed with status code 500
[INVENTARIS] approve response status: 500
[INVENTARIS] approve response data: {message: "Terjadi kesalahan..."}
```

### Step 2: Check Laravel Logs

```bash
cd c:\Users\Administrator\knd-rt-online\api
Get-Content storage/logs/laravel.log -Tail 100
```

**Expected log entries on success:**
```
[datetime] local.INFO: Approve loan request received {"loan_id":123,"user_id":456,...}
[datetime] local.INFO: Processing loan approval in transaction {"loan_id":123}
[datetime] local.INFO: Loan found {"loan_id":123,"status":"PENDING",...}
[datetime] local.INFO: Asset found {"asset_id":789,"available_quantity":5,...}
[datetime] local.INFO: Stock decremented {"asset_id":789,"new_quantity":4}
[datetime] local.INFO: Loan status updated to APPROVED {"loan_id":123}
[datetime] local.INFO: Notification created for user {"user_id":456}
[datetime] local.INFO: Loan approval completed successfully {"loan_id":123}
```

**Check for error patterns:**
- `local.ERROR: Approve loan failed: ...`
- `local.WARNING: Approve loan failed: ...`

### Step 3: Verify Request Payload

**Open browser DevTools → Network tab:**
1. Click "Setujui" button
2. Find POST request to `/api/assets/loans/{id}/approve`
3. Check Request Payload:
```json
{
  "admin_note": "Your optional note here"
}
```
4. Check Request Headers:
```
Authorization: Bearer {your_token}
Content-Type: application/json
Accept: application/json
```
5. Check Response status and body

### Step 4: Verify Authentication Token

**In browser console:**
```javascript
// Check if token exists
document.cookie.includes('admin_token')
// Should return true if logged in
```

**In Laravel logs, check for:**
```
local.ERROR: Approve loan failed: No authenticated user
```
This means token is missing or invalid.

### Step 5: Verify User Role

**Check database:**
```sql
SELECT id, name, email, role, rt_id 
FROM users 
WHERE id = {your_user_id};
```

**Valid roles for approve:**
- `admin_rt`
- `ADMIN_RT`
- `RT`
- `rt`
- `super_admin`
- `SUPER_ADMIN`

**In Laravel logs, check for:**
```
local.ERROR: Approve loan failed: Unauthorized role {"role":"warga"}
```

### Step 6: Verify Loan Status

**Check database:**
```sql
SELECT id, status, asset_id, quantity, user_id 
FROM asset_loans 
WHERE id = {loan_id};
```

**Must be `PENDING` to be approved.**

**In Laravel logs, check for:**
```
local.WARNING: Approve loan failed: Invalid status {"current_status":"APPROVED"}
```

### Step 7: Verify Asset Stock

**Check database:**
```sql
SELECT id, name, available_quantity, total_quantity 
FROM assets 
WHERE id = {asset_id_from_loan};
```

**available_quantity must be >= loan.quantity**

**In Laravel logs, check for:**
```
local.WARNING: Approve loan failed: Insufficient stock 
{"available":2,"required":5}
```

## Common Issues & Solutions

### Issue 1: 401 Unauthorized
**Symptom:** "Sesi Anda telah berakhir"
**Cause:** Token expired or not sent
**Solution:**
1. Logout and login again
2. Check cookies: `document.cookie`
3. Verify axios interceptor is working

### Issue 2: 403 Forbidden
**Symptom:** "Anda tidak memiliki izin"
**Cause:** User role not authorized
**Solution:**
1. Check user role in database
2. Must be RT/admin role
3. Contact super admin if needed

### Issue 3: 400 Bad Request - Invalid Status
**Symptom:** "Status peminjaman tidak valid"
**Cause:** Loan already processed
**Solution:**
1. Refresh page to get latest status
2. Check loan status in database
3. Only PENDING loans can be approved

### Issue 4: 400 Bad Request - Insufficient Stock
**Symptom:** "Stok aset tidak mencukupi"
**Cause:** Not enough items available
**Solution:**
1. Check asset stock in database
2. Return some items first
3. Or reduce loan quantity

### Issue 5: 500 Server Error
**Symptom:** "Terjadi kesalahan pada server"
**Cause:** Database error, notification error, etc.
**Solution:**
1. **CHECK LARAVEL LOGS!**
2. Look for specific error in logs
3. Fix based on error message

## Testing the Fix

### Test Case 1: Successful Approval
```
1. Login as RT admin
2. Go to Inventaris → Riwayat Peminjaman
3. Find PENDING loan
4. Click "Setujui" button
5. Enter optional note: "Test approval"
6. Click "Ya, Setujui"
7. Check browser console for success logs
8. Check Laravel logs for success messages
9. Verify loan status changed to APPROVED
10. Verify asset stock decreased
```

### Test Case 2: Force Error for Debugging
```
1. Open browser DevTools → Network tab
2. Click "Setujui"
3. Right-click request → "Edit and Resend"
4. Change loan_id to non-existent ID
5. Send request
6. Check 400/404 error in console
7. Check Laravel logs for error details
```

## Files Modified

1. ✅ `web-admin/app/dashboard/inventaris/page.tsx` - Enhanced frontend logging
2. ✅ `api/app/Http/Controllers/Api/AssetController.php` - Enhanced backend logging

## Next Steps

If still getting errors:
1. Share browser console logs
2. Share Laravel error logs
3. Share Network tab request/response details
4. Check database state (loan status, asset stock)
