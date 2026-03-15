# Order Tracking System - Progress Report

## Date Created
2026-03-14

## Status
🟡 **IN PROGRESS** - Backend foundation complete, Mobile & Admin pending

---

## ✅ Completed Tasks

### 1. Database Schema ✅

#### Migrations Created & Executed
- **File:** `api/database/migrations/2026_03_14_000001_create_orders_table.php` ✅
  - Orders table with all status fields
  - Timestamps for each status change
  - Courier info JSON field
  - Payment tracking fields
  
- **File:** `api/database/migrations/2026_03_14_000002_create_order_items_table.php` ✅
  - Order items with product snapshots
  - Variant options support
  - Per-item notes

**Status:** Migrations executed successfully ✅

---

### 2. Models ✅

#### Order Model
**File:** `api/app/Models/Order.php` ✅

**Features:**
- ✅ Status constants (PENDING_PAYMENT, WAITING_CONFIRMATION, etc.)
- ✅ Status labels (Indonesian translations)
- ✅ `getStatusTimeline()` method for visual timeline
- ✅ `updateStatus()` method with automatic timestamps
- ✅ `generateOrderNumber()` static method
- ✅ `canBeCancelled()` helper
- ✅ Relationships: `user()`, `items()`
- ✅ Scopes: `byStatus()`, `active()`

#### OrderItem Model
**File:** `api/app/Models/OrderItem.php` ✅

**Features:**
- ✅ Product snapshot storage
- ✅ Variant options handling
- ✅ `getFormattedVariants()` helper
- ✅ Relationships: `order()`, `product()`

---

### 3. Backend Controller ✅

#### OrderController
**File:** `api/app/Http/Controllers/Api/OrderController.php` ✅

**Methods Implemented:**
- ✅ `index()` - List user's orders with filters
  - Filter by status
  - Filter by date range
  - Pagination (default 20 per page)
  - Includes order items
  
- ✅ `store()` - Create new order from cart
  - Validates items, quantities, fees
  - Creates Order + OrderItems transactionally
  - Generates unique order number
  - Returns order with payment info
  
- ✅ `show()` - Get order detail
  - Authorization check (owner only)
  - Includes timeline data
  - Full item details with variants
  
- ✅ `cancel()` - Cancel order
  - Checks if cancellable
  - Updates status with timestamp
  - Authorization check
  
- ✅ `confirmReceived()` - Confirm delivery
  - Only for SHIPPED status
  - Updates to DELIVERED
  - Authorization check

---

### 4. API Routes ✅

**File:** `api/routes/api.php` ✅

**Routes Added:**
```php
// Protected routes (auth:sanctum middleware)
Route::prefix('orders')->group(function () {
    Route::get('/', [OrderController::class, 'index']); 
    // GET /api/orders?status=SHIPPED&from_date=2026-01-01
    
    Route::post('/', [OrderController::class, 'store']); 
    // POST /api/orders (body: items[], shipping_fee, service_fee, etc)
    
    Route::get('/{order}', [OrderController::class, 'show']); 
    // GET /api/orders/123
    
    Route::post('/{order}/cancel', [OrderController::class, 'cancel']); 
    // POST /api/orders/123/cancel
    
    Route::post('/{order}/confirm-received', [OrderController::class, 'confirmReceived']); 
    // POST /api/orders/123/conf irm-received
});
```

---

## 🟡 In Progress / Pending Tasks

### Phase 2: Mobile App Implementation 🔴 PENDING

#### 1. Order List Screen (mobile-warga)
**File Needed:** `mobile-warga/src/screens/OrdersScreen.tsx`

**Requirements:**
- Tab navigation: "Semua" | "Aktif" | "Riwayat"
- Order card component
- Pull to refresh
- Infinite scroll/pagination
- Navigate to detail on tap

**API Integration:**
```typescript
const fetchOrders = async (filters?: Filters) => {
  const response = await api.get('/orders', { params: filters });
  return response.data; // Paginated order list
};
```

---

#### 2. Order Detail Screen (mobile-warga)
**File Needed:** `mobile-warga/src/screens/OrderDetailScreen.tsx`

**Requirements:**
- Order header (number, date, status badge)
- **Visual Timeline Component**
- Item list with images
- Courier info section
- Action buttons (Cancel, Confirm Received)

**Timeline UI Mockup:**
```tsx
<Timeline>
  <TimelineItem 
    status="PENDING_PAYMENT"
    label="Menunggu Pembayaran"
    timestamp="2026-03-14T10:00:00Z"
    isCompleted={true}
    isCurrent={false}
  />
  <TimelineItem 
    status="WAITING_CONFIRMATION"
    label="Menunggu Konfirmasi"
    timestamp="2026-03-14T10:05:00Z"
    isCompleted={true}
    isCurrent={true}
  />
  {/* ... other statuses */}
</Timeline>
```

---

#### 3. Checkout Integration
**File to Modify:** `mobile-warga/src/screens/CheckoutScreen.tsx`

**Changes Needed:**
- Replace current success redirect with Order Detail navigation
- Pass order data instead of generic success
- Clear cart after successful order creation

**Flow:**
```typescript
const handlePaymentSuccess = async (paymentData: PaymentResponse) => {
  // 1. Create order
  const orderResponse = await api.post('/orders', checkoutData);
  
  // 2. Clear cart
  dispatch(clearCart());
  
  // 3. Navigate to order detail
  navigation.navigate('ORDER_DETAIL', { orderId: orderResponse.data.order.id });
};
```

---

### Phase 3: Admin Interface 🔴 PENDING

#### 1. Admin Order Controller
**File Needed:** `api/app/Http/Controllers/Api/AdminOrderController.php`

**Methods Required:**
```php
class AdminOrderController extends Controller
{
    public function confirmPayment(Order $order)
    // Status: WAITING_CONFIRMATION → PROCESSING
    
    public function shipOrder(Order $order, Request $request)
    // Status: PROCESSING → SHIPPED
    // Input: courier_info {name, phone, type}
    
    public function completeOrder(Order $order)
    // Status: SHIPPED → COMPLETED
}
```

---

#### 2. Web-Admin Order Pages
**Files Needed:**
- `web-admin/app/dashboard/orders/page.tsx` (List)
- `web-admin/app/dashboard/orders/[id]/page.tsx` (Detail)

**Features:**
- Order list dengan filter
- Order detail dengan action buttons
- Courier info modal/form
- Status update confirmation

---

### Phase 4: Notifications 🔴 PENDING

#### 1. Notification Class
**File Needed:** `api/app/Notifications/OrderStatusUpdated.php`

**Implementation:**
```php
class OrderStatusUpdated extends Notification implements ShouldQueue
{
    public function via($notifiable): array
    {
        return ['database', 'firebase'];
    }
    
    public function toArray($notifiable): array
    {
        return [
            'order_id' => $this->order->id,
            'order_number' => $this->order->order_number,
            'old_status' => $this->oldStatus,
            'new_status' => $this->newStatus,
        ];
    }
    
    public function toFirebase($notifiable): array
    {
        return [
            'title' => 'Status Pesanan Berubah',
            'body' => "Pesanan {$this->order->order_number} status: {$this->newStatus}",
            'data' => [
                'type' => 'ORDER_STATUS_UPDATE',
                'order_id' => $this->order->id,
            ],
        ];
    }
}
```

---

#### 2. Trigger in Order Model
**File to Modify:** `api/app/Models/Order.php`

**Add to `updateStatus()` method:**
```php
public function updateStatus(string $newStatus): void
{
    $oldStatus = $this->status;
    
    // ... existing update logic ...
    
    // Send notification
    $this->user->notify(new OrderStatusUpdated($this, $oldStatus, $newStatus));
}
```

---

#### 3. Mobile Notification Handler
**File Needed:** `mobile-warga/src/services/NotificationService.ts`

**Setup:**
```typescript
import messaging from '@react-native-firebase/messaging';

export const setupOrderNotifications = () => {
  // Foreground handler
  const unsubscribe = messaging().onMessage(async remoteMessage => {
    if (remoteMessage.data?.type === 'ORDER_STATUS_UPDATE') {
      Alert.alert(
        'Status Pesanan Berubah',
        remoteMessage.notification?.body,
        [{
          text: 'Lihat',
          onPress: () => {
            navigation.navigate('ORDER_DETAIL', {
              orderId: remoteMessage.data.order_id,
            });
          },
        }]
      );
    }
  });
  
  return unsubscribe;
};
```

---

## Testing Guide

### Backend API Testing

#### 1. Create Order
```bash
curl -X POST http://localhost/api/orders \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "product_id": 1,
        "quantity": 2,
        "variant_options": {}
      }
    ],
    "shipping_fee": 15000,
    "service_fee": 1000,
    "app_fee": 1000,
    "discount": 0,
    "payment_method": "briva"
  }'
```

**Expected Response:**
```json
{
  "message": "Order created successfully",
  "order": {
    "id": 1,
    "order_number": "ORD-20260314-ABC123",
    "status": "PENDING_PAYMENT",
    "total": 17000,
    "items": [...]
  }
}
```

---

#### 2. Get Order List
```bash
curl -X GET "http://localhost/api/orders?status=PENDING_PAYMENT" \
  -H "Authorization: Bearer {token}"
```

---

#### 3. Get Order Detail
```bash
curl -X GET http://localhost/api/orders/1 \
  -H "Authorization: Bearer {token}"
```

**Expected:**
```json
{
  "order": {
    "order_number": "ORD-20260314-ABC123",
    "status": "PENDING_PAYMENT",
    "status_label": "Menunggu Pembayaran",
    "timeline": [
      {
        "status": "PENDING_PAYMENT",
        "label": "Menunggu Pembayaran",
        "timestamp": "2026-03-14T10:00:00Z",
        "is_completed": true,
        "is_current": true
      }
      // ... other statuses
    ]
  }
}
```

---

#### 4. Cancel Order
```bash
curl -X POST http://localhost/api/orders/1/cancel \
  -H "Authorization: Bearer {token}"
```

---

## Next Steps (Priority Order)

### Immediate (Today)
1. ⏳ Create mobile Order List Screen
2. ⏳ Create mobile Order Detail Screen
3. ⏳ Integrate with checkout flow

### Short-term (This Week)
4. ⏳ Create admin order controller
5. ⏳ Add admin action endpoints
6. ⏳ Create web-admin order pages
7. ⏳ Implement notification system

### Medium-term (Next Week)
8. ⏳ Setup Firebase push notifications
9. ⏳ Test end-to-end flow
10. ⏳ Deploy and monitor

---

## File Structure Summary

### Backend (✅ Complete)
```
api/
├── database/migrations/
│   ├── 2026_03_14_000001_create_orders_table.php ✅
│   └── 2026_03_14_000002_create_order_items_table.php ✅
├── app/Models/
│   ├── Order.php ✅
│   └── OrderItem.php ✅
├── app/Http/Controllers/Api/
│   └── OrderController.php ✅
└── routes/api.php ✅ (routes added)
```

### Mobile (🔴 Pending)
```
mobile-warga/
├── src/screens/
│   ├── OrdersScreen.tsx 🔴
│   └── OrderDetailScreen.tsx 🔴
├── src/components/
│   └── OrderCard.tsx 🔴
│   └── StatusTimeline.tsx 🔴
└── src/services/
    └── NotificationService.ts 🔴
```

### Web-Admin (🔴 Pending)
```
web-admin/
├── app/dashboard/orders/
│   ├── page.tsx 🔴
│   └── [id]/page.tsx 🔴
└── services/
    └── orderService.ts 🔴
```

---

## Estimated Completion

| Component | Progress | ETA |
|-----------|----------|-----|
| Backend API | 100% ✅ | Done |
| Mobile Screens | 0% 🔴 | 6-8 hours |
| Admin Interface | 0% 🔴 | 4-6 hours |
| Notifications | 0% 🔴 | 2-3 hours |
| Testing | 0% 🔴 | 3-4 hours |
| **Total** | **20%** | **15-21 hours** |

---

## Risk Assessment

### Low Risk ✅
- Database schema is solid
- Models have all required methods
- API endpoints follow Laravel conventions

### Medium Risk 🟡
- Mobile app needs to handle payment flow integration
- Timeline UI might need iteration for best UX
- Notification timing (immediate vs delayed)

### High Risk 🔴
- Firebase notification setup requires proper certificates
- Real-time updates might need WebSocket/Pusher for instant sync
- Courier info validation (phone numbers, etc.)

---

## Dependencies

### Required Packages

#### Mobile
```json
{
  "@react-native-firebase/messaging": "^18.x",
  "@react-native-firebase/app": "^18.x"
}
```

#### Backend
Already included in Laravel:
- Notifications (built-in)
- Queue (for async notifications)
- Firebase PHP SDK (if using server-side FCM)

---

## Success Criteria

### Functional Requirements
- ✅ User can view order history
- ✅ User can see order detail with timeline
- ✅ User receives notifications on status change
- ✅ Admin can update order status
- ✅ Admin can add courier info
- ✅ System generates unique order numbers
- ⏳ Checkout flow creates orders properly
- ⏳ Notifications are sent reliably

### Non-Functional Requirements
- ⏳ API response time < 500ms
- ⏳ Push notification delivered within 5 seconds
- ⏳ Timeline renders smoothly (60fps)
- ⏳ No N+1 queries in order list

---

**Last Updated:** 2026-03-14
**Next Review:** After mobile screens completion
