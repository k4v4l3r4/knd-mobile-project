<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Store;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Storage;

class StoreController extends Controller
{
    /**
     * Get my store
     * Warga hanya bisa mengelola UMKM miliknya sendiri.
     */
    public function myStore(Request $request)
    {
        $store = Store::where('user_id', $request->user()->id)->first();
        
        if (!$store) {
            return response()->json([
                'message' => 'Anda belum memiliki toko',
                'data' => null
            ]);
        }
        
        return response()->json([
            'message' => 'Data toko berhasil diambil',
            'data' => $store
        ]);
    }

    /**
     * Create a new store
     * Warga membuat UMKM -> Status PENDING_RT
     */
    public function store(Request $request)
    {
        $user = $request->user();
        
        // Ensure single store per user
        if (Store::where('user_id', $user->id)->exists()) {
            return response()->json(['message' => 'Anda sudah memiliki toko'], 400);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'category' => 'nullable|string|in:FOOD,GOODS,SERVICE',
            'contact' => 'required|string|max:20',
            'address' => 'nullable|string',
            'image' => 'nullable|image|max:2048',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validasi gagal',
                'errors' => $validator->errors()
            ], 422);
        }

        $data = $request->only(['name', 'description', 'category', 'contact', 'address']);
        $data['user_id'] = $user->id;
        $data['rt_id'] = $user->rt_id; // Otomatis RT user
        // RW ID diambil via relasi RT -> RW (tidak perlu simpan manual jika tidak ada kolom)
        
        // Status PENDING_RT -> mapped to 'pending' in DB enum
        $data['status'] = 'pending'; 

        if ($request->hasFile('image')) {
            $path = $request->file('image')->store('stores', 'public');
            $data['image_url'] = $path;
        }

        $store = Store::create($data);

        return response()->json([
            'message' => 'Toko berhasil dibuat. Menunggu persetujuan Admin RT.',
            'data' => $store
        ], 201);
    }

    /**
     * Update store
     * Warga hanya bisa edit milik sendiri.
     */
    public function update(Request $request, Store $store)
    {
        $user = $request->user();

        // Validasi Kepemilikan: Strict
        if ($store->user_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized. Anda hanya bisa mengedit toko milik sendiri.'], 403);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'string|max:255',
            'description' => 'nullable|string',
            'category' => 'nullable|string|in:FOOD,GOODS,SERVICE',
            'contact' => 'nullable|string|max:20',
            'address' => 'nullable|string',
            'image' => 'nullable|image|max:2048',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validasi gagal',
                'errors' => $validator->errors()
            ], 422);
        }

        $data = $request->only(['name', 'description', 'category', 'contact', 'address']);

        if ($request->hasFile('image')) {
            if ($store->image_url) {
                Storage::disk('public')->delete($store->image_url);
            }
            $path = $request->file('image')->store('stores', 'public');
            $data['image_url'] = $path;
        }

        $store->update($data);

        return response()->json([
            'message' => 'Toko berhasil diperbarui',
            'data' => $store
        ]);
    }

    /**
     * List all stores (Marketplace & Admin Views)
     * Rules:
     * 1. Warga: Melihat UMKM dalam RW (APPROVED_RT only)
     * 2. Admin RT: Melihat UMKM dalam RT (All Status)
     * 3. Admin RW: Melihat UMKM dalam RW (Read Only)
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $query = Store::with(['user', 'products']);
        
        // Mapping Status: PENDING_RT=pending, APPROVED_RT=verified, REJECTED_RT=rejected

        if ($user->role === 'ADMIN_RT') {
            // ADMIN RT: Scope RT Only
            $query->where('rt_id', $user->rt_id);
            
            // Optional filter status for Admin Management
            if ($request->has('status')) {
                $query->where('status', $request->status);
            }
        } 
        elseif ($user->role === 'ADMIN_RW') {
            // ADMIN RW: Scope RW Only (Read Only View)
            $query->whereHas('rt', function($q) use ($user) {
                $q->where('rw_id', $user->rw_id);
            });

            // Optional filter status
            if ($request->has('status')) {
                $query->where('status', $request->status);
            }
        } 
        else {
            // WARGA / PUBLIC: Scope RW, Status APPROVED_RT (verified) Only
            $query->whereHas('rt', function($q) use ($user) {
                $q->where('rw_id', $user->rw_id);
            });
            $query->where('status', 'verified');
        }
        
        $stores = $query->latest()->get();
        
        return response()->json([
            'message' => 'Data toko berhasil diambil',
            'data' => $stores
        ]);
    }

    /**
     * Admin: Verify/Reject store
     * Rules:
     * 1. HANYA Admin RT
     * 2. HANYA RT yang sama
     */
    public function verify(Request $request, Store $store)
    {
        $user = $request->user();
        
        // STRICT CHECK: Role
        if ($user->role !== 'ADMIN_RT') {
             return response()->json(['message' => 'Akses ditolak. Hanya Admin RT yang boleh melakukan approval.'], 403);
        }
        
        // STRICT CHECK: RT Scope
        if ($store->rt_id !== $user->rt_id) {
            return response()->json(['message' => 'Akses ditolak. Toko berada di RT berbeda.'], 403);
        }

        $validator = Validator::make($request->all(), [
            'status' => 'required|in:verified,rejected,pending'
        ]);
        
        if ($validator->fails()) {
             return response()->json(['errors' => $validator->errors()], 422);
        }

        $store->status = $request->status;
        if ($request->status === 'verified') {
            $store->verified_at = now();
        } else {
            $store->verified_at = null;
        }
        
        $store->save();
        
        return response()->json([
            'message' => 'Status toko berhasil diperbarui: ' . $request->status,
            'data' => $store
        ]);
    }
}
