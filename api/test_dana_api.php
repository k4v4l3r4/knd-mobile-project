<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\Http;

$baseUrl = config('services.dana.sandbox_url');
$clientId = config('services.dana.client_id');
$clientSecret = config('services.dana.client_secret');
$merchantId = config('services.dana.merchant_id');

echo "DANA API Test\n";
echo "=============\n\n";

try {
    /** 
     * @var \Illuminate\Http\Client\Response $response
     * @psalm-suppress UndefinedMethod
     */
    $response = Http::withHeaders([
        'Content-Type' => 'application/json',
        'Accept' => 'application/json',
    ])
    ->withoutVerifying()
    ->timeout(10)
    ->post($baseUrl . '/v1/oauth/access_token', [
        'grant_type' => 'client_credentials',
        'client_id' => $clientId,
        'client_secret' => $clientSecret,
    ]);

    /** @psalm-suppress UndefinedMethod */
    echo "Status: " . $response->status() . "\n";
    
    if ($response->successful()) {
        echo "✅ SUCCESS!\n";
        /** 
         * @var array<string, mixed> $responseData
         * @psalm-suppress UndefinedMethod
         */
        $responseData = $response->json();
        echo "Response: " . json_encode($responseData, JSON_PRETTY_PRINT) . "\n";
    } else {
        /** 
         * @var array<string, mixed> $errorData
         * @psalm-suppress UndefinedMethod
         */
        $errorData = $response->json();
        echo "❌ Failed: " . json_encode($errorData) . "\n";
    }
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}
