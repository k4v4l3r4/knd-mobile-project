<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        $notifications = Notification::where('notifiable_id', $request->user()->id)
            ->where('notifiable_type', User::class)
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return response()->json([
            'status' => 'success',
            'data' => $notifications->items(),
            'meta' => [
                'current_page' => $notifications->currentPage(),
                'last_page' => $notifications->lastPage(),
                'total' => $notifications->total(),
            ]
        ]);
    }

    public function unreadCount(Request $request)
    {
        try {
            $user = $request->user();
            $count = Notification::where('notifiable_id', $user->id)
                ->where('notifiable_type', User::class)
                ->where('is_read', false)
                ->count();

            $hasEmergency = Notification::where('notifiable_id', $user->id)
                ->where('notifiable_type', User::class)
                ->where('is_read', false)
                ->whereIn('type', ['EMERGENCY', 'SOS', 'PANIC', 'WARNING', 'PANIC_BUTTON'])
                ->exists();

            return response()->json([
                'status' => 'success',
                'count' => $count,
                'has_emergency' => $hasEmergency
            ]);
        } catch (\Exception $e) {
            Log::error('Notification Count Error: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'count' => 0,
                'has_emergency' => false,
                'message' => 'Failed to retrieve notification count'
            ]);
        }
    }

    public function markAsRead(Request $request, $id)
    {
        // Handle "0" or invalid UUIDs sent by frontend
        if ($id === '0' || $id === 0) {
            return response()->json([
                'status' => 'success', // Return success to prevent frontend error, or 'ignored'
                'message' => 'Invalid ID ignored'
            ]);
        }

        try {
            $notification = Notification::where('notifiable_id', $request->user()->id)
                ->where('notifiable_type', User::class)
                ->where('id', $id)
                ->firstOrFail();

            $notification->update([
                'is_read' => true,
                'read_at' => now()
            ]);

            return response()->json([
                'status' => 'success',
                'message' => 'Notification marked as read'
            ]);
        } catch (\Exception $e) {
            // If UUID is invalid syntax, it might throw QueryException. 
            // We can catch it and return 404 or success (to ignore).
            return response()->json([
                'status' => 'error',
                'message' => 'Notification not found or invalid ID'
            ], 404);
        }
    }

    public function markAllAsRead(Request $request)
    {
        Notification::where('notifiable_id', $request->user()->id)
            ->where('notifiable_type', User::class)
            ->where('is_read', false)
            ->update([
                'is_read' => true,
                'read_at' => now()
            ]);

        return response()->json([
            'status' => 'success',
            'message' => 'All notifications marked as read'
        ]);
    }
}
