<?php

namespace App\Services;

use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Exception;

class DanaService
{
    protected $baseUrl;
    protected $merchantId;
    protected $clientId;
    protected $clientSecret;
    protected $privateKey;
    protected $publicKey;
    protected $callbackUrl;
    protected $accessToken;

    public function __construct()
    {
        $this->baseUrl = config('services.dana.sandbox_url', 'https://api.sandbox.dana.id');
        $this->merchantId = config('services.dana.merchant_id');
        $this->clientId = config('services.dana.client_id');
        $this->clientSecret = config('services.dana.client_secret');
        $this->privateKey = config('services.dana.private_key');
        $this->publicKey = config('services.dana.public_key');
        $this->callbackUrl = config('services.dana.callback_url');
        $this->accessToken = $this->getAccessToken();
    }

    /**
     * Generate RSA-SHA256 Signature
     */
    private function generateSignature($data, $timestamp)
    {
        // Sort data alphabetically by key
        ksort($data);
        
        // Build signature string
        $signatureString = '';
        foreach ($data as $key => $value) {
            $signatureString .= $key . '=' . $value . '&';
        }
        $signatureString = rtrim($signatureString, '&');
        
        // Add timestamp
        $signatureString .= '&timestamp=' . $timestamp;
        
        // Sign with private key
        $signature = '';
        openssl_sign($signatureString, $signature, $this->privateKey, OPENSSL_ALGO_SHA256);
        
        return base64_encode($signature);
    }

    /**
     * Get Access Token from DANA
     */
    public function getAccessToken()
    {
        try {
            $timestamp = date('Y-m-d\TH:i:s.uP'); // ISO 8601 format with milliseconds
            
            // Create auth header
            $authHeader = [
                'Content-Type' => 'application/json',
                'Accept' => 'application/json',
                'X-DANA-TIMESTAMP' => $timestamp,
            ];

            // Get access token using client credentials
            /** @var Response $response */
            $response = Http::withHeaders([
                'Content-Type' => 'application/json',
                'Accept' => 'application/json',
            ])->post($this->baseUrl . '/v1/oauth/access_token', [
                'grant_type' => 'client_credentials',
                'client_id' => $this->clientId,
                'client_secret' => $this->clientSecret,
            ]);

            if ($response->successful()) {
                $result = $response->json();
                return $result['access_token'] ?? null;
            }

            Log::error('Failed to get DANA access token', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            return null;
        } catch (Exception $e) {
            Log::error('DANA access token error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);
            return null;
        }
    }

    /**
     * Create DANA Order / Payment
     * 
     * @param array $orderData
     * @return array|null Returns checkout_url or null on failure
     */
    public function createOrder(array $orderData)
    {
        try {
            if (!$this->accessToken) {
                throw new Exception('No access token available');
            }

            $timestamp = date('Y-m-d\TH:i:s.uP');
            
            // Prepare order data
            $payload = [
                'order_id' => $orderData['order_id'],
                'amount' => [
                    'value' => $orderData['amount'],
                    'currency' => 'IDR',
                ],
                'checkout_method' => 'ONE_TIME_PAYMENT',
                'payment_method' => 'DIGITAL_WALLET',
                'country_code' => 'id',
                'locale' => 'id_ID',
                'checkout_url' => [
                    'success' => $this->callbackUrl . '?status=success',
                    'failure' => $this->callbackUrl . '?status=failure',
                    'incomplete' => $this->callbackUrl . '?status=incomplete',
                ],
                'user_info' => [
                    'mobile_number' => $orderData['mobile_number'] ?? '',
                    'email' => $orderData['email'] ?? '',
                ],
                'mid_trans_id' => $orderData['order_id'],
                'external_id' => $orderData['external_id'] ?? $orderData['order_id'],
                'description' => $orderData['description'] ?? 'Pembayaran Ronda Online',
                'items' => $orderData['items'] ?? [],
            ];

            // Generate signature
            $signature = $this->generateSignature($payload, $timestamp);

            // Set headers
            $headers = [
                'Content-Type' => 'application/json',
                'Accept' => 'application/json',
                'Authorization' => 'Bearer ' . $this->accessToken,
                'X-DANA-TIMESTAMP' => $timestamp,
                'X-DANA-SIGNATURE' => $signature,
                'X-DANA-CLIENT-ID' => $this->clientId,
                'X-DANA-MERCHANT-ID' => $this->merchantId,
            ];

            // Make request to DANA API
            /** @var Response $response */
            $response = Http::withHeaders($headers)->post(
                $this->baseUrl . '/v1/payment/create',
                $payload
            );

            if ($response->successful()) {
                $result = $response->json();
                
                Log::info('DANA order created successfully', [
                    'order_id' => $orderData['order_id'],
                    'checkout_url' => $result['checkout_url'] ?? null,
                ]);

                return [
                    'success' => true,
                    'checkout_url' => $result['checkout_url'] ?? null,
                    'deeplink' => $result['deeplink'] ?? null,
                    'order_id' => $result['order_id'] ?? null,
                ];
            }

            Log::error('Failed to create DANA order', [
                'status' => $response->status(),
                'body' => $response->body(),
                'order_id' => $orderData['order_id'],
            ]);

            return [
                'success' => false,
                'message' => 'Failed to create payment order',
                'error' => $response->body(),
            ];

        } catch (Exception $e) {
            Log::error('DANA create order error: ' . $e->getMessage(), [
                'order_id' => $orderData['order_id'] ?? null,
                'trace' => $e->getTraceAsString(),
            ]);

            return [
                'success' => false,
                'message' => 'Payment service unavailable: ' . $e->getMessage(),
            ];
        }
    }

    /**
     * Check DANA Payment Status
     */
    public function checkPaymentStatus(string $orderId)
    {
        try {
            if (!$this->accessToken) {
                throw new Exception('No access token available');
            }

            $timestamp = date('Y-m-d\TH:i:s.uP');
            
            // Generate signature for query
            $queryData = ['order_id' => $orderId];
            $signature = $this->generateSignature($queryData, $timestamp);

            $headers = [
                'Content-Type' => 'application/json',
                'Accept' => 'application/json',
                'Authorization' => 'Bearer ' . $this->accessToken,
                'X-DANA-TIMESTAMP' => $timestamp,
                'X-DANA-SIGNATURE' => $signature,
                'X-DANA-CLIENT-ID' => $this->clientId,
                'X-DANA-MERCHANT-ID' => $this->merchantId,
            ];

            /** @var Response $response */
            $response = Http::withHeaders($headers)->get(
                $this->baseUrl . '/v1/payment/status?order_id=' . urlencode($orderId)
            );

            if ($response->successful()) {
                return [
                    'success' => true,
                    'data' => $response->json(),
                ];
            }

            return [
                'success' => false,
                'message' => 'Failed to check payment status',
            ];

        } catch (Exception $e) {
            Log::error('DANA check status error: ' . $e->getMessage());
            
            return [
                'success' => false,
                'message' => 'Payment status check failed',
            ];
        }
    }

    /**
     * Refresh Access Token (if needed)
     */
    public function refreshAccessToken()
    {
        $this->accessToken = $this->getAccessToken();
        return $this->accessToken !== null;
    }
}
