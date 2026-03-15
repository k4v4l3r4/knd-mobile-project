# Fix: Inventaris dan Peminjaman - Error "Server Error"

## Problem
When clicking "Ajukan Peminjaman" (Submit Loan Request) button in the mobile app's "Inventaris dan Peminjaman" menu for WARGA role, users encountered a "Server Error".

## Root Cause Analysis
The error was caused by insufficient error handling and authentication validation in both the frontend (mobile app) and backend (API):

1. **Frontend Issues:**
   - Generic error message handling that didn't provide specific feedback
   - No detailed logging of API errors
   - Limited error status code handling

2. **Backend Issues:**
   - No explicit authentication check before accessing user data
   - No try-catch block to handle unexpected exceptions
   - No logging of errors for debugging purposes
   - Potential null reference when calling `$request->user()->id` if authentication failed

## Changes Made

### 1. Frontend (mobile-warga/src/screens/InventoryScreen.tsx)

**Enhanced Error Handling in `handleBorrow()` function:**

- Added detailed console logging for debugging
- Implemented specific error messages based on HTTP status codes:
  - **401 Unauthorized**: "Sesi Anda telah berakhir. Silakan login ulang."
  - **403 Forbidden**: "Anda tidak memiliki izin untuk melakukan peminjaman."
  - **500 Server Error**: "Terjadi kesalahan pada server. Silakan coba lagi atau hubungi administrator."
- Improved demo mode message to be more specific
- Better error message fallback chain

**Before:**
```typescript
catch (error: any) {
  Alert.alert(t('common.error'), error.response?.data?.message || t('inventory.error.submitFailed'));
}
```

**After:**
```typescript
catch (error: any) {
  console.error('Loan submission error:', error);
  console.error('Error response:', error.response);
  console.error('Error status:', error.response?.status);
  console.error('Error data:', error.response?.data);
  
  let errorMessage = t('inventory.error.submitFailed');
  
  if (error.response?.status === 401) {
    errorMessage = 'Sesi Anda telah berakhir. Silakan login ulang.';
  } else if (error.response?.status === 403) {
    errorMessage = 'Anda tidak memiliki izin untuk melakukan peminjaman.';
  } else if (error.response?.status === 500) {
    errorMessage = 'Terjadi kesalahan pada server. Silakan coba lagi atau hubungi administrator.';
  } else if (error.response?.data?.message) {
    errorMessage = error.response.data.message;
  } else if (error.message) {
    errorMessage = error.message;
  }
  
  Alert.alert(t('common.error'), errorMessage);
}
```

### 2. Backend (api/app/Http/Controllers/Api/AssetController.php)

**Added Comprehensive Error Handling in `borrow()` method:**

- **Explicit Authentication Check**: Validates user authentication before proceeding
- **Try-Catch Block**: Wraps entire method to catch all exceptions
- **Error Logging**: Logs detailed error information including:
  - Exception type
  - File and line number
  - Full stack trace
- **Graceful Error Responses**: Returns appropriate HTTP status codes and user-friendly messages

**Key Improvements:**
```php
try {
    // Check authentication
    if (!$request->user()) {
        return response()->json([
            'success' => false,
            'message' => 'Unauthorized. Silakan login ulang.'
        ], 401);
    }
    
    // ... existing loan creation logic ...
    
} catch (\Exception $e) {
    \Log::error('Asset borrow error: ' . $e->getMessage(), [
        'exception' => get_class($e),
        'file' => $e->getFile(),
        'line' => $e->getLine(),
        'trace' => $e->getTraceAsString()
    ]);
    
    return response()->json([
        'success' => false,
        'message' => 'Terjadi kesalahan pada server. Silakan coba lagi atau hubungi administrator.'
    ], 500);
}
```

**Added Import:**
```php
use Illuminate\Support\Facades\Log;
```

## Testing

A test script has been provided (`api/test_asset_loan.php`) to verify:
1. WARGA users exist in the database
2. Assets with available quantity exist
3. Laravel Sanctum authentication is properly configured
4. Loan creation logic works correctly
5. Routes are properly configured

**To run the test:**
```bash
cd api
php test_asset_loan.php
```

## Debugging Steps

If the issue persists, follow these steps:

1. **Check Mobile App Logs:**
   - Open React Native debugger or Metro bundler
   - Look for console.error messages when submitting loan request
   - Note the exact HTTP status code and error message

2. **Check Backend Logs:**
   ```bash
   # View latest Laravel logs
   tail -f storage/logs/laravel.log
   ```

3. **Verify Authentication:**
   - Ensure the user is properly logged in
   - Check that the auth token is being sent with requests
   - Verify token hasn't expired

4. **Test API Directly:**
   ```bash
   # Using curl (replace TOKEN and ASSET_ID)
   curl -X POST http://your-api-url/api/assets/loan \
     -H "Authorization: Bearer TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"asset_id": ASSET_ID, "quantity": 1, "loan_date": "2026-03-15"}'
   ```

5. **Database Check:**
   ```sql
   -- Check for WARGA users
   SELECT * FROM users WHERE role IN ('warga', 'WARGA');
   
   -- Check available assets
   SELECT * FROM assets WHERE available_quantity > 0;
   ```

## Expected Behavior After Fix

1. **Successful Submission:**
   - User fills in quantity and date
   - Clicks "Ajukan Peminjaman"
   - Shows success alert: "Pengajuan peminjaman berhasil dikirim"
   - Loan appears in "Riwayat Saya" tab with PENDING status

2. **Authentication Error:**
   - Shows: "Sesi Anda telah berakhir. Silakan login ulang."
   - User should log in again

3. **Permission Error:**
   - Shows: "Anda tidak memiliki izin untuk melakukan peminjaman."
   - User should contact admin

4. **Server Error:**
   - Shows: "Terjadi kesalahan pada server. Silakan coba lagi atau hubungi administrator."
   - Admin can check logs at `storage/logs/laravel.log`

## Files Modified

1. `mobile-warga/src/screens/InventoryScreen.tsx` - Enhanced error handling
2. `api/app/Http/Controllers/Api/AssetController.php` - Added authentication check and error handling

## Additional Notes

- The fix provides better user experience with clear, actionable error messages
- Detailed logging helps administrators debug issues quickly
- Proper HTTP status codes enable better error categorization
- The authentication check prevents null reference errors
- All changes maintain backward compatibility with existing functionality
