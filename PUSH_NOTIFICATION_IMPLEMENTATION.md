# ✅ Push Notification Implementation for Asset Loan Status Updates

## Overview
Warga sekarang akan menerima **push notification** di mobile app ketika status peminjaman mereka berubah.

### Notification Types Implemented:
1. ✅ **Peminjaman Disetujui** - When RT approves loan request
2. ✅ **Peminjaman Ditolak** - When RT rejects loan request  
3. ✅ **Pengembalian Dikonfirmasi** - When RT confirms asset return

---

## What Was Changed

### Backend Changes

#### File: `api/app/Http/Controllers/Api/AssetController.php`

##### 1. approveLoan() Method (Line ~341-375)
**Before:**
```php
// Only database notification
\App\Models\Notification::create([
    'user_id' => $loan->user_id,
    'title' => 'Peminjaman Disetujui',
    'message' => 'Peminjaman ' . $asset->name . ' Anda telah disetujui.',
    ...
]);
```

**After:**
```php
// 1. Database notification
\App\Models\Notification::create([...]);

// 2. Firebase push notification
$borrower = User::find($loan->user_id);
if ($borrower && $borrower->device_token) {
    $firebaseService = new \App\Services\FirebaseNotificationService();
    $firebaseService->sendToDevice(
        $borrower->device_token,
        '✓ Peminjaman Disetujui',
        'Peminjaman ' . $asset->name . ' Anda telah disetujui oleh RT.',
        [
            'type' => 'ASSET_LOAN_APPROVED',
            'loan_id' => (string) $loan->id,
            'asset_name' => $asset->name,
            'url' => '/mobile/loans',
        ]
    );
}
```

##### 2. rejectLoan() Method (Line ~430-475)
```php
// Firebase push notification for rejection
$firebaseService->sendToDevice(
    $borrower->device_token,
    '✗ Peminjaman Ditolak',
    'Peminjaman ' . $loan->asset->name . ' Anda ditolak. Alasan: ' . ($request->admin_note ?? '-'),
    [
        'type' => 'ASSET_LOAN_REJECTED',
        'loan_id' => (string) $loan->id,
        'asset_name' => $loan->asset->name,
        'url' => '/mobile/loans',
    ]
);
```

##### 3. returnAsset() Method (Line ~516-560)
```php
// Firebase push notification for return confirmation
$firebaseService->sendToDevice(
    $borrower->device_token,
    '✓ Pengembalian Dikonfirmasi',
    'Terima kasih, pengembalian ' . $loan->asset->name . ' telah dikonfirmasi.',
    [
        'type' => 'ASSET_LOAN_RETURNED',
        'loan_id' => (string) $loan->id,
        'asset_name' => $loan->asset->name,
        'url' => '/mobile/loans',
    ]
);
```

---

## How It Works

### Dual Notification System

```
┌─────────────────────────────────────────────┐
│  RT Clicks "Setujui" on Loan Request        │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│  Backend Processes Approval                 │
│  1. Update loan status to APPROVED          │
│  2. Decrease asset stock                    │
└─────────────────┬───────────────────────────┘
                  │
         ┌────────┴────────┐
         │                 │
         ▼                 ▼
┌─────────────────┐ ┌──────────────────────┐
│ Database        │ │ Firebase Push        │
│ Notification    │ │ Notification         │
│                 │ │                      │
│ • Saved in DB   │ │ • Sent to mobile     │
│ • Shows in      │ │ • Appears on lock    │
│   app inbox     │ │   screen             │
│                 │ │ • Works even if app  │
│                 │ │   is closed          │
└─────────────────┘ └──────────────────────┘
         │                 │
         │                 │
         ▼                 ▼
    ┌──────────────────────────┐
    │  Warga Receives Both     │
    │  Notifications!          │
    └──────────────────────────┘
```

### Notification Flow

**Step 1: Database Notification**
- Stored in `notifications` table
- Accessible via app's notification inbox
- Persists across sessions
- Can be marked as read/unread

**Step 2: Firebase Push Notification**
- Sent via Firebase Cloud Messaging
- Appears on phone's lock screen
- Shows in notification tray
- Works even when app is closed
- Includes deep link data to open specific screen

---

## Notification Payload Structure

### Example: Loan Approved
```json
{
  "to": "device_token_here",
  "notification": {
    "title": "✓ Peminjaman Disetujui",
    "body": "Peminjaman Kursi Lipat Anda telah disetujui oleh RT."
  },
  "data": {
    "type": "ASSET_LOAN_APPROVED",
    "loan_id": "uuid-here",
    "asset_name": "Kursi Lipat",
    "url": "/mobile/loans"
  }
}
```

### Data Fields Explained:
- `type`: Notification type for app to handle appropriately
- `loan_id`: UUID of the loan for API calls
- `asset_name`: Name of the borrowed asset
- `url`: Deep link path to open when notification tapped

---

## Testing Guide

### Prerequisites
1. User must have mobile app installed
2. App must have permission to show notifications
3. User's `device_token` must be saved in database

### Step 1: Verify Device Token Exists
```sql
SELECT 
    id,
    name,
    email,
    device_token
FROM users
WHERE role = 'warga'
ORDER BY updated_at DESC
LIMIT 5;
```

Expected: Recent warga users should have `device_token` populated.

### Step 2: Test Loan Approval
```
1. Login as RT admin on web
2. Go to Inventaris → Riwayat Peminjaman
3. Find PENDING loan from test user
4. Click "Setujui"
5. Enter note: "Test approval notification"
6. Click "Ya, Setujui"
```

### Step 3: Check Mobile Device
**Expected on warga's phone:**

**Lock Screen:**
```
┌─────────────────────────────────┐
│  ✓ Peminjaman Disetujui         │
│  Peminjaman Kursi Lipat Anda    │
│  telah disetujui oleh RT.       │
│  Just now                       │
└─────────────────────────────────┘
```

**Notification Tray:**
```
┌─────────────────────────────────┐
│  KND RT Online       10:30 AM   │
│  ✓ Peminjaman Disetujui         │
│  Peminjaman Kursi Lipat Anda    │
│  telah disetujui oleh RT.       │
└─────────────────────────────────┘
```

### Step 4: Tap Notification
**Expected behavior:**
- App opens automatically
- Navigates to `/mobile/loans` screen
- Shows loan history with approved loan highlighted

### Step 5: Check In-App Notifications
```
In mobile app:
1. Open app
2. Go to Profile/Sidebar
3. Tap "Notifikasi"
4. Should see "Peminjaman Disetujui" in list
```

---

## Debugging

### Check Laravel Logs
```bash
cd c:\Users\Administrator\knd-rt-online\api
Get-Content storage/logs/laravel.log -Tail 100
```

**Look for these success messages:**
```
[datetime] local.INFO: Database notification created successfully {"user_id":"..."}
[datetime] local.INFO: Firebase push notification sent {"user_id":"..."}
[datetime] local.INFO: Loan approval completed successfully {"loan_id":"..."}
```

**If device token missing:**
```
[datetime] local.WARNING: Borrower device token not found, skipping push notification {"user_id":"..."}
```

**If Firebase fails:**
```
[datetime] local.ERROR: Firebase notification failed: [error details]
```

### Check Database Notifications
```sql
SELECT 
    n.id,
    n.title,
    n.message,
    n.type,
    n.is_read,
    n.created_at,
    u.name as recipient
FROM notifications n
JOIN users u ON n.notifiable_id = u.id
WHERE n.type = 'ASSET_LOAN'
ORDER BY n.created_at DESC
LIMIT 10;
```

### Check Firebase Service Configuration
```bash
# Verify Firebase credentials file exists
ls -la c:\Users\Administrator\knd-rt-online\api\firebase-credentials.json

# Check .env configuration
grep FIREBASE c:\Users\Administrator\knd-rt-online\api\.env
```

Expected:
```
FIREBASE_CREDENTIALS=firebase-credentials.json
```

---

## Common Issues & Solutions

### Issue 1: Push Notification Not Received

**Symptoms:**
- Database notification exists
- No push notification on phone
- Log shows: "Borrower device token not found"

**Causes:**
1. User hasn't logged into mobile app yet
2. Device token expired
3. App notification permission denied

**Solutions:**
```sql
-- Check if device token exists
SELECT id, name, device_token 
FROM users 
WHERE id = 'user-uuid-here';

-- If NULL, user needs to login to mobile app again
-- Token is set during login process
```

### Issue 2: Firebase Service Initialization Failed

**Symptoms:**
- Log shows: "Firebase messaging not initialized"
- No push notifications sent

**Causes:**
1. Missing `firebase-credentials.json` file
2. Invalid Firebase configuration

**Solutions:**
```bash
# 1. Verify credentials file exists
ls api/firebase-credentials.json

# 2. Check file permissions (should be readable by web server)

# 3. Restart PHP-FPM/Apache
sudo systemctl restart php-fpm
```

### Issue 3: Notification Shows But Wrong Screen Opens

**Symptoms:**
- Push notification received
- Tapping opens wrong screen

**Cause:** Incorrect `url` in notification data

**Solution:** Ensure `url` field matches mobile app routing:
```php
'url' => '/mobile/loans',  // Correct
// NOT: '/loans' or '/asset-loans'
```

### Issue 4: Notifications Not Showing in App Inbox

**Symptoms:**
- Push notification received
- But not showing in app's notification list

**Cause:** App not fetching notifications properly

**Solution:** Check mobile app notification fetch logic:
```typescript
// In mobile app
const notifications = await api.get('/notifications');
// Should include both database and pushed notifications
```

---

## Performance Considerations

### Async Processing (Current Implementation)
✅ **Good:** Firebase notification sent synchronously within transaction
- Ensures notification is sent before response
- User gets immediate feedback
- Can track failures in real-time

⚠️ **Consideration:** Slightly slower response time (~100-300ms extra)

### Future Optimization: Queue System
```php
// Could be moved to queue for better performance
dispatch(new SendLoanNotification($loan, 'APPROVED'));

// Benefits:
// - Faster API response
// - Retry mechanism built-in
// - Better error handling
```

---

## Security & Privacy

### What's Included in Push Notification:
✅ Safe information:
- Asset name
- Loan status
- Generic action messages

❌ NOT included:
- Personal identification numbers
- Financial information
- Passwords or tokens
- Other sensitive data

### Notification Permissions:
Mobile app must request and receive notification permission from user:
- iOS: Explicit permission required
- Android: Granted by default (can be revoked)

---

## Files Modified

1. ✅ `api/app/Http/Controllers/Api/AssetController.php`
   - Updated `approveLoan()` method with Firebase push notification
   - Updated `rejectLoan()` method with Firebase push notification
   - Updated `returnAsset()` method with Firebase push notification
   - All three methods now send dual notifications (database + push)

---

## Success Criteria

### ✅ Complete When:

1. **Database Notification Created**
   ```sql
   SELECT * FROM notifications 
   WHERE type = 'ASSET_LOAN' 
   AND notifiable_type = 'App\\Models\\User'
   ORDER BY created_at DESC LIMIT 1;
   ```
   Should show recent notification with all fields populated.

2. **Firebase Push Notification Sent**
   ```
   Laravel log shows:
   "Firebase push notification sent {"user_id":"..."}"
   ```

3. **User Receives Notification on Phone**
   - Lock screen notification appears
   - Notification tray shows message
   - Tapping opens correct app screen

4. **In-App Notification Synced**
   - App notification inbox shows new notification
   - Can be marked as read
   - Persists across app restarts

---

## Next Steps

1. ✅ **Test with Real Device**
   - Use actual mobile phone (not emulator)
   - Test with app in foreground, background, and closed states

2. ✅ **Monitor Logs**
   - Watch for successful sends
   - Track any failures or warnings

3. ✅ **User Feedback**
   - Ask test users if they received notifications
   - Verify notification clarity and timing

4. 🔄 **Future Enhancements**
   - Add notification sound customization
   - Implement notification categories/priority
   - Add notification preferences (opt-out options)

---

**Implementation Date:** March 16, 2026  
**Status:** ✅ COMPLETE - Ready for Testing  
**Tested By:** Pending user confirmation
