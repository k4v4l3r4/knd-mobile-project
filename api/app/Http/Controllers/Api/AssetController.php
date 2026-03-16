<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Asset;
use App\Models\AssetLoan;
use App\Models\Notification;
use App\Models\User;
use App\Http\Resources\AssetResource;
use App\Http\Resources\AssetLoanResource;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AssetController extends Controller
{
    /**
     * Display a listing of assets.
     */
    public function index(Request $request)
    {
        $user = $request->user('sanctum');
        $query = Asset::query();

        // Filter by RT if user has RT (Admin RT or Warga)
        if ($user && $user->rt_id) {
            $query->where('rt_id', $user->rt_id);
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                  ->orWhere('description', 'ilike', "%{$search}%");
            });
        }

        $assets = $query->latest()->get();

        return response()->json([
            'success' => true,
            'message' => 'Daftar Aset',
            'data' => AssetResource::collection($assets)
        ]);
    }

    /**
     * Store a newly created asset (Admin only).
     */
    public function store(Request $request)
    {
        $user = $request->user();
        
        // Basic role check (can be middleware)
        if (!in_array($user->role, ['admin_rt', 'ADMIN_RT', 'super_admin', 'SUPER_ADMIN', 'RT', 'rt'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'total_quantity' => 'required|integer|min:0',
            'condition' => 'required|in:BAIK,RUSAK',
            'image' => 'nullable|image|max:2048',
        ]);

        $imageUrl = null;
        if ($request->hasFile('image')) {
            $imageUrl = $request->file('image')->store('assets', 'public');
        }

        $asset = Asset::create([
            'rt_id' => $user->rt_id ?? 1, // Fallback for Super Admin
            'name' => $request->name,
            'description' => $request->description,
            'total_quantity' => $request->total_quantity,
            'available_quantity' => $request->total_quantity,
            'condition' => $request->condition,
            'image_url' => $imageUrl,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Aset berhasil ditambahkan',
            'data' => new AssetResource($asset)
        ], 201);
    }

    /**
     * Update asset.
     */
    public function update(Request $request, $id)
    {
        $user = $request->user();
        if (!in_array($user->role, ['admin_rt', 'ADMIN_RT', 'super_admin', 'SUPER_ADMIN', 'RT', 'rt'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $asset = Asset::findOrFail($id);
        
        // Check RT ownership
        if ($user->rt_id && $asset->rt_id !== $user->rt_id && !in_array($user->role, ['super_admin', 'SUPER_ADMIN'])) {
            return response()->json(['message' => 'Unauthorized access to asset'], 403);
        }

        $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'total_quantity' => 'sometimes|integer|min:0',
            'condition' => 'sometimes|in:BAIK,RUSAK',
            'image' => 'nullable|image|max:2048',
        ]);

        if ($request->has('total_quantity')) {
            $diff = $request->total_quantity - $asset->total_quantity;
            $asset->available_quantity += $diff;
            if ($asset->available_quantity < 0) $asset->available_quantity = 0;
            $asset->total_quantity = $request->total_quantity;
        }

        if ($request->hasFile('image')) {
            if ($asset->image_url && !str_starts_with($asset->image_url, 'http')) {
                Storage::disk('public')->delete($asset->image_url);
            }
            $asset->image_url = $request->file('image')->store('assets', 'public');
        }

        $asset->update($request->except(['image', 'total_quantity']));

        return response()->json([
            'success' => true,
            'message' => 'Aset berhasil diperbarui',
            'data' => new AssetResource($asset)
        ]);
    }

    /**
     * Delete asset.
     */
    public function destroy(Request $request, $id)
    {
        $user = $request->user();
        if (!in_array($user->role, ['admin_rt', 'ADMIN_RT', 'super_admin', 'SUPER_ADMIN', 'RT', 'rt'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $asset = Asset::findOrFail($id);
        
        if ($user->rt_id && $asset->rt_id !== $user->rt_id && !in_array($user->role, ['super_admin', 'SUPER_ADMIN'])) {
            return response()->json(['message' => 'Unauthorized access to asset'], 403);
        }

        if ($asset->image_url && !str_starts_with($asset->image_url, 'http')) {
            Storage::disk('public')->delete($asset->image_url);
        }

        $asset->delete();

        return response()->json([
            'success' => true,
            'message' => 'Aset berhasil dihapus'
        ]);
    }

    /**
     * Borrow request by Warga.
     */
    public function borrow(Request $request)
    {
        try {
            // Check authentication
            $user = $request->user();
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized. Silakan login ulang.'
                ], 401);
            }

            $request->validate([
                'asset_id' => 'required|exists:assets,id',
                'quantity' => 'required|integer|min:1',
                'loan_date' => 'required|date',
            ]);

            $asset = Asset::findOrFail($request->asset_id);

            if ($asset->available_quantity < $request->quantity) {
                return response()->json(['message' => 'Stok tidak mencukupi'], 400);
            }

            // Create PENDING loan
            $loan = AssetLoan::create([
                'user_id' => $user->id,
                'asset_id' => $asset->id,
                'quantity' => $request->quantity,
                'loan_date' => $request->loan_date,
                'status' => 'PENDING',
            ]);

            // Notify Admins - Handle case where no admins exist
            $adminRoles = ['ADMIN_RT', 'RT', 'SECRETARY', 'TREASURER', 'ADMIN_RW'];
            $admins = User::where('rt_id', $asset->rt_id)
                ->whereIn('role', $adminRoles)
                ->get(['id']);

            if ($admins->count() > 0) {
                foreach ($admins as $admin) {
                    try {
                        Notification::create([
                            'user_id' => $admin->id,
                            'title' => 'Peminjaman Aset Baru',
                            'message' => ($user->name ?: 'Warga') . ' mengajukan pinjaman: ' . $asset->name,
                            'type' => 'ASSET_LOAN',
                            'related_id' => $loan->id,
                            'url' => '/dashboard/inventaris',
                            'is_read' => false,
                        ]);
                    } catch (\Exception $notifException) {
                        // Log notification error but don't fail the entire request
                        Log::warning('Failed to create notification for admin: ' . $admin->id, [
                            'error' => $notifException->getMessage(),
                            'loan_id' => $loan->id
                        ]);
                    }
                }
            } else {
                Log::warning('No admins found for RT: ' . $asset->rt_id, [
                    'asset_id' => $asset->id,
                    'loan_id' => $loan->id
                ]);
            }

            return response()->json([
                'success' => true,
                'message' => 'Pengajuan peminjaman berhasil dikirim',
                'data' => new AssetLoanResource($loan)
            ], 201);
        } catch (\Exception $e) {
            Log::error('Asset borrow error: ' . $e->getMessage(), [
                'exception' => get_class($e),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan pada server. Silakan coba lagi atau hubungi administrator.'
            ], 500);
        }
    }

    /**
     * Admin approves loan.
     */
    public function approveLoan(Request $request, $id)
    {
        try {
            $user = $request->user();
            if (!$user || !in_array($user->role, ['admin_rt', 'ADMIN_RT', 'super_admin', 'SUPER_ADMIN', 'RT', 'rt'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized. Silakan login ulang.'
                ], 401);
            }

            return DB::transaction(function () use ($id, $user, $request) {
                $loan = AssetLoan::with('asset')->lockForUpdate()->findOrFail($id);

                if ($loan->status !== 'PENDING') {
                    return response()->json(['message' => 'Status peminjaman tidak valid'], 400);
                }

                $asset = Asset::lockForUpdate()->find($loan->asset_id);
                if (!$asset) {
                    return response()->json(['message' => 'Aset tidak ditemukan'], 400);
                }
                
                if ($asset->available_quantity < $loan->quantity) {
                    return response()->json(['message' => 'Stok aset tidak mencukupi saat ini'], 400);
                }

                // Decrease stock
                $asset->decrement('available_quantity', $loan->quantity);

                // Update status
                $loan->update([
                    'status' => 'APPROVED',
                    'admin_note' => $request->admin_note
                ]);

                // Notify User
                Notification::create([
                    'user_id' => $loan->user_id,
                    'title' => 'Peminjaman Disetujui',
                    'message' => 'Peminjaman ' . $asset->name . ' Anda telah disetujui.',
                    'type' => 'ASSET_LOAN',
                    'related_id' => $loan->id,
                    'url' => '/mobile/loans',
                    'is_read' => false,
                ]);

                return response()->json([
                    'success' => true,
                    'message' => 'Peminjaman disetujui',
                    'data' => new AssetLoanResource($loan)
                ]);
            });
        } catch (\Exception $e) {
            Log::error('Asset loan approve error: ' . $e->getMessage(), [
                'exception' => get_class($e),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan pada server. Silakan coba lagi atau hubungi administrator.'
            ], 500);
        }
    }

    /**
     * Admin rejects loan.
     */
    public function rejectLoan(Request $request, $id)
    {
        try {
            $user = $request->user();
            if (!$user || !in_array($user->role, ['admin_rt', 'ADMIN_RT', 'super_admin', 'SUPER_ADMIN', 'RT', 'rt'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized. Silakan login ulang.'
                ], 401);
            }

            $loan = AssetLoan::with('asset')->findOrFail($id);
            if ($loan->status !== 'PENDING') {
                return response()->json(['message' => 'Status peminjaman tidak valid'], 400);
            }

            if (!$loan->asset) {
                return response()->json(['message' => 'Aset tidak ditemukan'], 400);
            }

            $loan->update([
                'status' => 'REJECTED',
                'admin_note' => $request->admin_note
            ]);

            // Notify User
            Notification::create([
                'user_id' => $loan->user_id,
                'title' => 'Peminjaman Ditolak',
                'message' => 'Peminjaman ' . $loan->asset->name . ' Anda ditolak. Alasan: ' . ($request->admin_note ?? '-'),
                'type' => 'ASSET_LOAN',
                'related_id' => $loan->id,
                'url' => '/mobile/loans',
                'is_read' => false,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Peminjaman ditolak',
                'data' => new AssetLoanResource($loan)
            ]);
        } catch (\Exception $e) {
            Log::error('Asset loan reject error: ' . $e->getMessage(), [
                'exception' => get_class($e),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan pada server. Silakan coba lagi atau hubungi administrator.'
            ], 500);
        }
    }

    /**
     * Admin marks asset as returned.
     */
    public function returnAsset(Request $request, $id)
    {
        try {
            $user = $request->user();
            if (!$user || !in_array($user->role, ['admin_rt', 'ADMIN_RT', 'super_admin', 'SUPER_ADMIN', 'RT', 'rt'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized. Silakan login ulang.'
                ], 401);
            }

            return DB::transaction(function () use ($id, $request) {
                $loan = AssetLoan::with('asset')->lockForUpdate()->findOrFail($id);

                if ($loan->status !== 'APPROVED') {
                    return response()->json(['message' => 'Hanya peminjaman aktif yang bisa dikembalikan'], 400);
                }

                // Restore stock
                $loan->asset->increment('available_quantity', $loan->quantity);

                // Update loan
                $loan->update([
                    'status' => 'RETURNED',
                    'return_date' => now(),
                    'admin_note' => $request->admin_note
                ]);

                // Notify User
                Notification::create([
                    'user_id' => $loan->user_id,
                    'title' => 'Pengembalian Aset',
                    'message' => 'Terima kasih, pengembalian ' . $loan->asset->name . ' telah dikonfirmasi.',
                    'type' => 'ASSET_LOAN',
                    'related_id' => $loan->id,
                    'url' => '/mobile/loans',
                    'is_read' => false,
                ]);

                return response()->json([
                    'success' => true,
                    'message' => 'Aset berhasil dikembalikan',
                    'data' => new AssetLoanResource($loan)
                ]);
            });
        } catch (\Exception $e) {
            Log::error('Asset loan return error: ' . $e->getMessage(), [
                'exception' => get_class($e),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan pada server. Silakan coba lagi atau hubungi administrator.'
            ], 500);
        }
    }

    /**
     * Get loans for current user (My History).
     */
    public function myLoans(Request $request)
    {
        $loans = AssetLoan::with('asset')
            ->where('user_id', $request->user()->id)
            ->latest()
            ->get();

        return response()->json([
            'success' => true,
            'data' => AssetLoanResource::collection($loans)
        ]);
    }

    /**
     * Get all loan requests (For Admin).
     */
    public function loanRequests(Request $request)
    {
        $user = $request->user();
        if (!in_array($user->role, ['admin_rt', 'ADMIN_RT', 'super_admin', 'SUPER_ADMIN', 'RT', 'rt'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $query = AssetLoan::with(['user', 'asset']);
        
        // Filter by RT via asset
        if ($user->rt_id) {
            $query->whereHas('asset', function($q) use ($user) {
                $q->where('rt_id', $user->rt_id);
            });
        }

        $loans = $query->latest()->get();

        return response()->json([
            'success' => true,
            'data' => AssetLoanResource::collection($loans)
        ]);
    }
}
