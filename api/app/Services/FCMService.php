<?php

namespace App\Services;

use Google\Auth\Credentials\ServiceAccountCredentials;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class FCMService
{
    protected $credentialsPath;

    protected $projectId;

    public function __construct()
    {
        $this->credentialsPath = storage_path('app/firebase/firebase_credentials.json');

        if (file_exists($this->credentialsPath)) {
            $json = json_decode(file_get_contents($this->credentialsPath), true);
            $this->projectId = $json['project_id'] ?? null;
        }
    }

    public function getAccessToken()
    {
        $scopes = ['https://www.googleapis.com/auth/firebase.messaging'];
        $credentials = new ServiceAccountCredentials($scopes, $this->credentialsPath);
        $token = $credentials->fetchAuthToken();

        return $token['access_token'];
    }

    protected function postFcm(string $url, string $accessToken, array $payload)
    {
        return Http::withToken($accessToken)
            ->acceptJson()
            ->post($url, $payload);
    }

    public function sendNotification($token, $title, $body, $data = [])
    {
        if (! $this->projectId) {
            Log::error('FCM: Project ID not found.');

            return false;
        }

        try {
            $accessToken = $this->getAccessToken();
            $url = "https://fcm.googleapis.com/v1/projects/{$this->projectId}/messages:send";

            // Ensure all data values are strings
            $stringData = array_map(function ($value) {
                return (string) $value;
            }, $data);

            $payload = [
                'message' => [
                    'token' => $token,
                    'notification' => [
                        'title' => $title,
                        'body' => $body,
                    ],
                    'data' => $stringData,
                    'android' => [
                        'priority' => 'high',
                        'notification' => [
                            'sound' => 'default',
                            'channel_id' => 'default',
                        ],
                    ],
                    'apns' => [
                        'payload' => [
                            'aps' => [
                                'sound' => 'default',
                            ],
                        ],
                    ],
                ],
            ];

            /** @var \Illuminate\Http\Client\Response $response */
            $response = $this->postFcm($url, $accessToken, $payload);

            if ($response->status() >= 200 && $response->status() < 300) {
                Log::info('FCM: Notification sent successfully to '.$token);

                return true;
            } else {
                Log::error('FCM: Failed to send notification. Status '.$response->status().' Response: '.json_encode($response->json()));

                return false;
            }
        } catch (\Exception $e) {
            Log::error('FCM: Exception while sending notification: '.$e->getMessage());

            return false;
        }
    }
}
