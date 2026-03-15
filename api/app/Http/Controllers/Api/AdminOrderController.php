<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use App\Notifications\OrderStatusUpdated;

class AdminOrderController extends Controller
{
    /**
     * Display a listing of orders for admin
     */
    public function index(Request $request): JsonResponse
    {
        $query = Order::with(['user', 'items']);
        
        // Filter by status
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
        
        // Search by order number or customer name
        if ($request->has('search')) {
            $search = $request->input('search');
            $query->where(function($q) use ($search) {
                $q->where('order_number', 'LIKE', "%{$search}%")
                  ->orWhereHas('user', function($q) use ($search) {
                      $q->where('name', 'LIKE', "%{$search}%");
                  });
            });
        }
        
        // Sort
        $sortBy = $request->input('sort_by', 'created_at');
        $sortOrder = $request->input('sort_order', 'desc');
        $query->orderBy($sortBy, $sortOrder);
        
        // Paginate
        $perPage = $request->input('per_page', 20);
        $orders = $query->paginate($perPage);
        
        // Format response
        $orders->getCollection()->transform(function ($order) {
            return [
                'id' => $order->id,
                'order_number' => $order->order_number,
                'status' => $order->status,
                'status_label' => Order::getStatusLabels()[$order->status] ?? $order->status,
                'customer_name' => $order->user->name ?? 'N/A',
                'customer_phone' => $order->user->phone ?? 'N/A',
                'total' => $order->total,
                'item_count' => $order->items->count(),
                'created_at' => $order->created_at->toIso8601String(),
                'paid_at' => $order->paid_at?->toIso8601String(),
                'shipped_at' => $order->shipped_at?->toIso8601String(),
            ];
        });
        
        return response()->json($orders);
    }

    /**
     * Display the specified order for admin
     */
    public function show(Order $order): JsonResponse
    {
        $order->load(['user', 'items']);
        
        $timeline = $order->getStatusTimeline();
        
        return response()->json([
            'order' => [
                'id' => $order->id,
                'order_number' => $order->order_number,
                'status' => $order->status,
                'status_label' => Order::getStatusLabels()[$order->status] ?? $order->status,
                'customer' => [
                    'id' => $order->user->id,
                    'name' => $order->user->name,
                    'email' => $order->user->email,
                    'phone' => $order->user->phone,
                    'address' => $order->user->address ?? null,
                ],
                'subtotal' => $order->subtotal,
                'shipping_fee' => $order->shipping_fee,
                'service_fee' => $order->service_fee,
                'app_fee' => $order->app_fee,
                'discount' => $order->discount,
                'total' => $order->total,
                'notes' => json_decode($order->notes, true),
                'courier_info' => $order->courier_info,
                'tracking_number' => $order->tracking_number, // Resi for REGULER
                'tracking_link' => $order->tracking_link, // Link for INSTANT
                'payment_method' => $order->payment_method,
                'payment_instruction_id' => $order->payment_instruction_id,
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
     * Confirm payment for an order
     * Status: WAITING_CONFIRMATION → PROCESSING
     */
    public function confirmPayment(Order $order): JsonResponse
    {
        DB::beginTransaction();
        
        try {
            $oldStatus = $order->status;
            
            if ($oldStatus !== Order::STATUS_WAITING_CONFIRMATION && 
                $oldStatus !== Order::STATUS_PAID) {
                return response()->json([
                    'message' => 'Order tidak dapat dikonfirmasi. Status saat ini: ' . $oldStatus,
                    'current_status' => $oldStatus,
                ], 400);
            }
            
            // Update status
            $order->updateStatus(Order::STATUS_PROCESSING);
            
            // Send notification
            if (class_exists(OrderStatusUpdated::class)) {
                $order->user->notify(new OrderStatusUpdated($order, $oldStatus, Order::STATUS_PROCESSING));
            }
            
            DB::commit();
            
            return response()->json([
                'message' => 'Pembayaran dikonfirmasi. Pesanan sedang diproses.',
                'order_number' => $order->order_number,
                'old_status' => $oldStatus,
                'new_status' => Order::STATUS_PROCESSING,
                'status_label' => Order::getStatusLabels()[Order::STATUS_PROCESSING],
            ]);
            
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Gagal mengkonfirmasi pembayaran',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Ship an order with courier information
     * Status: PROCESSING → SHIPPED
     */
    public function shipOrder(Order $order, Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'courier_info' => 'required|array',
            'courier_info.name' => 'required|string|max:255',
            'courier_info.phone' => 'required|string|max:20',
            'courier_info.type' => 'nullable|string|max:100',
            'tracking_number' => 'nullable|string|max:100', // For REGULER (JNE/SPX)
            'tracking_link' => 'nullable|url|max:500', // For INSTANT (Grab/Gojek/Lalamove)
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Data kurir tidak valid',
                'errors' => $validator->errors(),
            ], 422);
        }

        DB::beginTransaction();
        
        try {
            $oldStatus = $order->status;
            
            if ($oldStatus !== Order::STATUS_PROCESSING) {
                return response()->json([
                    'message' => 'Pesanan belum siap dikirim. Status saat ini: ' . $oldStatus,
                    'current_status' => $oldStatus,
                ], 400);
            }
            
            // Save courier info
            $order->courier_info = $request->input('courier_info');
            
            // Save tracking information based on courier type
            if ($request->has('tracking_number')) {
                $order->tracking_number = $request->input('tracking_number');
            }
            
            if ($request->has('tracking_link')) {
                $order->tracking_link = $request->input('tracking_link');
            }
            
            // Update status to SHIPPED
            $order->updateStatus(Order::STATUS_SHIPPED);
            
            // Send notification
            if (class_exists(OrderStatusUpdated::class)) {
                $order->user->notify(new OrderStatusUpdated($order, $oldStatus, Order::STATUS_SHIPPED));
            }
            
            DB::commit();
            
            return response()->json([
                'message' => 'Pesanan berhasil dikirim',
                'order_number' => $order->order_number,
                'old_status' => $oldStatus,
                'new_status' => Order::STATUS_SHIPPED,
                'status_label' => Order::getStatusLabels()[Order::STATUS_SHIPPED],
                'courier_info' => $order->courier_info,
            ]);
            
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Gagal mengirim pesanan',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Complete an order (mark as delivered)
     * Status: SHIPPED → DELIVERED → COMPLETED
     */
    public function completeOrder(Order $order): JsonResponse
    {
        DB::beginTransaction();
        
        try {
            $oldStatus = $order->status;
            
            if ($oldStatus !== Order::STATUS_SHIPPED && 
                $oldStatus !== Order::STATUS_DELIVERED) {
                return response()->json([
                    'message' => 'Pesanan belum dapat diselesaikan. Status saat ini: ' . $oldStatus,
                    'current_status' => $oldStatus,
                ], 400);
            }
            
            // If still SHIPPED, first mark as DELIVERED
            if ($oldStatus === Order::STATUS_SHIPPED) {
                $order->updateStatus(Order::STATUS_DELIVERED);
                
                if (class_exists(OrderStatusUpdated::class)) {
                    $order->user->notify(new OrderStatusUpdated($order, Order::STATUS_SHIPPED, Order::STATUS_DELIVERED));
                }
            }
            
            // Then mark as COMPLETED
            $order->updateStatus(Order::STATUS_COMPLETED);
            
            if (class_exists(OrderStatusUpdated::class)) {
                $order->user->notify(new OrderStatusUpdated($order, Order::STATUS_DELIVERED, Order::STATUS_COMPLETED));
            }
            
            DB::commit();
            
            return response()->json([
                'message' => 'Pesanan selesai',
                'order_number' => $order->order_number,
                'old_status' => $oldStatus,
                'new_status' => Order::STATUS_COMPLETED,
                'status_label' => Order::getStatusLabels()[Order::STATUS_COMPLETED],
            ]);
            
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Gagal menyelesaikan pesanan',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Cancel an order (admin)
     */
    public function cancelOrder(Order $order, Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'cancellation_reason' => 'nullable|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Data tidak valid',
                'errors' => $validator->errors(),
            ], 422);
        }

        DB::beginTransaction();
        
        try {
            $oldStatus = $order->status;
            
            $order->updateStatus(Order::STATUS_CANCELLED);
            
            // Optionally save cancellation reason (could add column later)
            // For now, just notify
            
            if (class_exists(OrderStatusUpdated::class)) {
                $order->user->notify(new OrderStatusUpdated($order, $oldStatus, Order::STATUS_CANCELLED));
            }
            
            DB::commit();
            
            return response()->json([
                'message' => 'Pesanan dibatalkan',
                'order_number' => $order->order_number,
                'old_status' => $oldStatus,
                'new_status' => Order::STATUS_CANCELLED,
                'status_label' => Order::getStatusLabels()[Order::STATUS_CANCELLED],
            ]);
            
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Gagal membatalkan pesanan',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get order statistics for dashboard
     */
    public function statistics(): JsonResponse
    {
        $stats = [
            'total_orders' => Order::count(),
            'pending_payment' => Order::where('status', Order::STATUS_PENDING_PAYMENT)->count(),
            'waiting_confirmation' => Order::where('status', Order::STATUS_WAITING_CONFIRMATION)->count(),
            'processing' => Order::where('status', Order::STATUS_PROCESSING)->count(),
            'shipped' => Order::where('status', Order::STATUS_SHIPPED)->count(),
            'completed' => Order::where('status', Order::STATUS_COMPLETED)->count(),
            'cancelled' => Order::where('status', Order::STATUS_CANCELLED)->count(),
            
            'today_orders' => Order::whereDate('created_at', today())->count(),
            'today_revenue' => Order::whereDate('created_at', today())
                ->whereIn('status', [Order::STATUS_PAID, Order::STATUS_COMPLETED])
                ->sum('total'),
                
            'monthly_revenue' => Order::whereMonth('created_at', now()->month)
                ->whereIn('status', [Order::STATUS_PAID, Order::STATUS_COMPLETED])
                ->sum('total'),
        ];
        
        return response()->json($stats);
    }
}
