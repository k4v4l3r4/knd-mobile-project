<?php

namespace App\Http\Controllers;

use App\Models\Notification;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        $notifications = Notification::where('notifiable_id', Auth::id())
            ->where('notifiable_type', User::class)
            ->orderBy('created_at', 'desc')
            ->paginate(10);

        return response()->json($notifications);
    }

    public function unreadCount()
    {
        $count = Notification::where('notifiable_id', Auth::id())
            ->where('notifiable_type', User::class)
            ->where('is_read', false)
            ->count();

        return response()->json(['count' => $count]);
    }

    public function markAsRead($id)
    {
        $notification = Notification::where('notifiable_id', Auth::id())
            ->where('notifiable_type', User::class)
            ->where('id', $id)
            ->firstOrFail();

        $notification->update(['is_read' => true]);

        return response()->json(['message' => 'Notification marked as read', 'data' => $notification]);
    }

    public function markAllAsRead()
    {
        Notification::where('notifiable_id', Auth::id())
            ->where('notifiable_type', User::class)
            ->where('is_read', false)
            ->update(['is_read' => true]);

        return response()->json(['message' => 'All notifications marked as read']);
    }
}
