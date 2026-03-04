<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Announcement;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;

class AnnouncementController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $user = Auth::user();
        $query = Announcement::withCount(['likes', 'comments'])
            ->with(['likes' => function ($query) use ($user) {
                $query->where('user_id', $user->id);
            }])
            ->latest();

        // Filter by RT (Assuming user has rt_id)
        if ($user->rt_id) {
            $query->where(function ($q) use ($user) {
                $q->where('rt_id', $user->rt_id)
                    ->orWhereNull('rt_id');
            });
        }

        // Filter by Status: Admin RT can see all, Warga only PUBLISHED
        // Assuming role logic. If strictly following "Manage Announcements", admin wants to see Drafts too.
        // If mobile app user (warga), usually only published.
        // Let's assume 'admin_rt' role sees all, others see published.
        if (! in_array($user->role, ['admin_rt', 'ADMIN_RT', 'rt', 'RT'])) {
            $query->where('status', 'PUBLISHED');
        }

        // Pagination
        $announcements = $query->paginate(10);

        // Append is_liked status
        $announcements->getCollection()->transform(function ($announcement) {
            $announcement->unsetRelation('likes');

            return $announcement;
        });

        return response()->json([
            'success' => true,
            'message' => 'Daftar Pengumuman',
            'data' => $announcements,
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $request->validate([
            'title' => 'required|string|max:255',
            'content' => 'required|string',
            'category' => 'nullable|string',
            'image' => 'nullable|image|max:2048', // Max 2MB
            'status' => 'required|in:DRAFT,PUBLISHED',
            'expires_at' => 'nullable|date',
        ]);

        $user = Auth::user();
        $imageUrl = null;

        if ($request->hasFile('image')) {
            $path = $request->file('image')->store('announcements', 'public');
            $imageUrl = $path;
        }

        $announcement = Announcement::create([
            'rt_id' => $user->rt_id,
            'title' => $request->title,
            'content' => $request->content,
            'category' => $request->category ?? 'announcement',
            'image_url' => $imageUrl,
            'status' => $request->status,
            'expires_at' => $request->expires_at,
        ]);

        if ($request->status === 'PUBLISHED') {
            $users = User::where('rt_id', $user->rt_id)->get();
            foreach ($users as $recipient) {
                Notification::create([
                    'notifiable_id' => $recipient->id,
                    'notifiable_type' => User::class,
                    'title' => 'Pengumuman Baru',
                    'message' => $announcement->title,
                    'type' => 'ANNOUNCEMENT',
                    'related_id' => $announcement->id,
                    'url' => '/dashboard/pengumuman',
                    'is_read' => false,
                ]);
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Pengumuman berhasil dibuat',
            'data' => $announcement,
        ], 201);
    }

    /**
     * Display the specified resource.
     */
    public function show($id)
    {
        $announcement = Announcement::withCount(['likes', 'comments'])->find($id);

        if (! $announcement) {
            return response()->json([
                'success' => false,
                'message' => 'Pengumuman tidak ditemukan',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $announcement,
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, $id)
    {
        $user = Auth::user();
        $announcement = Announcement::find($id);

        if (! $announcement) {
            return response()->json([
                'success' => false,
                'message' => 'Pengumuman tidak ditemukan',
            ], 404);
        }

        $request->validate([
            'title' => 'sometimes|required|string|max:255',
            'content' => 'sometimes|required|string',
            'category' => 'nullable|string',
            'image' => 'nullable|image|max:2048',
            'status' => 'sometimes|required|in:DRAFT,PUBLISHED',
            'expires_at' => 'nullable|date',
        ]);

        $data = $request->only(['title', 'content', 'category', 'status', 'expires_at']);

        if ($request->hasFile('image')) {
            // Delete old image
            if ($announcement->image_url) {
                Storage::disk('public')->delete($announcement->image_url);
            }
            $path = $request->file('image')->store('announcements', 'public');
            $data['image_url'] = $path;
        }

        $announcement->update($data);

        // Notify if status changed to PUBLISHED
        if ($request->input('status') === 'PUBLISHED' && $announcement->wasChanged('status')) {
            $rtId = $announcement->rt_id ?? $user?->rt_id;
            $users = $rtId ? User::where('rt_id', $rtId)->get() : collect();
            foreach ($users as $recipient) {
                Notification::create([
                    'notifiable_id' => $recipient->id,
                    'notifiable_type' => User::class,
                    'title' => 'Pengumuman Baru',
                    'message' => $announcement->title,
                    'type' => 'ANNOUNCEMENT',
                    'related_id' => $announcement->id,
                    'url' => '/dashboard/pengumuman',
                    'is_read' => false,
                ]);
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Pengumuman berhasil diperbarui',
            'data' => $announcement,
        ]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $announcement = Announcement::find($id);

        if (! $announcement) {
            return response()->json([
                'success' => false,
                'message' => 'Pengumuman tidak ditemukan',
            ], 404);
        }

        // Delete image if exists
        if ($announcement->image_url) {
            Storage::disk('public')->delete($announcement->image_url);
        }

        $announcement->delete();

        return response()->json([
            'success' => true,
            'message' => 'Pengumuman berhasil dihapus',
        ]);
    }

    public function like($id)
    {
        $announcement = Announcement::findOrFail($id);
        $user = Auth::user();

        $like = $announcement->likes()->where('user_id', $user->id)->first();

        if ($like) {
            $like->delete();
            $liked = false;
            $message = 'Unlike berhasil';
        } else {
            $announcement->likes()->create(['user_id' => $user->id]);
            $liked = true;
            $message = 'Like berhasil';
        }

        return response()->json([
            'success' => true,
            'message' => $message,
            'liked' => $liked,
            'likes_count' => $announcement->likes()->count(),
        ]);
    }

    public function getComments($id)
    {
        $announcement = Announcement::find($id);

        if (! $announcement) {
            return response()->json([
                'success' => false,
                'message' => 'Pengumuman tidak ditemukan',
            ], 404);
        }

        $comments = $announcement->comments()
            ->with('user:id,name,avatar')
            ->latest()
            ->get();

        return response()->json([
            'success' => true,
            'data' => $comments,
        ]);
    }

    public function comment(Request $request, $id)
    {
        $request->validate([
            'content' => 'required|string|max:1000',
        ]);

        $announcement = Announcement::find($id);

        if (! $announcement) {
            return response()->json([
                'success' => false,
                'message' => 'Pengumuman tidak ditemukan',
            ], 404);
        }

        $comment = $announcement->comments()->create([
            'user_id' => Auth::id(),
            'content' => $request->content,
        ]);

        $comment->load('user:id,name,avatar');

        return response()->json([
            'success' => true,
            'message' => 'Komentar berhasil ditambahkan',
            'data' => $comment,
        ], 201);
    }
}
