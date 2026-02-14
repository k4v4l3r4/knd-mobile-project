<?php

namespace App\Http\Controllers\Api\Warga;

use App\Http\Controllers\Controller;
use App\Models\Announcement;
use App\Models\Transaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();

        // 1. Cek Status Iuran Bulan Ini
        // Asumsi: Iuran dianggap LUNAS jika ada transaksi VERIFIED bulan ini
        // Bisa disesuaikan nanti dengan Logic Master Iuran (Fee)
        $currentMonth = Carbon::now()->month;
        $currentYear = Carbon::now()->year;

        $hasPaid = Transaction::where('user_id', $user->id)
            ->whereIn('status', ['VERIFIED', 'PAID'])
            ->whereMonth('created_at', $currentMonth)
            ->whereYear('created_at', $currentYear)
            ->exists();

        $iuranStatus = $hasPaid ? 'LUNAS' : 'BELUM_LUNAS';

        // 2. Ambil 5 Pengumuman Terbaru
        $announcements = Announcement::where('status', 'PUBLISHED')
            ->withCount(['likes', 'comments'])
            ->with(['likes' => function($query) use ($user) {
                $query->where('user_id', $user->id);
            }])
            ->latest()
            ->take(5)
            ->get()
            ->map(function ($item) {
                return [
                    'id' => $item->id,
                    'title' => $item->title,
                    'content' => $item->content, // Bisa dipotong jika terlalu panjang
                    'category' => $item->category,
                    'image_url' => $item->image_url,
                    'created_at' => $item->created_at->toIso8601String(),
                    'likes_count' => $item->likes_count,
                    'comments_count' => $item->comments_count,
                    'is_liked' => $item->likes->isNotEmpty(),
                ];
            });

        return response()->json([
            'success' => true,
            'message' => 'Dashboard data retrieved successfully',
            'data' => [
                'user' => [
                    'name' => $user->name,
                    'email' => $user->email,
                    'phone' => $user->phone,
                    'photo_url' => $user->photo_url,
                    'rt_id' => $user->rt_id,
                    'rt_number' => $user->rt ? $user->rt->rt_number : null,
                    'rw_name' => ($user->rt && $user->rt->rw) ? $user->rt->rw->name : null,
                    'role' => $user->role,
                ],
                'iuran_status' => $iuranStatus,
                'announcements' => $announcements,
            ]
        ]);
    }
}
