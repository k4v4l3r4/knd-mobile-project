# Firebase Push Notifications Setup Guide 📱
**Date:** 2026-03-14  
**Status:** 🟡 Implementation Complete - Setup Required

---

## Overview
Implemented Firebase Cloud Messaging (FCM) push notifications for order status updates. Users will receive real-time notifications when their order status changes.

---

## ✅ Files Created

### Backend (Laravel)

#### 1. FirebaseNotificationService.php
**Location:** `api/app/Services/FirebaseNotificationService.php`
**Lines:** 211

**Features:**
- Initialize Firebase messaging
- Send to single device token
- Send to multiple devices (batch)
- Send to topic (RT/RW groups)
- Specialized methods for order notifications:
  - `sendOrderStatusNotification()`
  - `sendPaymentConfirmation()`
  - `sendShippingNotification()`

**Usage Example:**
```php
$firebase = app(FirebaseNotificationService::class);

// Send order status update
$firebase->sendOrderStatusNotification(
    $deviceToken,
    'ORD-20260314-ABC123',
    'WAITING_CONFIRMATION',
    'PROCESSING',
    123
);

// Send payment confirmation
$firebase->sendPaymentConfirmation(
    $deviceToken,
    'ORD-20260314-ABC123',
    123
);

// Send shipping notification
$firebase->sendShippingNotification(
    $deviceToken,
    'ORD-20260314-ABC123',
    'JNE Regular',
    'JNE1234567890',
    123
);
```

---

#### 2. OrderStatusUpdated Notification Class
**Location:** `api/app/Notifications/OrderStatusUpdated.php`
**Lines:** 122

**Features:**
- Implements ShouldQueue for background processing
- Dual delivery channels: database + Firebase
- Automatically sends to all user's registered devices
- Includes deep link data in payload

**Channels:**
```php
public function via(object $notifiable): array
{
    return ['database', 'firebase'];
}
```

**Database Payload:**
```json
{
  "order_id": 123,
  "order_number": "ORD-20260314-ABC123",
  "old_status": "WAITING_CONFIRMATION",
  "new_status": "PROCESSING",
  "message": "Status pesanan #ORD-20260314-ABC123 telah berubah menjadi Diproses"
}
```

**Firebase Payload:**
```json
{
  "notification": {
    "title": "Update Pesanan",
    "body": "Status pesanan Anda #ORD-20260314-ABC123 telah berubah menjadi Diproses"
  },
  "data": {
    "type": "order_status_update",
    "order_id": "123",
    "order_number": "ORD-20260314-ABC123",
    "old_status": "WAITING_CONFIRMATION",
    "new_status": "PROCESSING",
    "timestamp": "2026-03-14T10:30:00+07:00"
  }
}
```

---

### Integration Points

#### AdminOrderController - Auto Notifications
**Already integrated in these methods:**

1. **confirmPayment()** - WAITING_CONFIRMATION → PROCESSING
   ```php
   $order->user->notify(new OrderStatusUpdated($order, $oldStatus, Order::STATUS_PROCESSING));
   ```

2. **shipOrder()** - PROCESSING → SHIPPED
   ```php
   $order->user->notify(new OrderStatusUpdated($order, $oldStatus, Order::STATUS_SHIPPED));
   ```

3. **completeOrder()** - SHIPPED → DELIVERED → COMPLETED
   ```php
   // First notification: SHIPPED → DELIVERED
   $order->user->notify(new OrderStatusUpdated($order, Order::STATUS_SHIPPED, Order::STATUS_DELIVERED));
   
   // Second notification: DELIVERED → COMPLETED
   $order->user->notify(new OrderStatusUpdated($order, Order::STATUS_DELIVERED, Order::STATUS_COMPLETED));
   ```

4. **cancelOrder()** - Any → CANCELLED
   ```php
   $order->user->notify(new OrderStatusUpdated($order, $oldStatus, Order::STATUS_CANCELLED));
   ```

---

## 🔧 Setup Instructions

### Step 1: Install Firebase PHP SDK
```bash
cd api
composer require kreait/laravel-firebase
```

This installs:
- `kreait/laravel-firebase` (Laravel wrapper)
- `kreait/firebase-php` (Core SDK)

---

### Step 2: Get Firebase Credentials

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (or create new one)
3. Go to **Project Settings** ⚙️
4. Go to **Service Accounts** tab
5. Click **"Generate New Private Key"**
6. Save the JSON file as `firebase-credentials.json`

---

### Step 3: Place Credentials File

**Option A: Root directory (recommended for development)**
```
c:\Users\Administrator\knd-rt-online\api\firebase-credentials.json
```

**Option B: Storage directory (production)**
```
c:\Users\Administrator\knd-rt-online\api\storage\app\firebase\firebase-credentials.json
```

---

### Step 4: Configure Environment Variables

Add to `.env` file:
```env
FIREBASE_CREDENTIALS=firebase-credentials.json
FIREBASE_PROJECT_ID=your-project-id
```

---

### Step 5: Add Device Tokens Column to Users Table

Create migration:
```bash
php artisan make:migration add_device_tokens_to_users_table
```

Migration content:
```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->json('device_tokens')->nullable()->after('phone');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('device_tokens');
        });
    }
};
```

Run migration:
```bash
php artisan migrate
```

---

### Step 6: Create API Endpoint to Save Device Tokens

Create controller:
```bash
php artisan make:controller Api/DeviceTokenController
```

Controller content:
```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class DeviceTokenController extends Controller
{
    public function store(Request $request)
    {
        $request->validate([
            'device_token' => 'required|string|max:2048',
            'device_type' => 'nullable|string|in:ios,android',
        ]);

        $user = Auth::user();
        
        // Get existing tokens
        $existingTokens = is_array($user->device_tokens) 
            ? $user->device_tokens 
            : json_decode($user->device_tokens, true) ?? [];
        
        // Add new token if not exists
        if (!in_array($request->device_token, $existingTokens)) {
            $existingTokens[] = $request->device_token;
            $user->device_tokens = $existingTokens;
            $user->save();
        }

        return response()->json([
            'message' => 'Device token saved successfully',
            'tokens_count' => count($existingTokens),
        ]);
    }

    public function destroy(Request $request)
    {
        $request->validate([
            'device_token' => 'required|string|max:2048',
        ]);

        $user = Auth::user();
        $existingTokens = is_array($user->device_tokens) 
            ? $user->device_tokens 
            : json_decode($user->device_tokens, true) ?? [];
        
        // Remove token
        $existingTokens = array_filter($existingTokens, function($token) use ($request) {
            return $token !== $request->device_token;
        });
        
        $user->device_tokens = array_values($existingTokens);
        $user->save();

        return response()->json([
            'message' => 'Device token removed successfully',
        ]);
    }
}
```

---

### Step 7: Add Routes for Device Token Management

Add to `api/routes/api.php`:
```php
// Device Token Management
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/device-token', [DeviceTokenController::class, 'store']);
    Route::delete('/device-token', [DeviceTokenController::class, 'destroy']);
});
```

---

## 📱 Mobile Integration (React Native)

### Step 1: Install Firebase Packages
```bash
cd mobile-warga
npm install @react-native-firebase/app @react-native-firebase/messaging
cd ios && pod install
```

For Expo:
```bash
npx expo install expo-notifications
```

---

### Step 2: Create Notification Service

Create `mobile-warga/src/services/notificationService.ts`:
```typescript
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import api from './api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const registerPushNotifications = async () => {
  if (!Device.isDevice) {
    console.log('Must use physical device for Push Notifications');
    return;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  if (finalStatus !== 'granted') {
    console.log('Failed to get push token for push notification!');
    return;
  }

  // Get Expo push token
  const token = (await Notifications.getExpoPushTokenAsync({
    projectId: 'your-expo-project-id',
  })).data;

  console.log('Push Token:', token);

  // Save to backend
  try {
    await api.post('/device-token', {
      device_token: token,
      device_type: Platform.OS === 'ios' ? 'ios' : 'android',
    });
  } catch (error) {
    console.error('Failed to save device token:', error);
  }

  // Handle notification received while app is open
  Notifications.addNotificationReceivedListener(notification => {
    console.log('Notification received:', notification);
    // You can navigate to order detail here based on notification.data
  });

  // Handle notification tap
  Notifications.addNotificationResponseReceivedListener(response => {
    console.log('Notification tapped:', response);
    const data = response.notification.request.content.data;
    
    if (data.type === 'order_status_update' && data.order_id) {
      // Navigate to order detail screen
      // navigation.navigate('OrderDetail', { orderId: data.order_id });
    }
  });
};
```

---

### Step 3: Call Registration in App.tsx

Add to `App.tsx`:
```typescript
import { registerPushNotifications } from './src/services/notificationService';

export default function App() {
  useEffect(() => {
    // Register for push notifications after login
    const setupNotifications = async () => {
      await registerPushNotifications();
    };

    setupNotifications();
  }, []);

  return (
    // ... your app code
  );
}
```

---

## Testing Notifications

### Test 1: Send Test Notification Manually

Create test file `test_push_notification.php`:
```php
<?php

require __DIR__ . '/vendor/autoload.php';

use Kreait\Firebase\Factory;
use Kreait\Firebase\Messaging\CloudMessage;
use Kreait\Firebase\Messaging\Notification;

$factory = (new Factory)
    ->withServiceAccount(__DIR__ . '/firebase-credentials.json');

$messaging = $factory->createMessaging();

$message = CloudMessage::withTarget('token', 'YOUR_DEVICE_TOKEN_HERE')
    ->withNotification(Notification::create(
        'Test Notification',
        'Ini adalah test notifikasi dari sistem KND RT Online'
    ))
    ->withData([
        'type' => 'test',
        'custom_data' => 'test_value',
    ]);

try {
    $messaging->send($message);
    echo "✅ Notification sent successfully!\n";
} catch (\Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}
```

Run:
```bash
php test_push_notification.php
```

---

### Test 2: Trigger Real Order Status Update

```bash
# Login as admin and call ship order endpoint
curl -X POST http://localhost/api/admin/orders/1/ship \
  -H "Authorization: Bearer {admin_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "courier_info": {
      "name": "JNE Regular",
      "phone": "081234567890",
      "type": "REGULER"
    },
    "tracking_number": "JNE1234567890"
  }'
```

User should receive notification:
- **Title:** Update Pesanan
- **Body:** Status pesanan Anda #ORD-xxx telah berubah menjadi Dikirim
- **Tap action:** Opens order detail screen

---

## Notification Flow Diagram

```
Admin Action (Web-Admin)
       ↓
API Endpoint Called
       ↓
Order Status Updated
       ↓
OrderStatusUpdated Notification Created
       ↓
       ├─→ Database Channel → Saved to notifications table
       │
       └─→ Firebase Channel
              ↓
         FirebaseNotificationService
              ↓
         Firebase Cloud Messaging
              ↓
         User's Device(s)
              ↓
         Push Notification Displayed
              ↓
         User Taps Notification
              ↓
         Opens Order Detail Screen
```

---

## Troubleshooting

### Issue 1: Notifications Not Sending

**Check:**
1. Firebase credentials file exists and is valid JSON
2. `FIREBASE_CREDENTIALS` env variable is set correctly
3. Firebase package is installed: `composer show | grep firebase`
4. Check Laravel logs: `storage/logs/laravel.log`

**Debug:**
```php
// In FirebaseNotificationService constructor
if (!$this->messaging) {
    Log::error('Firebase messaging is null!');
} else {
    Log::info('Firebase messaging initialized successfully');
}
```

---

### Issue 2: User Not Receiving Notifications

**Check:**
1. User has device tokens saved:
   ```sql
   SELECT id, name, device_tokens FROM users WHERE id = {user_id};
   ```
2. Device token format is correct (long string)
3. Mobile app has registered for push notifications
4. Notification permissions granted on device

**Debug:**
```php
// In OrderStatusUpdated->toFirebase()
if (empty($notifiable->device_tokens)) {
    Log::warning('User has no device tokens', ['user_id' => $notifiable->id]);
    return null;
}

Log::info('Sending notification', [
    'user_id' => $notifiable->id,
    'tokens' => $notifiable->device_tokens,
]);
```

---

### Issue 3: Notification Received But No Deep Link

**Check:**
1. Notification includes `data` payload
2. Mobile app handles notification tap
3. Navigation logic in `addNotificationResponseReceivedListener`

**Mobile Debug:**
```typescript
// Add logging
Notifications.addNotificationResponseReceivedListener(response => {
  console.log('Tapped notification:', response);
  console.log('Data:', response.notification.request.content.data);
  
  // Verify data.order_id exists
  if (data.type === 'order_status_update') {
    console.log('Navigating to order:', data.order_id);
  }
});
```

---

## Security Considerations

### 1. Device Token Validation
- Validate token length (< 2048 chars)
- Sanitize before saving to database
- Remove old/invalid tokens periodically

### 2. Rate Limiting
```php
// Add to routes
Route::middleware(['throttle:60,1'])->group(function () {
    Route::post('/device-token', [DeviceTokenController::class, 'store']);
});
```

### 3. Authentication
- Only authenticated users can save tokens
- Verify user owns the token being saved

---

## Performance Optimization

### Queue Configuration
```env
QUEUE_CONNECTION=database
```

Run queue worker:
```bash
php artisan queue:work --daemon
```

### Batch Notifications
For announcements to multiple users:
```php
$tokens = User::where('rt', '001')->pluck('device_tokens')->flatten();
$firebase->sendToDevices($tokens, 'Pengumuman', 'Rapat RT malam ini');
```

---

## Cost Estimation

**Firebase Free Tier:**
- Unlimited messages to iOS and Android
- No monthly charges for standard FCM

**Potential Costs:**
- If using Firebase Cloud Functions for advanced logic
- If storing large amounts of analytics data

**Estimated Monthly Cost:** $0 for typical usage

---

## Next Steps

1. ✅ Install Firebase SDK
2. ✅ Get credentials from Firebase Console
3. ✅ Run migrations for device_tokens column
4. ✅ Setup mobile push notification handlers
5. ✅ Test with real order status updates
6. ✅ Monitor Firebase dashboard for delivery stats

---

**Status:** 🎉 Ready for Integration Testing!

All backend code is complete. Just need to:
1. Install Firebase package
2. Add credentials
3. Run migrations
4. Test end-to-end flow
