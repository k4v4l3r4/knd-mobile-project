<?php

namespace App\Http\Controllers;

use App\Models\Tenant;
use App\Models\WilayahRt;
use App\Models\WilayahRw;
use App\Models\User;
use App\Services\TenantSeederService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class SaasAuthController extends Controller
{
    protected $seeder;

    public function __construct(TenantSeederService $seeder)
    {
        $this->seeder = $seeder;
    }

    /**
     * WEB: Register and Login to a new Demo Tenant
     */
    public function registerDemo(Request $request)
    {
        // 1. Create Tenant
        $tenant = Tenant::create([
            'name' => 'RT Demo ' . Str::random(5),
            'level' => 'RT',
            'tenant_type' => 'DEMO',
            'status' => 'DEMO',
            'trial_start_at' => now(),
            'trial_end_at' => now()->addHours(24),
        ]);

        // 1.1 Create RW
        $rw = WilayahRw::create([
            'tenant_id' => $tenant->id,
            'name' => 'RW 01 Demo',
            'code' => '001',
            'address' => 'Jl. Demo Raya',
        ]);

        // 1.2 Create RT
        $rt = WilayahRt::create([
            'tenant_id' => $tenant->id,
            'rw_id' => $rw->id,
            'rt_number' => '001',
            'rt_name' => 'RT 001 Demo',
            'address' => 'Jl. Demo Raya No. 1',
            'province' => 'DKI Jakarta',
            'city' => 'Jakarta Selatan',
            'district' => 'Tebet',
            'subdistrict' => 'Tebet Timur',
            'postal_code' => '12820',
        ]);

        // 2. Seed Data
        $seededData = $this->seeder->seedDemoTenant($tenant, $rt, $rw);

        // 3. Create Admin User
        $adminUser = User::create([
            'tenant_id' => $tenant->id,
            'name' => 'Admin Demo',
            'email' => 'admin.' . $tenant->id . '@demo.com',
            'phone' => '08' . mt_rand(10000000, 99999999) . mt_rand(10, 99), // Dummy unique phone
            'password' => Hash::make('password'),
            'role' => 'ADMIN_RT',
            'rt_id' => $rt->id,
            'rw_id' => $rw->id,
        ]);

        // 4. Determine User for Token
        $targetUser = $adminUser;
        if ($request->demo_role === 'WARGA' && !empty($seededData['warga'])) {
             $targetUser = $seededData['warga'][0];
        }

        // 5. Generate Token
        $token = $targetUser->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'Demo tenant created successfully',
            'token' => $token,
            'user' => $targetUser,
            'tenant' => $tenant,
        ]);
    }

    /**
     * WEB: Register Live Tenant Step 1 - Validate & Send OTP
     */
    public function registerLiveStep1(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'level' => 'required|in:RT,RW',
            'whatsapp' => 'required|string|unique:users,phone', // Check uniqueness against phone
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Send OTP (Mock for now)
        $otp = '123456'; 
        // In production: Send via WhatsApp API
        Log::info("OTP for {$request->whatsapp}: {$otp}");

        return response()->json([
            'message' => 'OTP sent successfully',
            'otp_debug' => $otp // Remove in production
        ]);
    }

    /**
     * WEB: Register Live Tenant Step 2 - Verify OTP & Create Tenant
     */
    public function registerLiveStep2(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'whatsapp' => 'required|string',
            'otp' => 'required|string',
            'name' => 'required|string',
            'level' => 'required|in:RT,RW',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        if ($request->otp !== '123456') {
            return response()->json(['message' => 'Invalid OTP'], 400);
        }

        // Create Tenant
        $tenant = Tenant::create([
            'name' => $request->name,
            'level' => $request->level,
            'tenant_type' => 'LIVE',
            'status' => 'TRIAL',
            'trial_start_at' => now(),
            'trial_end_at' => now()->addDays(7),
        ]);

        // Create Admin User
        $user = User::create([
            'tenant_id' => $tenant->id,
            'name' => 'Admin ' . $request->name,
            'email' => $request->whatsapp . '@rt-online.id', // Generate dummy email
            'phone' => $request->whatsapp,
            'password' => Hash::make(Str::random(10)), // Random password
            'role' => $request->level === 'RT' ? 'ADMIN_RT' : 'ADMIN_RW',
        ]);

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'Live tenant created successfully',
            'token' => $token,
            'user' => $user,
            'tenant' => $tenant,
        ]);
    }

    /**
     * MOBILE: Login with OTP
     */
    public function loginOtp(Request $request)
    {
        $request->validate([
            'whatsapp' => 'required|string',
            'otp' => 'sometimes|string', // If first step, OTP not needed? Or 2-step?
            // User flow: Input WA -> Send OTP -> Input OTP -> Login
            // This endpoint handles the FINAL login step.
        ]);

        if (!$request->has('otp')) {
            // Step 1: Send OTP
            $user = User::where('phone', $request->whatsapp)->first();
            if (!$user) {
                return response()->json(['message' => 'User not found'], 404);
            }
            
            // Send OTP
            $otp = '123456';
            return response()->json(['message' => 'OTP sent', 'otp_debug' => $otp]);
        }

        // Step 2: Verify OTP
        if ($request->otp !== '123456') {
             return response()->json(['message' => 'Invalid OTP'], 400);
        }

        $user = User::where('phone', $request->whatsapp)->with('tenant')->first();
        if (!$user) {
            return response()->json(['message' => 'User not found'], 404);
        }

        // Check Tenant Status logic (handled in Middleware usually, but here we can check for login denial)
        // User says: "EXPIRED -> Read-only + redirect billing". So Login is ALLOWED.
        
        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'Login successful',
            'token' => $token,
            'user' => $user,
            'tenant' => $user->tenant,
        ]);
    }

    /**
     * MOBILE: Shared Demo Login
     */
    public function mobileDemoLogin()
    {
        // Find or create a SHARED demo tenant
        $tenant = Tenant::where('tenant_type', 'DEMO')
                        ->where('name', 'SHARED_DEMO_MOBILE')
                        ->first();

        if (!$tenant) {
            $tenant = Tenant::create([
                'name' => 'SHARED_DEMO_MOBILE',
                'level' => 'RT',
                'tenant_type' => 'DEMO',
                'status' => 'DEMO',
                'trial_start_at' => now(),
                'trial_end_at' => now()->addYears(10), // Long life
            ]);
            
            // Create RW/RT for shared demo
            $rw = WilayahRw::create([
                'tenant_id' => $tenant->id,
                'name' => 'RW 01 Demo',
                'code' => '001',
                'address' => 'Jl. Demo Raya',
            ]);

            $rt = WilayahRt::create([
                'tenant_id' => $tenant->id,
                'rw_id' => $rw->id,
                'rt_number' => '001',
                'rt_name' => 'RT 001 Demo',
                'address' => 'Jl. Demo Raya No. 1',
                'province' => 'DKI Jakarta',
                'city' => 'Jakarta Selatan',
                'district' => 'Tebet',
                'subdistrict' => 'Tebet Timur',
                'postal_code' => '12820',
            ]);

            $this->seeder->seedDemoTenant($tenant, $rt, $rw);
        }

        // Find a demo user
        $user = User::where('tenant_id', $tenant->id)->first();
        
        if (!$user) {
             // Create if missing
             $rt = $tenant->wilayah_rt()->first();
             // Note: if tenant was created but user deleted, rt might exist.
             // If tenant exists but RT missing (e.g. from before fix), we might crash here if we don't check.
             // But for now assuming clean slate or consistent state.
             
             $user = User::create([
                'tenant_id' => $tenant->id,
                'name' => 'Mobile Demo User',
                'email' => 'mobile.demo@example.com',
                'phone' => '080000000000',
                'password' => Hash::make('password'),
                'role' => 'WARGA_TETAP', // View as Warga
                'rt_id' => $rt ? $rt->id : null,
                'rw_id' => $rt ? $rt->rw_id : null,
            ]);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'Login to Mobile Demo successful',
            'token' => $token,
            'user' => $user,
            'tenant' => $tenant,
        ]);
    }

    public function checkTenantStatus(Request $request)
    {
        $user = $request->user();
        if (!$user->tenant) {
            return response()->json(['status' => 'NO_TENANT']);
        }
        return response()->json(['status' => $user->tenant->status, 'tenant' => $user->tenant]);
    }
}
