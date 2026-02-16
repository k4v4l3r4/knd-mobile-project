<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;

use App\Models\WilayahRt;
use App\Models\WilayahRw;
use App\Models\Wallet;
use App\Models\Fee;
use App\Models\ActivityCategory;
use App\Models\Announcement;
use App\Models\Asset;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string',
            'phone' => 'required|string|unique:users',
            'email' => 'nullable|email|unique:users',
            'password' => 'required|string|min:6',
            'rt_id' => 'nullable|exists:wilayah_rt,id',
            'invite_code' => 'nullable|exists:wilayah_rt,invite_code',
        ]);

        $rtId = $validated['rt_id'] ?? null;

        if (!$rtId && !empty($validated['invite_code'])) {
            $rt = WilayahRt::where('invite_code', $validated['invite_code'])->first();
            if ($rt) {
                $rtId = $rt->id;
            }
        }

        if (!$rtId) {
             return response()->json([
                'success' => false,
                'message' => 'RT ID or valid Invite Code is required',
            ], 422);
        }

        // Get RW ID from RT
        $rt = WilayahRt::find($rtId);
        $rwId = $rt ? $rt->rw_id : null;

        $user = User::create([
            'name' => $validated['name'],
            'phone' => $validated['phone'],
            'email' => $validated['email'] ?? null,
            'password' => Hash::make($validated['password']),
            'rt_id' => $rtId,
            'rw_id' => $rwId,
            'role' => 'WARGA_TETAP', 
        ]);

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'User registered successfully',
            'data' => [
                'user' => $user,
                'token' => $token,
            ],
        ], 201);
    }

    public function registerRt(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string',
            'phone' => 'required|string|unique:users',
            'password' => 'required|string|min:6',
            'rt_number' => 'required|string',
            'rw_number' => 'required|string',
            'rt_name' => 'nullable|string',
        ]);

        // Auto-create or find RW based on input
        // Format code: RW + number (e.g. RW005)
        $rwNumber = str_pad($validated['rw_number'], 3, '0', STR_PAD_LEFT);
        $rwCode = 'RW' . $rwNumber;
        
        // Check for existing RW (including soft deleted)
        $rw = WilayahRw::withTrashed()->where('code', $rwCode)->first();

        if ($rw) {
            if ($rw->trashed()) {
                $rw->restore();
            }
        } else {
            $rw = WilayahRw::create([
                'code' => $rwCode,
                'name' => 'RW ' . $validated['rw_number'],
                'subscription_status' => 'ACTIVE'
            ]);
        }

        // Create RT
        $rt = WilayahRt::create([
            'rw_id' => $rw->id,
            'rt_number' => $validated['rt_number'],
            'rt_name' => $validated['rt_name'] ?? ('RT ' . $validated['rt_number']),
            'kas_balance' => 0,
            'invite_code' => strtoupper(Str::random(6)), // Generate invite code
        ]);

        // Create Admin User
        $user = User::create([
            'name' => $validated['name'],
            'phone' => $validated['phone'],
            'password' => Hash::make($validated['password']),
            'rt_id' => $rt->id,
            'rw_id' => $rw->id,
            'role' => 'ADMIN_RT',
        ]);

        // Initialize Basic Data (Wallets, Fees)
        Wallet::create(['rt_id' => $rt->id, 'name' => 'Kas Tunai RT', 'type' => 'CASH', 'balance' => 0]);
        Fee::create(['rt_id' => $rt->id, 'name' => 'Iuran Kebersihan', 'amount' => 25000, 'is_mandatory' => true]);
        Fee::create(['rt_id' => $rt->id, 'name' => 'Iuran Keamanan', 'amount' => 15000, 'is_mandatory' => true]);
        ActivityCategory::create(['rt_id' => $rt->id, 'name' => 'Kerja Bakti']);
        ActivityCategory::create(['rt_id' => $rt->id, 'name' => 'Rapat RT']);

        // Seed Announcement
        Announcement::create([
            'rt_id' => $rt->id,
            'title' => 'Selamat Datang di RT Online!',
            'content' => 'Selamat datang di aplikasi manajemen RT. Gunakan aplikasi ini untuk mengelola warga, keuangan, dan kegiatan RT dengan mudah.',
            'status' => 'PUBLISHED',
        ]);

        // Seed Assets
        Asset::create([
            'rt_id' => $rt->id,
            'name' => 'Kursi Lipat',
            'description' => 'Kursi lipat besi untuk kegiatan warga',
            'total_quantity' => 50,
            'available_quantity' => 50,
            'condition' => 'GOOD',
        ]);

        Asset::create([
            'rt_id' => $rt->id,
            'name' => 'Tenda Terop',
            'description' => 'Tenda ukuran 4x6 meter',
            'total_quantity' => 2,
            'available_quantity' => 2,
            'condition' => 'GOOD',
        ]);

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'RT registered successfully',
            'data' => [
                'user' => $user,
                'token' => $token,
                'rt' => $rt,
            ],
        ], 201);
    }

    public function getInviteCode(Request $request)
    {
        $user = $request->user();
        if ($user->role !== 'ADMIN_RT' || !$user->rt_id) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $rt = WilayahRt::find($user->rt_id);
        if (!$rt->invite_code) {
            $rt->invite_code = strtoupper(Str::random(6));
            $rt->save();
        }

        return response()->json([
            'success' => true,
            'data' => [
                'invite_code' => $rt->invite_code,
                'rt_name' => $rt->rt_name,
            ]
        ]);
    }

    public function forgotPassword(Request $request)
    {
        $validated = $request->validate([
            'phone' => 'required|string',
        ]);

        $user = User::where('phone', $validated['phone'])->first();

        if (!$user) {
             return response()->json([
                'success' => false,
                'message' => 'User not found',
            ], 404);
        }

        // Mock sending OTP logic here
        // In a real app, we would generate OTP, save to DB/Cache, and call WhatsApp API

        return response()->json([
            'success' => true,
            'message' => 'OTP sent successfully',
        ]);
    }

    public function verifyOtp(Request $request)
    {
        $validated = $request->validate([
            'phone' => 'required|string',
            'otp' => 'required|string|size:6',
        ]);

        $user = User::where('phone', $validated['phone'])->first();

        if (!$user) {
             return response()->json([
                'success' => false,
                'message' => 'User not found',
            ], 404);
        }

        // Mock OTP verification logic
        // In reality, check against DB/Cache
        if ($validated['otp'] !== '123456') { // Mock OTP
            return response()->json([
                'success' => false,
                'message' => 'Kode yang dimasukkan kurang tepat. Coba cek lagi WhatsApp Anda.',
            ], 422);
        }

        // Create a temporary token for password reset or just return success
        // For this flow, we might return a token that allows password reset
        $token = $user->createToken('reset_token')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'OTP verified successfully',
            'data' => [
                'token' => $token
            ]
        ]);
    }

    public function resetPassword(Request $request)
    {
        $validated = $request->validate([
            'phone' => 'required|string',
            'password' => 'required|string|min:6',
            'token' => 'required|string', // In real app, verify this token
        ]);

        $user = User::where('phone', $validated['phone'])->first();

        if (!$user) {
             return response()->json([
                'success' => false,
                'message' => 'User not found',
            ], 404);
        }

        // Update password
        $user->password = Hash::make($validated['password']);
        $user->save();
        
        // Revoke all tokens to force re-login everywhere else? 
        // Or keep the current session. 
        // For this flow, we'll return a new auth token for immediate login.
        $user->tokens()->delete();
        $newToken = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'Password reset successfully',
            'data' => [
                'token' => $newToken,
                'user' => $user
            ]
        ]);
    }

    public function login(LoginRequest $request)
    {
        $validated = $request->validated();

        $user = User::withTrashed()->where('phone', $validated['phone'])->first();

        // Check if user exists and is inactive (soft deleted)
        if ($user && $user->trashed()) {
            return response()->json([
                'success' => false,
                'message' => 'Akun Anda saat ini tidak aktif. Hubungi Admin RW.',
                'data' => null,
            ], 403);
        }

        if (! $user || ! Hash::check($validated['password'], $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid login credentials',
                'data' => null,
            ], 401);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'Login successful',
            'data' => [
                'user' => $user,
                'token' => $token,
            ],
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'success' => true,
            'message' => 'Logged out successfully',
            'data' => null,
        ]);
    }

    public function me(Request $request)
    {
        $user = $request->user()->load(['rt', 'rw', 'userRole.permissions']);
        
        // Ensure role string is available for frontend compatibility
        // Always prioritize the role from the relationship if it exists
        if ($user->userRole) {
            $user->role = $user->userRole->role_code;
            $user->permissions_list = $user->userRole->permissions->pluck('permission_code');
        } else {
             $user->permissions_list = [];
        }

        return response()->json([
            'success' => true,
            'message' => 'User profile retrieved successfully',
            'data' => $user,
        ]);
    }
}
