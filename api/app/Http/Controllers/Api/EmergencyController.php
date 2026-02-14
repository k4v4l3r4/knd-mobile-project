<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EmergencyAlert;
use App\Models\EmergencyContact;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class EmergencyController extends Controller
{
    /**
     * Get list of emergency contacts.
     * Route: GET /emergency/contacts
     */
    public function getContacts(Request $request)
    {
        $user = $request->user('sanctum');
        if (!$user) return response()->json(['message' => 'Unauthorized'], 401);
        
        // Fetch global contacts (rt_id is null) and local contacts (rt_id matches user's RT)
        $contacts = EmergencyContact::whereNull('rt_id')
            ->orWhere('rt_id', $user->rt_id)
            ->orderBy('type', 'desc') // OFFICIAL first (if Z-A) or use specific ordering
            ->get();

        return response()->json([
            'success' => true,
            'data' => $contacts
        ]);
    }

    /**
     * Trigger a panic alert.
     * Route: POST /emergency/panic
     */
    public function triggerPanic(Request $request)
    {
        $request->validate([
            'latitude' => 'nullable|numeric',
            'longitude' => 'nullable|numeric',
            'description' => 'nullable|string',
        ]);

        $user = $request->user('sanctum');
        if (!$user) return response()->json(['message' => 'Unauthorized'], 401);

        $alert = EmergencyAlert::create([
            'user_id' => $user->id,
            'rt_id' => $user->rt_id,
            'latitude' => $request->latitude,
            'longitude' => $request->longitude,
            'description' => $request->description,
            'type' => 'LAINNYA', // Default to generic panic if not specified
            'status' => 'OPEN',
        ]);

        // Here you would trigger real-time notification (Pusher/Firebase)
        // broadcast(new EmergencyAlertEvent($alert));

        return response()->json([
            'success' => true,
            'message' => 'Sinyal darurat berhasil dikirim!',
            'data' => $alert
        ], 201);
    }
}
