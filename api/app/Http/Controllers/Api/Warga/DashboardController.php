<?php

namespace App\Http\Controllers\Api\Warga;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Announcement;
use App\Models\Transaction;
use App\Models\Fee;
use App\Models\Notification;
use App\Models\BoardingHouse;
use App\Models\BoardingTenant;
use App\Models\Report;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();

        // 1. Cek Status Iuran Bulan Ini berbasis tunggakan (unpaid fees)
        $now = Carbon::now();
        $currentMonth = $now->month;
        $currentYear = $now->year;

        $fees = Fee::where('rt_id', $user->rt_id)
            ->where('is_mandatory', true)
            ->get()
            ->filter(function (Fee $fee) use ($now, $currentMonth, $currentYear) {
                if (!$fee->billing_day) {
                    return true;
                }
                $billingDate = Carbon::create($currentYear, $currentMonth, $fee->billing_day, 0, 0, 0);
                return $now->greaterThanOrEqualTo($billingDate);
            });

        $monthTransactions = Transaction::where('user_id', $user->id)
            ->whereYear('date', $currentYear)
            ->whereMonth('date', $currentMonth)
            ->where('status', '!=', 'REJECTED')
            ->get();

        $unpaidCount = 0;

        foreach ($fees as $fee) {
            $isPaid = false;

            foreach ($monthTransactions as $trx) {
                $items = $trx->items ?? [];
                if (!is_array($items)) {
                    continue;
                }

                foreach ($items as $item) {
                    if (isset($item['fee_id']) && $item['fee_id'] == $fee->id) {
                        $isPaid = true;
                        break 2;
                    }
                }
            }

            if (!$isPaid) {
                $unpaidCount++;
            }
        }

        if ($fees->isEmpty()) {
            $iuranStatus = 'LUNAS';
        } else {
            $iuranStatus = $unpaidCount > 0 ? 'BELUM_LUNAS' : 'LUNAS';
        }

        // 2. Ambil 5 Pengumuman Terbaru
        $announcements = Announcement::where(function($query) use ($user) {
                $query->where('rt_id', $user->rt_id)
                      ->orWhereNull('rt_id');
            })
            ->whereIn('status', ['publish', 'published', 'PUBLISH', 'PUBLISHED']) // Toleransi variasi status
            ->where(function($q) {
                // Tampilkan jika tidak ada expired date ATAU expired date belum lewat (toleransi sampai akhir hari)
                $q->whereNull('expires_at')
                  ->orWhere('expires_at', '>=', Carbon::now()->startOfDay());
            })
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

        $unreadNotificationsCount = 0;
        $hasEmergency = false;
        $unreadReportsCount = 0;

        try {
            $unreadNotificationsCount = Notification::where('notifiable_id', $user->id)
                ->where('notifiable_type', User::class)
                ->where('is_read', false)
                ->count();
                
            $hasEmergency = Notification::where('notifiable_id', $user->id)
                ->where('notifiable_type', User::class)
                ->where('is_read', false)
                ->whereIn('type', ['EMERGENCY', 'SOS', 'PANIC', 'WARNING', 'PANIC_BUTTON'])
                ->exists();
            
            // Count unread reports for RT users only
            if (in_array($user->role, ['ADMIN_RT', 'RT', 'SECRETARY', 'TREASURER'])) {
                $unreadReportsCount = Report::where('rt_id', $user->rt_id)
                    ->where('status', 'PENDING')
                    ->count();
            }
        } catch (\Exception $e) {
            Log::error('Dashboard Notification Error: ' . $e->getMessage());
            // Fallback default values are already set
        }

        // 3. Cek Status Management Kost (Juragan / Anak Kost)
        $isJuragan = BoardingHouse::where('owner_id', $user->id)->exists();
        $isAnakKost = BoardingTenant::where('user_id', $user->id)->where('status', 'ACTIVE')->exists();

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
                'is_juragan' => $isJuragan,
                'is_anak_kost' => $isAnakKost,
                'iuran_status' => $iuranStatus,
                'unread_notifications_count' => $unreadNotificationsCount,
                'unread_reports_count' => $unreadReportsCount,
                'has_emergency' => $hasEmergency,
                'announcements' => $announcements,
            ]
        ]);
    }
}
