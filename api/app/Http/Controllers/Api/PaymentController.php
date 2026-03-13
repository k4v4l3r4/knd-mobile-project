<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\DanaService;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Exception;

class PaymentController extends Controller
{
    protected $danaService;

    public function __construct(DanaService $danaService)
    {
        $this->danaService = $danaService;
    }

    /**
     * Create DANA payment checkout URL
     * 
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function checkoutDana(Request $request)
    {
        try {
            $user = Auth::user();
            
            // Validate request
            $validated = $request->validate([
                'order_id' => 'required|string|unique:transactions,order_id',
                'amount' => 'required|numeric|min:1000',
                'description' => 'nullable|string|max:255',
                'mobile_number' => 'nullable|string|max:20',
            ]);

            // Get or create transaction
            $transaction = Transaction::where('order_id', $validated['order_id'])->first();
            
            if (!$transaction) {
                // Create new transaction if not exists
                $transaction = Transaction::create([
                    'user_id' => $user->id,
                    'tenant_id' => $user->tenant_id,
                    'order_id' => $validated['order_id'],
                    'amount' => $validated['amount'],
                    'status' => 'PENDING',
                    'payment_method' => 'DANA',
                    'description' => $validated['description'] ?? 'Pembayaran Ronda Online',
                ]);
            }

            // Prepare data for DANA
            $orderData = [
                'order_id' => $validated['order_id'],
                'amount' => (int) $validated['amount'],
                'description' => $validated['description'] ?? 'Pembayaran Ronda Online',
                'mobile_number' => $validated['mobile_number'] ?? $user->phone ?? '',
                'email' => $user->email ?? '',
                'external_id' => 'TRX-' . $transaction->id,
                'items' => [
                    [
                        'id' => $transaction->id,
                        'name' => $validated['description'] ?? 'Pembayaran Ronda Online',
                        'price' => (int) $validated['amount'],
                        'quantity' => 1,
                    ]
                ],
            ];

            // Create order with DANA
            $result = $this->danaService->createOrder($orderData);

            if ($result['success'] && !empty($result['checkout_url'])) {
                // Update transaction with DANA order info
                $transaction->update([
                    'dana_order_id' => $result['order_id'] ?? null,
                    'payment_status' => 'PENDING',
                ]);

                Log::info('DANA checkout created', [
                    'transaction_id' => $transaction->id,
                    'order_id' => $validated['order_id'],
                    'checkout_url' => $result['checkout_url'],
                ]);

                return response()->json([
                    'success' => true,
                    'message' => 'Checkout URL created successfully',
                    'data' => [
                        'checkout_url' => $result['checkout_url'],
                        'order_id' => $validated['order_id'],
                        'amount' => $validated['amount'],
                        'deeplink' => $result['deeplink'] ?? null,
                    ],
                ]);
            }

            // Failed to create order
            Log::error('Failed to create DANA checkout', [
                'order_id' => $validated['order_id'],
                'error' => $result['message'] ?? 'Unknown error',
            ]);

            return response()->json([
                'success' => false,
                'message' => $result['message'] ?? 'Failed to create payment order',
            ], 400);

        } catch (Exception $e) {
            Log::error('DANA checkout error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Payment service unavailable',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * DANA Callback Handler (Webhook)
     * This endpoint is PUBLIC - no auth middleware
     * 
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function callback(Request $request)
    {
        try {
            Log::info('DANA callback received', [
                'query' => $request->query(),
                'body' => $request->all(),
            ]);

            // Get status from query parameter
            $status = $request->query('status');
            $orderId = $request->query('order_id') ?? $request->input('order_id');

            if (!$orderId) {
                Log::warning('DANA callback missing order_id');
                return response()->json([
                    'success' => false,
                    'message' => 'Order ID required',
                ], 400);
            }

            // Find transaction by order_id or dana_order_id
            $transaction = Transaction::where('order_id', $orderId)
                ->orWhere('dana_order_id', $orderId)
                ->first();

            if (!$transaction) {
                Log::warning('DANA callback - transaction not found', ['order_id' => $orderId]);
                return response()->json([
                    'success' => false,
                    'message' => 'Transaction not found',
                ], 404);
            }

            // Check payment status from DANA if needed
            if ($status === 'success') {
                // Verify with DANA API
                $statusResult = $this->danaService->checkPaymentStatus($orderId);
                
                if ($statusResult['success']) {
                    $paymentStatus = $statusResult['data']['payment_status'] ?? 'UNKNOWN';
                    
                    // Update transaction status based on DANA response
                    if (in_array($paymentStatus, ['SUCCESS', 'SETTLED', 'PAID'])) {
                        $transaction->update([
                            'status' => 'PAID',
                            'payment_status' => 'SUCCESS',
                            'paid_at' => now(),
                        ]);

                        // Trigger any post-payment actions here
                        // e.g., activate service, send notification, etc.
                        
                        Log::info('DANA payment verified and transaction updated', [
                            'transaction_id' => $transaction->id,
                            'order_id' => $orderId,
                            'status' => 'PAID',
                        ]);
                    }
                }
            } elseif ($status === 'failure' || $status === 'incomplete') {
                // Payment failed or incomplete
                $transaction->update([
                    'payment_status' => 'FAILED',
                    'failed_at' => now(),
                ]);

                Log::info('DANA payment failed', [
                    'transaction_id' => $transaction->id,
                    'order_id' => $orderId,
                    'status' => $status,
                ]);
            }

            return response()->json([
                'success' => true,
                'message' => 'Callback processed successfully',
            ]);

        } catch (Exception $e) {
            Log::error('DANA callback error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);

            // Return success anyway to prevent DANA from retrying
            return response()->json([
                'success' => true,
                'message' => 'Callback received with errors',
            ], 200);
        }
    }

    /**
     * Check payment status
     */
    public function checkStatus(Request $request)
    {
        try {
            $user = Auth::user();
            
            $validated = $request->validate([
                'order_id' => 'required|string',
            ]);

            $transaction = Transaction::where('order_id', $validated['order_id'])
                ->where('user_id', $user->id)
                ->first();

            if (!$transaction) {
                return response()->json([
                    'success' => false,
                    'message' => 'Transaction not found',
                ], 404);
            }

            // Check latest status from DANA if transaction is still pending
            if ($transaction->status === 'PENDING' && $transaction->dana_order_id) {
                $statusResult = $this->danaService->checkPaymentStatus($transaction->dana_order_id);
                
                if ($statusResult['success']) {
                    $paymentStatus = $statusResult['data']['payment_status'] ?? 'UNKNOWN';
                    
                    if (in_array($paymentStatus, ['SUCCESS', 'SETTLED', 'PAID'])) {
                        $transaction->update([
                            'status' => 'PAID',
                            'payment_status' => 'SUCCESS',
                            'paid_at' => now(),
                        ]);
                    }
                }
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'order_id' => $transaction->order_id,
                    'status' => $transaction->status,
                    'payment_status' => $transaction->payment_status,
                    'amount' => $transaction->amount,
                    'paid_at' => $transaction->paid_at,
                ],
            ]);

        } catch (Exception $e) {
            Log::error('Check payment status error: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to check payment status',
            ], 500);
        }
    }
}
