<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EmergencyAlert;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class EmergencyAlertController extends Controller
{
    public function index()
    {
        // Admin sees all, ordered by latest and status OPEN first
        $alerts = EmergencyAlert::with('user')
            ->orderByRaw("CASE WHEN status = 'OPEN' THEN 1 ELSE 2 END")
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $alerts
        ]);
    }

    public function store(Request $request)
    {
        $user = $request->user('sanctum');
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $request->validate([
            'type' => 'required|in:KEBAKARAN,MALING,MEDIS,LAINNYA',
            'latitude' => 'nullable|numeric',
            'longitude' => 'nullable|numeric',
        ]);

        $alert = EmergencyAlert::create([
            'user_id' => $user->id,
            'type' => $request->type,
            'status' => 'OPEN',
            'latitude' => $request->latitude,
            'longitude' => $request->longitude,
        ]);

        // TODO: Trigger Notification to Admin/Security (Firebase/Pusher)

        return response()->json([
            'success' => true,
            'message' => 'Sinyal darurat terkirim!',
            'data' => $alert
        ], 201);
    }

    public function resolve($id)
    {
        $alert = EmergencyAlert::findOrFail($id);
        $alert->update(['status' => 'RESOLVED']);

        return response()->json([
            'success' => true,
            'message' => 'Status bahaya telah ditandai aman.',
            'data' => $alert
        ]);
    }
}
