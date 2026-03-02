<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        $notifications = Notification::where('user_id', $request->user()->id)
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
            $count = Notification::where('user_id', $user->id)
                ->where('is_read', false)
                ->count();

            $hasEmergency = Notification::where('user_id', $user->id)
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
        $notification = Notification::where('user_id', $request->user()->id)
            ->where('id', $id)
            ->firstOrFail();

        $notification->update(['is_read' => true]);

        return response()->json([
            'status' => 'success',
            'message' => 'Notification marked as read'
        ]);
    }

    public function markAllAsRead(Request $request)
    {
        Notification::where('user_id', $request->user()->id)
            ->where('is_read', false)
            ->update(['is_read' => true]);

        return response()->json([
            'status' => 'success',
            'message' => 'All notifications marked as read'
        ]);
    }
}
