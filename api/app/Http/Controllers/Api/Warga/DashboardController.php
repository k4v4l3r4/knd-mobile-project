<?php

namespace App\Http\Controllers\Api\Warga;

use App\Http\Controllers\Controller;
use App\Models\Announcement;
use App\Models\Transaction;
use App\Models\Fee;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
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
