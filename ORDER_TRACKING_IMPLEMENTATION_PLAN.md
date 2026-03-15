# Order Tracking System - Implementation Plan

## Overview
Sistem tracking order lengkap untuk mobile warga dan web-admin dengan real-time status updates dan notifikasi push.

---

## Database Schema

### 1. Orders Table ✅
**File:** `api/database/migrations/2026_03_14_000001_create_orders_table.php`

**Fields:**
- `id` - Primary key
- `user_id` - Foreign key to users
- `order_number` - Unique order ID (ORD-YYYYMMDD-XXXXXX)
- `status` - Enum (PENDING_PAYMENT → WAITING_CONFIRMATION → PAID → PROCESSING → SHIPPED → DELIVERED → COMPLETED/CANCELLED)
- Pricing fields (subtotal, shipping_fee, service_fee, app_fee, discount, total)
- `notes` - Text (catatan untuk seller)
- `courier_info` - JSON {name, phone, type}
- Timestamps (paid_at, shipped_at, delivered_at, completed_at, cancelled_at)
- Payment info (payment_method, payment_instruction_id)

### 2. Order Items Table ✅
**File:** `api/database/migrations/2026_03_14_000002_create_order_items_table.php`

**Fields:**
- `order_id` - Foreign key
- `product_id` - Foreign key
- `product_name` - Snapshot nama produk
- `quantity`, `price`, `subtotal`
- `product_snapshot` - JSON (full product data)
- `variant_options` - JSON (selected variants)
- `notes` - Catatan per item

### 3. Models ✅
**Files:**
- `api/app/Models/Order.php` ✅
- `api/app/Models/OrderItem.php` ✅

**Features:**
- Status constants dan labels
- Status timeline method
- Relationship methods
- Order number generation
- Status update dengan timestamp

---

## Backend Implementation

### Phase 1: Order Controller & API Endpoints ⏳

#### OrderController.php
**Location:** `api/app/Http/Controllers/Api/OrderController.php`

**Methods needed:**
```php
class OrderController extends Controller
{
    public function index(Request $request) 
    // GET /api/orders
    // List orders with filters (status, date range)
    
    public function show(Order $order)
    // GET /api/orders/{id}
    // Order detail dengan items + timeline
    
    public function store(Request $request)
    // POST /api/orders
    // Create order from cart
    
    public function updateStatus(Request $request, Order $order)
    // PATCH /api/orders/{id}/status
    // Update status (admin only)
    
    public function cancel(Order $order)
    // POST /api/orders/{id}/cancel
    // Cancel order (warga role)
    
    public function confirmReceived(Order $order)
    // POST /api/orders/{id}/confirm-received
    // Mark as delivered (warga role)
}
```

#### API Routes
**File:** `api/routes/api.php`

```php
// Protected routes (auth:sanctum)
Route::middleware(['auth:sanctum', 'tenant.status', 'tenant.feature'])->group(function () {
    // Order Routes
    Route::prefix('orders')->group(function () {
        Route::get('/', [OrderController::class, 'index']); // List orders
        Route::post('/', [OrderController::class, 'store']); // Create order
        Route::get('/{order}', [OrderController::class, 'show']); // Detail
        Route::post('/{order}/cancel', [OrderController::class, 'cancel']); // Cancel
        Route::post('/{order}/confirm-received', [OrderController::class, 'confirmReceived']);
        
        // Admin-only routes
        Route::patch('/{order}/status', [OrderController::class, 'updateStatus'])
            ->middleware('permission:order.manage');
    });
});
```

---

### Phase 2: Checkout Integration ⏳

**File:** `api/app/Http/Controllers/PaymentController.php` or new `OrderCreationService.php`

**Flow:**
1. User checkout dari cart
2. Create Order + OrderItems
3. Generate payment instruction (Flip/DANA)
4. Return order data + payment instruction
5. Clear cart setelah payment sukses

**Code structure:**
```php
public function createOrderFromCart(Request $request)
{
    DB::beginTransaction();
    
    try {
        // 1. Validate cart items
        $cartItems = $request->input('items');
        
        // 2. Create Order
        $order = Order::create([
            'user_id' => auth()->id(),
            'order_number' => Order::generateOrderNumber(),
            'status' => Order::STATUS_PENDING_PAYMENT,
            'subtotal' => ...,
            'shipping_fee' => ...,
            'total' => ...,
            'notes' => json_encode($request->input('notes')), // Per seller notes
        ]);
        
        // 3. Create OrderItems
        foreach ($cartItems as $item) {
            OrderItem::create([
                'order_id' => $order->id,
                'product_id' => $item['product_id'],
                'product_name' => $item['name'],
                'quantity' => $item['quantity'],
                'price' => $item['price'],
                'product_snapshot' => json_encode($item),
                'variant_options' => json_encode($item['variants'] ?? []),
            ]);
        }
        
        // 4. Generate payment instruction
        $paymentInstruction = $this->generatePaymentInstruction($order);
        
        DB::commit();
        
        return response()->json([
            'order' => $order->load('items'),
            'payment_instruction' => $paymentInstruction,
        ]);
        
    } catch (\Exception $e) {
        DB::rollBack();
        throw $e;
    }
}
```

---

### Phase 3: Admin Action Endpoints ⏳

**File:** `api/app/Http/Controllers/Api/AdminOrderController.php`

```php
class AdminOrderController extends Controller
{
    public function confirmPayment(Order $order)
    // POST /api/admin/orders/{id}/confirm-payment
    // Status: WAITING_CONFIRMATION → PROCESSING
    
    public function shipOrder(Order $order, Request $request)
    // POST /api/admin/orders/{id}/ship
    // Status: PROCESSING → SHIPPED
    // Input: courier_info {name, phone, type}
    
    public function completeOrder(Order $order)
    // POST /api/admin/orders/{id}/complete
    // Status: SHIPPED → COMPLETED
}
```

---

### Phase 4: Notifications ⏳

**File:** `api/app/Notifications/OrderStatusUpdated.php`

```php
class OrderStatusUpdated extends Notification implements ShouldQueue
{
    use Queueable;
    
    protected $order;
    protected $oldStatus;
    protected $newStatus;
    
    public function __construct(Order $order, string $oldStatus, string $newStatus)
    {
        $this->order = $order;
        $this->oldStatus = $oldStatus;
        $this->newStatus = $newStatus;
    }
    
    public function via($notifiable): array
    {
        return ['database', 'firebase']; // Database + Push notification
    }
    
    public function toArray($notifiable): array
    {
        return [
            'order_id' => $this->order->id,
            'order_number' => $this->order->order_number,
            'old_status' => $this->oldStatus,
            'new_status' => $this->newStatus,
            'message' => "Pesanan {$this->order->order_number} status berubah menjadi " . 
                        Order::getStatusLabels()[$this->newStatus],
        ];
    }
    
    public function toFirebase($notifiable): array
    {
        return [
            'title' => 'Status Pesanan Berubah',
            'body' => "Pesanan {$this->order->order_number} telah {$this->newStatus}",
            'data' => [
                'order_id' => $this->order->id,
                'type' => 'ORDER_STATUS_UPDATE',
            ],
        ];
    }
}
```

**Trigger in Order model:**
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

## Mobile App Implementation

### Phase 1: Order List Screen ⏳

**File:** `mobile-warga/src/screens/OrdersScreen.tsx` (NEW)

**Features:**
- Tab navigation: "Semua" | "Aktif" | "Riwayat"
- Order card dengan status badge
- Pull to refresh
- Infinite scroll / pagination

**UI Components:**
```tsx
interface OrderCardProps {
  order: Order;
  onPress: () => void;
}

const OrderCard = ({ order, onPress }: OrderCardProps) => {
  const statusColor = getStatusColor(order.status);
  
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <Text style={styles.orderNumber}>{order.order_number}</Text>
        <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
          <Text style={styles.statusText}>{order.status_label}</Text>
        </View>
      </View>
      
      <View style={styles.items}>
        {/* Show first 2 items + "... and X more" */}
      </View>
      
      <View style={styles.footer}>
        <Text style={styles.total}>Total: {formatRupiah(order.total)}</Text>
        <Text style={styles.date}>{formatDate(order.created_at)}</Text>
      </View>
    </TouchableOpacity>
  );
};
```

---

### Phase 2: Order Detail Screen ⏳

**File:** `mobile-warga/src/screens/OrderDetailScreen.tsx` (NEW)

**Features:**
- Order info (number, date, status)
- **Timeline visual** dengan progress indicator
- Item list dengan variant details
- Courier info (jika sudah dikirim)
- Action buttons (Cancel, Confirm Received)

**Timeline Component:**
```tsx
const StatusTimeline = ({ timeline }: { timeline: TimelineItem[] }) => {
  return (
    <View style={styles.timeline}>
      {timeline.map((item, index) => (
        <View key={item.status} style={styles.timelineItem}>
          <View style={[
            styles.dot,
            item.is_completed && styles.dotCompleted,
            item.is_current && styles.dotCurrent,
          ]}>
            {item.is_completed && (
              <Ionicons name="checkmark" size={16} color="#fff" />
            )}
          </View>
          
          <View style={styles.timelineContent}>
            <Text style={[
              styles.timelineLabel,
              item.is_current && styles.timelineLabelCurrent,
            ]}>
              {item.label}
            </Text>
            
            {item.timestamp && (
              <Text style={styles.timelineTime}>
                {formatDateTime(item.timestamp)}
              </Text>
            )}
          </View>
          
          {index < timeline.length - 1 && (
            <View style={[
              styles.line,
              item.is_completed && styles.lineCompleted,
            ]} />
          )}
        </View>
      ))}
    </View>
  );
};
```

---

### Phase 3: Integration dengan Checkout ⏳

**File:** `mobile-warga/src/screens/CheckoutScreen.tsx` (MODIFY)

**Changes:**
- After successful payment → redirect to Order Detail
- Clear cart after order creation
- Pass order data instead of just "success" message

---

### Phase 4: Notification Handler ⏳

**File:** `mobile-warga/src/services/NotificationService.ts` (NEW/MODIFY)

```typescript
import messaging from '@react-native-firebase/messaging';

export const setupOrderNotifications = () => {
  // Foreground handler
  const unsubscribeForeground = messaging().onMessage(async remoteMessage => {
    if (remoteMessage.data?.type === 'ORDER_STATUS_UPDATE') {
      // Show in-app alert
      Alert.alert(
        'Status Pesanan Berubah',
        remoteMessage.notification?.body,
        [{
          text: 'Lihat',
          onPress: () => navigateToOrder(remoteMessage.data.order_id),
        }]
      );
    }
  });
  
  // Background handler (in App.tsx)
  messaging().setBackgroundMessageHandler(async remoteMessage => {
    // Handle background notification
  });
  
  return unsubscribeForeground;
};
```

---

## Web-Admin Implementation

### Phase 1: Order Management Page ⏳

**File:** `web-admin/app/dashboard/orders/page.tsx` (NEW)

**Features:**
- Order list dengan filter (status, date range, search)
- Bulk actions (optional)
- Export to CSV

**Columns:**
- Order Number
- Customer Name
- Status (badge)
- Total Amount
- Date
- Actions (View, Update Status)

---

### Phase 2: Order Detail Page ⏳

**File:** `web-admin/app/dashboard/orders/[id]/page.tsx` (NEW)

**Features:**
- Full order details
- Timeline view (read-only)
- **Action Buttons:**
  - "Konfirmasi Pembayaran" (WAITING_CONFIRMATION → PROCESSING)
  - "Kirim Pesanan" (PROCESSING → SHIPPED) - input courier info
  - "Selesai" (SHIPPED → COMPLETED)
- Courier info form modal

**Action Buttons:**
```tsx
const OrderActions = ({ order }: { order: Order }) => {
  const handleConfirmPayment = async () => {
    await api.post(`/orders/${order.id}/confirm-payment`);
    // Refresh order data
  };
  
  const handleShipOrder = async (courierInfo: CourierData) => {
    await api.post(`/orders/${order.id}/ship`, { courier_info: courierInfo });
  };
  
  const handleComplete = async () => {
    await api.post(`/orders/${order.id}/complete`);
  };
  
  if (order.status === 'WAITING_CONFIRMATION') {
    return (
      <Button onClick={handleConfirmPayment}>
        Konfirmasi Pembayaran
      </Button>
    );
  }
  
  if (order.status === 'PROCESSING') {
    return (
      <>
        <Button onClick={() => setShowCourierModal(true)}>
          Kirim Pesanan
        </Button>
        <CourierModal 
          visible={showCourierModal}
          onConfirm={handleShipOrder}
        />
      </>
    );
  }
  
  if (order.status === 'SHIPPED') {
    return (
      <Button onClick={handleComplete}>
        Selesaikan Pesanan
      </Button>
    );
  }
  
  return null;
};
```

---

## Testing Checklist

### Backend
- [ ] Run migrations
- [ ] Test order creation endpoint
- [ ] Test status update endpoints
- [ ] Test permission guards (admin vs warga)
- [ ] Test notification sending
- [ ] Test order number generation uniqueness

### Mobile - Warga
- [ ] View order list (all statuses)
- [ ] Filter by status tab
- [ ] View order detail with timeline
- [ ] Receive push notification on status change
- [ ] Cancel order (if allowed)
- [ ] Confirm received order
- [ ] Create order from checkout flow

### Web-Admin
- [ ] View all orders
- [ ] Filter/search orders
- [ ] View order detail
- [ ] Confirm payment action
- [ ] Ship order with courier info
- [ ] Complete order action
- [ ] Verify notifications sent

---

## Migration Execution

```bash
# In api directory
php artisan migrate

# Verify tables created
php artisan db:show --table=orders
php artisan db:show --table=order_items
```

---

## Rollback Plan

If issues occur:
```bash
php artisan migrate:rollback --step=1
```

Or reset:
```bash
php artisan migrate:fresh --seed
```

---

## Performance Considerations

1. **Pagination**: Orders list paginated (20 per page)
2. **Indexing**: Indexed user_id, status, order_number
3. **Eager Loading**: Always load `order.items` to avoid N+1
4. **Queue Notifications**: All notifications queued (ShouldQueue)
5. **Caching**: Cache order statistics for admin dashboard

---

## Security

1. **Authorization**:
   - Warga can only view/update their own orders
   - Admin can update any order status
   - Permission checks on admin actions

2. **Validation**:
   - Validate status transitions (prevent skipping)
   - Validate courier info format
   - Sanitize notes input

3. **Audit Trail**:
   - Log all status changes
   - Track who made the change
   - Store old/new status

---

## Future Enhancements

1. **Resend Notification**: Button to resend notification if not received
2. **Bulk Status Update**: Admin can update multiple orders at once
3. **Order Comments**: Chat between customer and admin about specific order
4. **Refund Flow**: Handle cancelled/refunded orders
5. **Rating/Review**: After order completed, allow rating
6. **Invoice Generation**: Auto-generate PDF invoice
7. **Delivery Tracking**: Integration with courier API for real-time tracking

---

## Estimated Timeline

| Phase | Task | Est. Time |
|-------|------|-----------|
| 1 | Backend: Controller + API | 4 hours |
| 2 | Checkout integration | 2 hours |
| 3 | Admin actions | 2 hours |
| 4 | Notifications | 2 hours |
| 5 | Mobile: Order List | 3 hours |
| 6 | Mobile: Order Detail | 3 hours |
| 7 | Mobile: Notification handler | 2 hours |
| 8 | Web-Admin: Order pages | 4 hours |
| 9 | Testing + bug fixes | 3 hours |
| **Total** | | **25 hours** |

---

## Next Steps

1. ✅ Create database migrations
2. ✅ Create models
3. ⏳ Run migrations
4. ⏳ Create OrderController
5. ⏳ Add API routes
6. ⏳ Implement checkout integration
7. ⏳ Create mobile screens
8. ⏳ Create admin interface
9. ⏳ Setup notifications
10. ⏳ Test end-to-end flow

---

**Status**: Ready for implementation. Database schema and models are complete. Starting backend API development now.
