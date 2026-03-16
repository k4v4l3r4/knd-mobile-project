# Debug Guide: Status Peminjaman Tidak Berubah Setelah Approve

## Problem
Setelah klik "Setujui" dan muncul toast "Peminjaman berhasil disetujui", status peminjaman di tabel tidak berubah, masih menampilkan "Menunggu" padahal seharusnya "Disetujui".

## Root Cause Analysis

### Backend Already Correct ✅
The backend code in `api/app/Http/Controllers/Api/AssetController.php` already correctly updates the status:

```php
// Update status
$loan->update([
    'status' => 'APPROVED',
    'admin_note' => $request->admin_note
]);
Log::info('Loan status updated to APPROVED', ['loan_id' => $id]);
```

### Potential Frontend Issues 🔍

1. **Response not verified** - Not checking if `response.data.success === true`
2. **Refresh not awaited** - `fetchLoans()` might be async but not awaited
3. **State update issue** - React state might not update properly
4. **Cache issue** - Browser or API cache showing old data

## Solution Applied

### 1. Added Response Verification
```typescript
const response = await api.post(`/assets/loans/${id}/${action}`, { 
  admin_note: note 
});

console.log(`[INVENTARIS] ${action} response status:`, response.status);
console.log(`[INVENTARIS] ${action} response data:`, response.data);
console.log(`[INVENTARIS] ${action} - Success:`, response.data.success);
console.log(`[INVENTARIS] ${action} - Updated loan status:`, response.data.data?.status);

// Verify the response is successful before proceeding
if (!response.data.success) {
  throw new Error(response.data.message || 'Gagal memproses peminjaman');
}
```

### 2. Force Await Refresh
```typescript
toast.success(successMessage);
closeLoanActionModal();

// Force refresh the loans list
await fetchLoans();  // <-- Now awaited
console.log(`[INVENTARIS] ${action} - Loans list refreshed`);
```

### 3. Enhanced Fetch Logging
```typescript
console.log('[INVENTARIS] Fetching loans from API...');
const res = await api.get('/assets/loans/requests');
console.log('[INVENTARIS] Loans API response:', res.data);
console.log('[INVENTARIS] Loans count:', res.data.data?.length || 0);

if (res.data.data) {
  setLoans(res.data.data);
  console.log('[INVENTARIS] Loans state updated. First loan status:', res.data.data[0]?.status);
}
```

## How to Debug

### Step 1: Open Browser DevTools (F12)
```
Console tab → Filter by "[INVENTARIS]"
```

### Step 2: Test Approve Loan
1. Click "Setujui" button on a PENDING loan
2. Enter optional note
3. Click "Ya, Setujui"

### Step 3: Check Console Logs

**Expected flow:**
```
[INVENTARIS] Processing approve for loan 123
[INVENTARIS] Payload: {admin_note: "..."}
[INVENTARIS] approve response status: 200
[INVENTARIS] approve response data: {success: true, message: "...", data: {...}}
[INVENTARIS] approve - Success: true
[INVENTARIS] approve - Updated loan status: "APPROVED"
[INVENTARIS] approve - Refreshing loans list...
[INVENTARIS] Fetching loans from API...
[INVENTARIS] Loans API response: {data: [...]}
[INVENTARIS] Loans count: 5
[INVENTARIS] Loans state updated. First loan status: "APPROVED"
[INVENTARIS] approve - Loans list refreshed
```

### Step 4: Check Network Tab

**Find the POST request:**
```
POST /api/assets/loans/{id}/approve
Status: 200 OK

Response:
{
  "success": true,
  "message": "Peminjaman disetujui",
  "data": {
    "id": 123,
    "status": "APPROVED",  // <-- Should be APPROVED
    ...
  }
}
```

**Then find the GET request:**
```
GET /api/assets/loans/requests
Status: 200 OK

Response:
{
  "data": [
    {
      "id": 123,
      "status": "APPROVED",  // <-- Should be APPROVED here too
      ...
    },
    ...
  ]
}
```

## Common Issues & Solutions

### Issue 1: Response Success is False
**Symptom:**
```
[INVENTARIS] approve - Success: false
Error: Gagal memproses peminjaman
```

**Cause:** Backend validation failed silently

**Solution:**
1. Check Laravel logs for validation errors
2. Check user permissions
3. Check loan status (must be PENDING)

### Issue 2: Updated Status is Still PENDING
**Symptom:**
```
[INVENTARIS] approve - Updated loan status: "PENDING"  // Should be APPROVED!
```

**Cause:** Database transaction failed or rolled back

**Solution:**
1. Check Laravel logs for database errors
2. Check PostgreSQL constraints
3. Check if asset stock is sufficient

### Issue 3: API Returns Old Data
**Symptom:**
```
[INVENTARIS] Fetching loans from API...
[INVENTARIS] Loans state updated. First loan status: "PENDING"  // Still old!
```

**Cause:** API cache or database replication lag

**Solution:**
```bash
# Clear Laravel cache
cd c:\Users\Administrator\knd-rt-online\api
php artisan config:clear
php artisan cache:clear
php artisan route:clear

# Clear browser cache
Ctrl+Shift+Delete → Clear browsing data
```

### Issue 4: State Not Updating
**Symptom:**
```
[INVENTARIS] Loans API response: {data: [...]}
[INVENTARIS] Loans count: 5
// But no "Loans state updated" log
```

**Cause:** React state update failed

**Solution:**
1. Check if component re-renders
2. Check if `setLoans` is being called
3. Try forcing re-render with key change

### Issue 5: Demo Mode Interference
**Symptom:**
```
Demo mode active - using hardcoded data
```

**Cause:** Demo token prevents API calls

**Solution:**
1. Check if using demo token
2. Logout and login with real credentials
3. Or disable demo mode in `.env`

## Testing Checklist

### Test Case 1: Normal Approve Flow ✅
```
1. Login as RT admin
2. Go to Inventaris → Riwayat Peminjaman
3. Find loan with status "Menunggu"
4. Click "Setujui"
5. Enter note: "Test approval"
6. Click "Ya, Setujui"
7. Check console logs - should see all success messages
8. Check table - status should change to "Disetujui"
9. Badge color should change from yellow to blue
```

### Test Case 2: Multiple Sequential Approves ✅
```
1. Approve first loan
2. Wait for status to update
3. Approve second loan immediately
4. Both statuses should update correctly
5. Check console for any race condition warnings
```

### Test Case 3: Approve Then Refresh Page ✅
```
1. Approve a loan
2. Manually refresh page (F5)
3. Status should still be "Disetujui" (persisted in DB)
```

## Database Verification

### Check Current Loan Status
```sql
SELECT 
    id,
    status,
    admin_note,
    updated_at
FROM asset_loans
ORDER BY updated_at DESC
LIMIT 10;
```

Expected: Most recent approved loan should show `status = 'APPROVED'`

### Check for Stuck Transactions
```sql
-- Look for any locks or stuck transactions
SELECT * FROM pg_locks WHERE relation = 'asset_loans'::regclass;
```

## Files Modified

1. ✅ `web-admin/app/dashboard/inventaris/page.tsx`
   - Enhanced `handleLoanActionSubmit()` with response verification
   - Changed `fetchLoans()` to be awaited
   - Added comprehensive console logging at every step
   - Added error throwing if response.success is false

## Next Steps

If status still doesn't change after these fixes:

1. **Share Console Logs** - Copy full console output from F12
2. **Share Network Tab** - Screenshot of both POST and GET requests
3. **Check Database Directy** - Run SQL query above to see actual status
4. **Clear All Caches** - Laravel + browser cache
5. **Test with Different Browser** - Rule out browser-specific issues

## Expected Behavior After Fix

**Before Approve:**
```
┌─────────────────────────────────────┐
│ Riwayat Peminjaman                  │
├─────────────────────────────────────┤
│ #1 - Kursi Lipat                    │
│ Status: [MENUNGGU] ← Yellow badge   │
│ Actions: [Setujui] [Tolak]          │
└─────────────────────────────────────┘
```

**After Clicking "Setujui":**
```
✓ Peminjaman berhasil disetujui

┌─────────────────────────────────────┐
│ Riwayat Peminjaman                  │
├─────────────────────────────────────┤
│ #1 - Kursi Lipat                    │
│ Status: [DIS ETUJUI] ← Blue badge   │
│ Actions: [Kembalikan]               │
└─────────────────────────────────────┘
```

## Key Changes Summary

✅ **Added response verification** - Checks `response.data.success` before proceeding  
✅ **Made refresh synchronous** - Uses `await fetchLoans()` to ensure completion  
✅ **Enhanced logging** - Detailed console logs at every step  
✅ **Error handling** - Throws error if backend returns failure  
✅ **State update confirmation** - Logs confirm state was updated  

---

**Last Updated:** March 16, 2026  
**Status:** Ready for testing
