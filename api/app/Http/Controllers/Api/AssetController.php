<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Asset;
use App\Models\AssetLoan;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;

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
            'data' => $assets
        ]);
    }

    /**
     * Store a newly created asset (Admin only).
     */
    public function store(Request $request)
    {
        $user = $request->user();
        
        // Basic role check (can be middleware)
        if (!in_array($user->role, ['admin_rt', 'ADMIN_RT', 'super_admin', 'SUPER_ADMIN'])) {
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
            'data' => $asset
        ], 201);
    }

    /**
     * Update asset.
     */
    public function update(Request $request, $id)
    {
        $user = $request->user();
        if (!in_array($user->role, ['admin_rt', 'ADMIN_RT', 'super_admin', 'SUPER_ADMIN'])) {
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
            if ($asset->image_url) {
                Storage::disk('public')->delete($asset->image_url);
            }
            $asset->image_url = $request->file('image')->store('assets', 'public');
        }

        $asset->update($request->except(['image', 'total_quantity']));

        return response()->json([
            'success' => true,
            'message' => 'Aset berhasil diperbarui',
            'data' => $asset
        ]);
    }

    /**
     * Delete asset.
     */
    public function destroy(Request $request, $id)
    {
        $user = $request->user();
        if (!in_array($user->role, ['admin_rt', 'ADMIN_RT', 'super_admin', 'SUPER_ADMIN'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $asset = Asset::findOrFail($id);
        
        if ($user->rt_id && $asset->rt_id !== $user->rt_id && !in_array($user->role, ['super_admin', 'SUPER_ADMIN'])) {
            return response()->json(['message' => 'Unauthorized access to asset'], 403);
        }

        if ($asset->image_url) {
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
            'user_id' => $request->user()->id,
            'asset_id' => $asset->id,
            'quantity' => $request->quantity,
            'loan_date' => $request->loan_date,
            'status' => 'PENDING',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Pengajuan peminjaman berhasil dikirim',
            'data' => $loan
        ], 201);
    }

    /**
     * Admin approves loan.
     */
    public function approveLoan(Request $request, $id)
    {
        $user = $request->user();
        if (!in_array($user->role, ['admin_rt', 'ADMIN_RT', 'super_admin', 'SUPER_ADMIN'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return DB::transaction(function () use ($id, $user, $request) {
            $loan = AssetLoan::with('asset')->lockForUpdate()->findOrFail($id);

            if ($loan->status !== 'PENDING') {
                return response()->json(['message' => 'Status peminjaman tidak valid'], 400);
            }

            $asset = Asset::lockForUpdate()->find($loan->asset_id);
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

            return response()->json([
                'success' => true,
                'message' => 'Peminjaman disetujui',
                'data' => $loan
            ]);
        });
    }

    /**
     * Admin rejects loan.
     */
    public function rejectLoan(Request $request, $id)
    {
        $user = $request->user();
        if (!in_array($user->role, ['admin_rt', 'ADMIN_RT', 'super_admin', 'SUPER_ADMIN'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $loan = AssetLoan::findOrFail($id);
        if ($loan->status !== 'PENDING') {
            return response()->json(['message' => 'Status peminjaman tidak valid'], 400);
        }

        $loan->update([
            'status' => 'REJECTED',
            'admin_note' => $request->admin_note
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Peminjaman ditolak',
            'data' => $loan
        ]);
    }

    /**
     * Admin marks asset as returned.
     */
    public function returnAsset(Request $request, $id)
    {
        $user = $request->user();
        if (!in_array($user->role, ['admin_rt', 'ADMIN_RT', 'super_admin', 'SUPER_ADMIN'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
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

            return response()->json([
                'success' => true,
                'message' => 'Aset berhasil dikembalikan',
                'data' => $loan
            ]);
        });
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
            'data' => $loans
        ]);
    }

    /**
     * Get all loan requests (For Admin).
     */
    public function loanRequests(Request $request)
    {
        $user = $request->user();
        if (!in_array($user->role, ['admin_rt', 'ADMIN_RT', 'super_admin', 'SUPER_ADMIN'])) {
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
            'data' => $loans
        ]);
    }
}
