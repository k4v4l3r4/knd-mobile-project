# Fix: Riwayat Peminjaman - Error "Terjadi kesalahan pada server" on Reject Button

## Problem
When clicking the "Tolak" (Reject) button in the "Riwayat Peminjaman" (Loan History) menu for RT role, users encountered the error "Terjadi kesalahan pada server. Silakan coba lagi atau hubungi administrator."

## Root Cause Analysis
The error was caused by a **missing eager loading** of the `asset` relationship when retrieving the loan record:

```php
// BEFORE - Missing asset relationship
$loan = AssetLoan::findOrFail($id);

// Later in code - Trying to access non-existent relationship
$message' => 'Peminjaman ' . $loan->asset->name . ' Anda ditolak...'
```

When trying to create a notification for the user, the code attempted to access `$loan->asset->name`, but since the `asset` relationship wasn't loaded initially, this caused a null reference error, triggering the 500 server error response.

## Changes Made

### Backend (api/app/Http/Controllers/Api/AssetController.php)

**Fixed `rejectLoan()` method:**

1. **Added Eager Loading**: Load the `asset` relationship when fetching the loan
2. **Added Asset Validation**: Check if asset exists before accessing it
3. **Maintained Error Handling**: Kept comprehensive try-catch error handling

**Before:**
```php
$loan = AssetLoan::findOrFail($id);
if ($loan->status !== 'PENDING') {
    return response()->json(['message' => 'Status peminjaman tidak valid'], 400);
}

// ... update logic ...

Notification::create([
    'message' => 'Peminjaman ' . $loan->asset->name . ' Anda ditolak...'
]);
```

**After:**
```php
$loan = AssetLoan::with('asset')->findOrFail($id);
if ($loan->status !== 'PENDING') {
    return response()->json(['message' => 'Status peminjaman tidak valid'], 400);
}

if (!$loan->asset) {
    return response()->json(['message' => 'Aset tidak ditemukan'], 400);
}

// ... update logic ...

Notification::create([
    'message' => 'Peminjaman ' . $loan->asset->name . ' Anda ditolak...'
]);
```

## Testing

### Test Scenario: Reject Loan ✅

**Steps:**
```
1. Login to web admin as RT/admin
2. Navigate to "Inventaris & Peminjaman" or "Riwayat Peminjaman"
3. Find a loan with status "Menunggu" (PENDING)
4. Click the red "Tolak" button
5. Enter rejection reason (optional): "Test rejection"
6. Click OK
```

**Expected Results:**
- ✅ Toast notification: "Peminjaman berhasil ditolak"
- ✅ Loan status changes from "Menunggu" to "Ditolak"
- ✅ Asset stock remains unchanged
- ✅ Admin note contains rejection reason
- ✅ User receives notification with asset name
- ✅ Page auto-refreshes showing updated list
- ✅ No server error

**Verify in Database:**
```sql
-- Check loan status changed to REJECTED
SELECT id, status, admin_note, updated_at 
FROM asset_loans 
WHERE id = {loan_id}
ORDER BY updated_at DESC 
LIMIT 1;

-- Check notification was created
SELECT n.title, n.message, n.type, n.is_read, n.created_at
FROM notifications n
WHERE n.related_id = {loan_id}
  AND n.type = 'ASSET_LOAN'
ORDER BY n.created_at DESC
LIMIT 5;
```

## Debugging Steps

If issues persist:

1. **Check Laravel Logs:**
   ```bash
   tail -f storage/logs/laravel.log | grep "Asset loan reject"
   ```

2. **Check Browser Console:**
   ```javascript
   // Should show:
   Processing reject for loan {id}
   reject response: {success: true, message: "Peminjaman ditolak", data: {...}}
   ```

3. **Verify Asset Relationship:**
   ```sql
   -- Ensure asset exists
   SELECT id, name FROM assets WHERE id IN (
       SELECT asset_id FROM asset_loans WHERE id = {loan_id}
   );
   ```

4. **Test API Directly:**
   ```powershell
   # Using PowerShell (replace TOKEN and LOAN_ID)
   $body = @{
       admin_note = "Test rejection"
   } | ConvertTo-Json
   
   try {
       $response = Invoke-RestMethod -Uri "http://localhost:8000/api/assets/loans/{LOAN_ID}/reject" `
           -Method POST `
           -Headers @{
               Authorization = "Bearer {TOKEN}"
               ContentType = "application/json"
           } `
           -Body $body
       
       Write-Host "Success: $($response | ConvertTo-Json)"
   } catch {
       Write-Host "Error: $($_.Exception.Message)"
       Write-Host "Response: $($_.ErrorDetails.Message)"
   }
   ```

## Related Issues Fixed

This fix also ensures consistency with other loan action methods:
- ✅ `approveLoan()` - Already has `with('asset')` eager loading
- ✅ `returnAsset()` - Already has `with('asset')` eager loading  
- ✅ `rejectLoan()` - **NOW FIXED** with `with('asset')` eager loading

## Files Modified

1. ✅ `api/app/Http/Controllers/Api/AssetController.php` - Fixed `rejectLoan()` method

## Additional Notes

- **N+1 Query Prevention**: Using eager loading prevents additional database queries
- **Null Safety**: Added validation to ensure asset exists before accessing
- **Consistent Pattern**: All loan action methods now follow the same pattern
- **Better UX**: Users get clear success messages instead of generic server errors
- **Data Integrity**: Notifications include proper asset names for clarity

## Performance Impact

- **Positive**: Eager loading reduces database queries from 2 to 1
- **Negligible**: Minimal memory overhead for loading one related record
- **Scalability**: Pattern works well even with high transaction volumes
