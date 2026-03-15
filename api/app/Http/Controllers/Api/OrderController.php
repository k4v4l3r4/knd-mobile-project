<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;

class OrderController extends Controller
{
    /**
     * Display a listing of user's orders
     */
    public function index(Request $request): JsonResponse
    {
        $user = Auth::user();
        
        $query = Order::where('user_id', $user->id)
            ->with('items');
        
        // Filter by status if provided
        if ($request->has('status')) {
            $query->where('status', $request->input('status'));
        }
        
        // Filter by date range
        if ($request->has('from_date')) {
            $query->whereDate('created_at', '>=', $request->input('from_date'));
        }
        
        if ($request->has('to_date')) {
            $query->whereDate('created_at', '<=', $request->input('to_date'));
        }
        
        // Sort
        $sortBy = $request->input('sort_by', 'created_at');
        $sortOrder = $request->input('sort_order', 'desc');
        $query->orderBy($sortBy, $sortOrder);
        
        // Paginate
        $perPage = $request->input('per_page', 20);
        $orders = $query->paginate($perPage);
        
        // Add formatted data
        $orders->getCollection()->transform(function ($order) {
            return [
                'id' => $order->id,
                'order_number' => $order->order_number,
                'status' => $order->status,
                'status_label' => Order::getStatusLabels()[$order->status] ?? $order->status,
                'total' => $order->total,
                'item_count' => $order->items->count(),
                'created_at' => $order->created_at->toIso8601String(),
                'items' => $order->items->map(function ($item) {
                    return [
                        'product_name' => $item->product_name,
                        'quantity' => $item->quantity,
                        'price' => $item->price,
                        'subtotal' => $item->subtotal,
                        'image_url' => $item->product_snapshot['image_url'] ?? null,
                    ];
                }),
            ];
        });
        
        return response()->json($orders);
    }

    /**
     * Store a newly created order
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.variant_options' => 'nullable|array',
            'notes' => 'nullable|array', // Notes per seller
            'shipping_fee' => 'required|numeric|min:0',
            'service_fee' => 'required|numeric|min:0',
            'app_fee' => 'required|numeric|min:0',
            'discount' => 'nullable|numeric|min:0',
            'payment_method' => 'required|in:briva,bcava,gopay',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        DB::beginTransaction();
        
        try {
            $user = Auth::user();
            $items = $request->input('items');
            
            // Calculate totals
            $subtotal = 0;
            foreach ($items as $item) {
                $product = Product::findOrFail($item['product_id']);
                $subtotal += $product->price * $item['quantity'];
            }
            
            $shippingFee = $request->input('shipping_fee');
            $serviceFee = $request->input('service_fee');
            $appFee = $request->input('app_fee');
            $discount = $request->input('discount', 0);
            $total = $subtotal + $shippingFee + $serviceFee + $appFee - $discount;
            
            // Create Order
            $order = Order::create([
                'user_id' => $user->id,
                'order_number' => Order::generateOrderNumber(),
                'status' => Order::STATUS_PENDING_PAYMENT,
                'subtotal' => $subtotal,
                'shipping_fee' => $shippingFee,
                'service_fee' => $serviceFee,
                'app_fee' => $appFee,
                'discount' => $discount,
                'total' => $total,
                'notes' => json_encode($request->input('notes', [])),
                'payment_method' => $request->input('payment_method'),
            ]);
            
            // Create OrderItems
            foreach ($items as $itemData) {
                $product = Product::findOrFail($itemData['product_id']);
                
                OrderItem::create([
                    'order_id' => $order->id,
                    'product_id' => $product->id,
                    'product_name' => $product->name,
                    'quantity' => $itemData['quantity'],
                    'price' => $product->price,
                    'subtotal' => $product->price * $itemData['quantity'],
                    'product_snapshot' => json_encode([
                        'id' => $product->id,
                        'name' => $product->name,
                        'price' => $product->price,
                        'image_url' => $product->image_url,
                        'description' => $product->description,
                    ]),
                    'variant_options' => json_encode($itemData['variant_options'] ?? []),
                    'notes' => $itemData['notes'] ?? null,
                ]);
            }
            
            // Generate payment instruction (integrate with PaymentController)
            // For now, return order with pending payment status
            // Frontend will call payment endpoint separately
            
            DB::commit();
            
            // Load items for response
            $order->load('items');
            
            return response()->json([
                'message' => 'Order created successfully',
                'order' => [
                    'id' => $order->id,
                    'order_number' => $order->order_number,
                    'status' => $order->status,
                    'status_label' => Order::getStatusLabels()[$order->status],
                    'total' => $order->total,
                    'payment_method' => $order->payment_method,
                    'items' => $order->items->map(function ($item) {
                        return [
                            'product_name' => $item->product_name,
                            'quantity' => $item->quantity,
                            'price' => $item->price,
                            'subtotal' => $item->subtotal,
                            'image_url' => $item->product_snapshot['image_url'] ?? null,
                        ];
                    }),
                ],
            ], 201);
            
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Failed to create order',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Display the specified order
     */
    public function show(Order $order): JsonResponse
    {
        // Check authorization
        if ($order->user_id !== Auth::id()) {
            return response()->json([
                'message' => 'Unauthorized access to this order',
            ], 403);
        }
        
        $order->load('items');
        
        $timeline = $order->getStatusTimeline();
        
        return response()->json([
            'order' => [
                'id' => $order->id,
                'order_number' => $order->order_number,
                'status' => $order->status,
                'status_label' => Order::getStatusLabels()[$order->status] ?? $order->status,
                'subtotal' => $order->subtotal,
                'shipping_fee' => $order->shipping_fee,
                'service_fee' => $order->service_fee,
                'app_fee' => $order->app_fee,
                'discount' => $order->discount,
                'total' => $order->total,
                'notes' => json_decode($order->notes, true),
                'courier_info' => $order->courier_info,
                'payment_method' => $order->payment_method,
                'paid_at' => $order->paid_at?->toIso8601String(),
                'shipped_at' => $order->shipped_at?->toIso8601String(),
                'delivered_at' => $order->delivered_at?->toIso8601String(),
                'completed_at' => $order->completed_at?->toIso8601String(),
                'created_at' => $order->created_at->toIso8601String(),
                'items' => $order->items->map(function ($item) {
                    return [
                        'product_name' => $item->product_name,
                        'quantity' => $item->quantity,
                        'price' => $item->price,
                        'subtotal' => $item->subtotal,
                        'notes' => $item->notes,
                        'variants' => $item->variant_options,
                        'image_url' => $item->product_snapshot['image_url'] ?? null,
                    ];
                }),
                'timeline' => $timeline,
            ],
        ]);
    }

    /**
     * Cancel an order (only allowed for certain statuses)
     */
    public function cancel(Order $order): JsonResponse
    {
        // Check authorization
        if ($order->user_id !== Auth::id()) {
            return response()->json([
                'message' => 'Unauthorized',
            ], 403);
        }
        
        if (!$order->canBeCancelled()) {
            return response()->json([
                'message' => 'Order cannot be cancelled in current status',
                'current_status' => $order->status,
            ], 400);
        }
        
        DB::beginTransaction();
        
        try {
            $oldStatus = $order->status;
            $order->updateStatus(Order::STATUS_CANCELLED);
            
            // TODO: Send notification
            
            DB::commit();
            
            return response()->json([
                'message' => 'Order cancelled successfully',
                'order_number' => $order->order_number,
                'status' => $order->status,
            ]);
            
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Failed to cancel order',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Confirm order received by customer
     */
    public function confirmReceived(Order $order): JsonResponse
    {
        // Check authorization
        if ($order->user_id !== Auth::id()) {
            return response()->json([
                'message' => 'Unauthorized',
            ], 403);
        }
        
        if ($order->status !== Order::STATUS_SHIPPED) {
            return response()->json([
                'message' => 'Can only confirm received for shipped orders',
                'current_status' => $order->status,
            ], 400);
        }
        
        DB::beginTransaction();
        
        try {
            $oldStatus = $order->status;
            $order->updateStatus(Order::STATUS_DELIVERED);
            
            // Auto-complete after delivered (or keep as delivered, depending on business logic)
            // For now, we'll mark as delivered and let admin mark as completed
            
            // TODO: Send notification
            
            DB::commit();
            
            return response()->json([
                'message' => 'Order received confirmed',
                'order_number' => $order->order_number,
                'status' => $order->status,
            ]);
            
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Failed to confirm receipt',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
