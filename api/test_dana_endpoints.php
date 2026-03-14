<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\Http;

$baseUrl = config('services.dana.sandbox_url');
$clientId = config('services.dana.client_id');
$clientSecret = config('services.dana.client_secret');
$merchantId = config('services.dana.merchant_id');

echo "DANA API Endpoint Discovery\n";
echo "============================\n\n";
echo "Testing with credentials:\n";
echo "- Merchant ID: $merchantId\n";
echo "- Client ID: $clientId\n";
echo "- Base URL: $baseUrl\n\n";

// Test different endpoint variations
$endpoints = [
    '/v1/oauth/access_token',
    '/oauth/access_token',
    '/v1/auth/token',
    '/auth/token',
];

foreach ($endpoints as $endpoint) {
    echo "Trying: {$baseUrl}{$endpoint}\n";
    
    try {
        $response = Http::withHeaders([
            'Content-Type' => 'application/json',
            'Accept' => 'application/json',
        ])
        ->withoutVerifying()
        ->timeout(10)
        ->post($baseUrl . $endpoint, [
            'grant_type' => 'client_credentials',
            'client_id' => $clientId,
            'client_secret' => $clientSecret,
        ]);

        echo "Status: " . $response->status() . "\n";
        
        if ($response->successful()) {
            echo "✅ SUCCESS!\n";
            echo "Response: " . json_encode($response->json(), JSON_PRETTY_PRINT) . "\n";
            exit(0);
        } else {
            echo "❌ Failed - " . json_encode($response->json()) . "\n";
        }
    } catch (Exception $e) {
        echo "❌ Error: " . $e->getMessage() . "\n";
    }
    
    echo "\n";
}

echo "All endpoints tested. If all failed, check:\n";
echo "1. Is sandbox.dana.id the correct domain?\n";
echo "2. Are these credentials for sandbox or production?\n";
echo "3. Does DANA require IP whitelisting?\n";
