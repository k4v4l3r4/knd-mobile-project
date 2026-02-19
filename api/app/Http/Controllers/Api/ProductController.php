<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Support\PaymentSettings;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

use App\Http\Resources\ProductResource;

class ProductController extends Controller
{
    /**
     * Display a listing of the resource (Marketplace).
     * Rule: Warga melihat semua UMKM dalam RW (Status APPROVED_RT/Verified).
     */
    public function index(Request $request)
    {
        $user = $request->user('sanctum');
        $scope = PaymentSettings::getUmkmScope();
        
        $query = Product::with(['user:id,name,phone,photo_url', 'store'])
            ->where('is_available', true)
            ->whereHas('store', function($q) {
                $q->where('status', 'verified');
            });

        if ($scope === 'RW' && $user && $user->rw_id) {
            $query->whereHas('store.rt', function($q) use ($user) {
                $q->where('rw_id', $user->rw_id);
            });
        }
        
        if ($request->filled('search')) {
            $search = trim((string) $request->input('search'));

            if ($search !== '') {
                $searchLower = Str::lower($search);
                $like = "%{$searchLower}%";

                $query->where(function($q) use ($like) {
                    $q->whereRaw('LOWER(name) LIKE ?', [$like])
                      ->orWhereRaw('LOWER(description) LIKE ?', [$like])
                      ->orWhereHas('user', function($uq) use ($like) {
                          $uq->whereRaw('LOWER(name) LIKE ?', [$like])
                             ->orWhereRaw('LOWER(phone) LIKE ?', [$like]);
                      })
                      ->orWhereHas('store', function($sq) use ($like) {
                          $sq->whereRaw('LOWER(name) LIKE ?', [$like]);
                      });
                });
            }
        }
        
        $products = $query->latest()->get();
            
        return response()->json([
            'message' => 'Data produk berhasil diambil',
            'data' => ProductResource::collection($products)
        ]);
    }

    /**
     * Display products owned by the authenticated user.
     */
    public function myProducts(Request $request)
    {
        $products = Product::where('user_id', $request->user()->id)
            ->latest()
            ->get();

        return response()->json([
            'message' => 'Produk saya berhasil diambil',
            'data' => $products
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $user = $request->user();
        
        // Check if user has a store and if it is verified
        if (!$user->store) {
            return response()->json(['message' => 'Anda belum memiliki toko. Silahkan buat toko terlebih dahulu.'], 403);
        }

        if ($user->store->status !== 'verified') {
            return response()->json(['message' => 'Toko Anda belum disetujui Pak RT'], 403);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'description' => 'required|string',
            'price' => 'required|numeric|min:0',
            'discount_price' => 'nullable|numeric|min:0|lt:price', // Must be less than original price
            'category' => 'nullable|string', // Optional now
            'whatsapp' => 'nullable|string|max:20', // Optional now
            'shopee_url' => 'nullable|url',
            'tokopedia_url' => 'nullable|url',
            'facebook_url' => 'nullable|url',
            'instagram_url' => 'nullable|url',
            'tiktok_url' => 'nullable|url',
            'image' => 'nullable|image|max:2048', // Max 2MB (Legacy single image)
            'images.*' => 'nullable|image|max:2048', // Array of images
            'images' => 'nullable|array|max:3', // Max 3 images
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validasi gagal',
                'errors' => $validator->errors()
            ], 422);
        }

        $data = $request->only([
            'name', 'description', 'price', 'discount_price', 'category', 'whatsapp',
            'shopee_url', 'tokopedia_url', 'facebook_url', 'instagram_url', 'tiktok_url'
        ]);
        $data['user_id'] = $user->id;
        $data['rt_id'] = $user->rt_id; // Assign to user's RT
        $data['store_id'] = $user->store->id; // Assign to user's Store
        $data['is_available'] = true;

        // If whatsapp is empty, use user's phone
        if (empty($data['whatsapp'])) {
             $data['whatsapp'] = $user->phone;
        }

        // Handle Images
        $imagePaths = [];
        
        // 1. Handle legacy single 'image' upload (if provided)
        if ($request->hasFile('image')) {
            $path = $request->file('image')->store('products', 'public');
            $imagePaths[] = $path;
        }

        // 2. Handle multiple 'images' upload
        if ($request->hasFile('images')) {
            foreach ($request->file('images') as $file) {
                $path = $file->store('products', 'public');
                $imagePaths[] = $path;
            }
        }

        // Store unique paths
        $imagePaths = array_unique($imagePaths);
        
        // Save to DB
        if (!empty($imagePaths)) {
            $data['image_url'] = $imagePaths[0]; // Primary image
            $data['images'] = $imagePaths; // All images
        }

        $product = Product::create($data);

        return response()->json([
            'message' => 'Produk berhasil ditambahkan',
            'data' => new ProductResource($product)
        ], 201);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Product $product)
    {
        $user = $request->user();

        if ($product->user_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'string|max:255',
            'description' => 'string',
            'price' => 'numeric|min:0',
            'discount_price' => 'nullable|numeric|min:0|lt:price',
            'is_available' => 'boolean',
            'shopee_url' => 'nullable|url',
            'tokopedia_url' => 'nullable|url',
            'facebook_url' => 'nullable|url',
            'instagram_url' => 'nullable|url',
            'tiktok_url' => 'nullable|url',
            'image' => 'nullable|image|max:2048',
            'images.*' => 'nullable|image|max:2048',
            'images' => 'nullable|array|max:3',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validasi gagal',
                'errors' => $validator->errors()
            ], 422);
        }

        $data = $request->only([
            'name', 'description', 'price', 'discount_price', 'category', 'whatsapp', 'is_available',
            'shopee_url', 'tokopedia_url', 'facebook_url', 'instagram_url', 'tiktok_url'
        ]);

        // Handle Images Update
        $currentImages = $product->images ?? ($product->image_url ? [$product->image_url] : []);
        $newImages = [];

        if ($request->hasFile('image')) {
             $path = $request->file('image')->store('products', 'public');
             $newImages[] = $path;
        }

        if ($request->hasFile('images')) {
            foreach ($request->file('images') as $file) {
                $path = $file->store('products', 'public');
                $newImages[] = $path;
            }
        }

        if (!empty($newImages)) {
            // Merge and keep max 3
            $allImages = array_merge($currentImages, $newImages);
            $allImages = array_slice($allImages, 0, 3); // Limit to 3
            
            $data['images'] = $allImages;
            $data['image_url'] = $allImages[0]; // Update primary
        }

        $product->update($data);

        return response()->json([
            'message' => 'Produk berhasil diperbarui',
            'data' => $product
        ]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Product $product)
    {
        $user = request()->user();

        // Check authorization: Owner OR Admin RT (Moderation)
        // Admin RW is explicitly READ ONLY.
        
        $isOwner = $product->user_id === $user->id;
        $isAdminRT = $user->role === 'ADMIN_RT' && $product->rt_id === $user->rt_id;
        $isSuperAdmin = $user->role === 'SUPER_ADMIN';
        
        if (!$isOwner && !$isAdminRT && !$isSuperAdmin) {
            return response()->json([
                'message' => 'Anda tidak memiliki akses untuk menghapus produk ini'
            ], 403);
        }

        // Delete image if exists
        if ($product->image_url) {
            Storage::disk('public')->delete($product->image_url);
        }
        
        if (!empty($product->images)) {
             foreach ($product->images as $img) {
                 Storage::disk('public')->delete($img);
             }
        }

        $product->delete();

        return response()->json([
            'message' => 'Produk berhasil dihapus'
        ]);
    }
}
