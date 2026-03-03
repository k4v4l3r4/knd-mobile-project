<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Store;
use App\Models\Notification;
use App\Models\User;
use App\Http\Resources\StoreResource;
use App\Support\PaymentSettings;
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
        $store = Store::with(['products', 'user', 'rt:id,city'])->where('user_id', $request->user()->id)->first();
        
        if (!$store) {
            return response()->json([
                'message' => 'Anda belum memiliki toko',
                'data' => null
            ]);
        }
        
        return response()->json([
            'message' => 'Data toko berhasil diambil',
            'data' => new StoreResource($store)
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

        // Handle multipart/form-data JSON fields
        if ($request->has('operating_hours') && is_string($request->operating_hours)) {
            $decoded = json_decode($request->operating_hours, true);
            if (json_last_error() === JSON_ERROR_NONE) {
                $request->merge(['operating_hours' => $decoded]);
            }
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'category' => 'nullable|string|in:FOOD,FASHION,ELECTRONIC,HOUSEHOLD,SERVICE,BEAUTY,HOBBY,AUTOMOTIVE,GOODS',
            'contact' => 'required|string|max:20',
            'address' => 'nullable|string',
            'image' => 'nullable|image|max:2048',
            'is_open' => 'boolean', // Manual switch
            'operating_hours' => 'nullable|array', // JSON Schedule
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validasi gagal',
                'errors' => $validator->errors()
            ], 422);
        }

        $data = $request->only(['name', 'description', 'category', 'contact', 'address', 'is_open', 'operating_hours']);
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

        // --- Notification Logic ---
        // 1. Notify User (Warga)
        Notification::create([
            'notifiable_id' => $user->id,
            'notifiable_type' => User::class,
            'title' => 'Pendaftaran Toko',
            'message' => "Toko {$store->name} berhasil didaftarkan dan sedang menunggu review Admin",
            'type' => 'STORE_REGISTRATION',
            'related_id' => $store->id,
            'is_read' => false,
            'tenant_id' => $user->tenant_id,
        ]);

        // 2. Notify Admin RT
        // Find Admin RT in the same RT
        $admins = User::where('rt_id', $user->rt_id)
            ->whereIn('role', ['ADMIN_RT', 'RT'])
            ->get();

        foreach ($admins as $admin) {
            Notification::create([
                'notifiable_id' => $admin->id,
                'notifiable_type' => User::class,
                'title' => 'Pendaftaran Toko Baru',
                'message' => "Warga {$user->name} mendaftarkan toko {$store->name}. Menunggu verifikasi.",
                'type' => 'STORE_REGISTRATION',
                'related_id' => $store->id,
                'is_read' => false,
                'tenant_id' => $user->tenant_id, // Ensure tenant consistency
            ]);
        }
        // --- End Notification Logic ---

        return response()->json([
            'message' => 'Toko berhasil dibuat. Menunggu persetujuan Admin RT.',
            'data' => new StoreResource($store)
        ], 201);
    }

    /**
     * Update store
     * Warga hanya bisa edit milik sendiri.
     */
    public function update(Request $request, Store $store)
    {
        $user = $request->user();

        // Validasi Kepemilikan: Owner OR Admin RT
        $isOwner = $store->user_id === $user->id;
        $isAdminRT = $user->role === 'ADMIN_RT' && $store->rt_id === $user->rt_id;

        if (!$isOwner && !$isAdminRT) {
            return response()->json(['message' => 'Unauthorized. Anda hanya bisa mengedit toko milik sendiri atau warga RT Anda.'], 403);
        }

        // Handle multipart/form-data JSON fields
        if ($request->has('operating_hours') && is_string($request->operating_hours)) {
            $decoded = json_decode($request->operating_hours, true);
            if (json_last_error() === JSON_ERROR_NONE) {
                $request->merge(['operating_hours' => $decoded]);
            }
        }

        $validator = Validator::make($request->all(), [
            'name' => 'string|max:255',
            'description' => 'nullable|string',
            'category' => 'nullable|string|in:FOOD,FASHION,ELECTRONIC,HOUSEHOLD,SERVICE,BEAUTY,HOBBY,AUTOMOTIVE,GOODS',
            'contact' => 'nullable|string|max:20',
            'address' => 'nullable|string',
            'image' => 'nullable|image|max:2048',
            'is_open' => 'boolean',
            'operating_hours' => 'nullable|array',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validasi gagal',
                'errors' => $validator->errors()
            ], 422);
        }

        $data = $request->only(['name', 'description', 'category', 'contact', 'address', 'is_open', 'operating_hours']);

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
            'data' => new StoreResource($store)
        ]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Request $request, Store $store)
    {
        $user = $request->user();

        // Check if user is authorized
        $isOwner = $store->user_id === $user->id;
        $isAdminRT = $user->role === 'ADMIN_RT' && $store->rt_id === $user->rt_id; // Must be SAME RT

        if (!$isOwner && !$isAdminRT) {
             return response()->json(['message' => 'Unauthorized. Anda hanya bisa menghapus toko milik sendiri atau warga RT Anda.'], 403);
        }

        // Hapus Gambar Toko
        if ($store->image_url && !str_starts_with($store->image_url, 'http')) {
            Storage::disk('public')->delete($store->image_url);
        }

        // Hapus Produk Terkait (dan gambarnya)
        foreach ($store->products as $product) {
            if ($product->image_url && !str_starts_with($product->image_url, 'http')) {
                Storage::disk('public')->delete($product->image_url);
            }
            if ($product->images) {
                foreach ($product->images as $img) {
                    if ($img && !str_starts_with($img, 'http')) {
                        Storage::disk('public')->delete($img);
                    }
                }
            }
            $product->delete();
        }

        $store->delete();

        return response()->json(['message' => 'Toko berhasil dihapus']);
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
        $scope = PaymentSettings::getUmkmScope();
        $gatewayChannel = PaymentSettings::getGateway('umkm');
        $query = Store::with(['user', 'products', 'rt:id,city']);
        
        if ($user->role === 'ADMIN_RT') {
            $query->where('rt_id', $user->rt_id);
            
            if ($request->has('status')) {
                $query->where('status', $request->status);
            }
        } 
        elseif ($user->role === 'ADMIN_RW') {
            $query->whereHas('rt', function($q) use ($user) {
                $q->where('rw_id', $user->rw_id);
            });

            if ($request->has('status')) {
                $query->where('status', $request->status);
            }
        } 
        else {
            if ($scope === 'RW') {
                $query->whereHas('rt', function($q) use ($user) {
                    $q->where('rw_id', $user->rw_id);
                });
            }
            $query->where('status', 'verified');
        }
        
        $stores = $query->latest()->get();
        
        return response()->json([
            'message' => 'Data toko berhasil diambil',
            'data' => StoreResource::collection($stores),
            'gateway_channel' => $gatewayChannel
        ]);
    }

    public function verify(Request $request, Store $store)
    {
        $user = $request->user();
        
        // Strict RT check: Admin RT can ONLY verify stores in their own RT
        if ($user->role !== 'ADMIN_RT' || $store->rt_id !== $user->rt_id) {
             return response()->json(['message' => 'Unauthorized. Anda hanya bisa memverifikasi toko di RT Anda.'], 403);
        }
        
        $validator = Validator::make($request->all(), [
            'status' => 'required|in:verified,rejected',
        ]);
        
        if ($validator->fails()) {
            return response()->json(['message' => 'Invalid status'], 422);
        }
        
        $store->update([
            'status' => $request->status,
            'verified_at' => $request->status === 'verified' ? now() : null
        ]);
        
        return response()->json([
            'message' => 'Status toko diperbarui',
            'data' => new StoreResource($store)
        ]);
    }
}
