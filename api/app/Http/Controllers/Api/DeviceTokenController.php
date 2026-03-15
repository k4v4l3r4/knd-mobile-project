<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class DeviceTokenController extends Controller
{
    /**
     * Save device token for push notifications
     */
    public function store(Request $request)
    {
        $request->validate([
            'device_token' => 'required|string|max:2048',
            'device_type' => 'nullable|string|in:ios,android',
        ]);

        /** @var \App\Models\User $user */
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

    /**
     * Remove device token
     */
    public function destroy(Request $request)
    {
        $request->validate([
            'device_token' => 'required|string|max:2048',
        ]);

        /** @var \App\Models\User $user */
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
