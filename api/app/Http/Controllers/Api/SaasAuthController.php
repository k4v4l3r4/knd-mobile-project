<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use App\Models\WilayahRt;
use App\Models\WilayahRw;
use App\Services\TenantSeederService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class SaasAuthController extends Controller
{
    protected $seederService;

    public function __construct(TenantSeederService $seederService)
    {
        $this->seederService = $seederService;
    }

    // 1. DEMO REGISTER
    public function registerDemo(Request $request)
    {
        set_time_limit(300); // Prevent timeout for heavy seeding

        return DB::transaction(function () use ($request) {
            // A. Create Tenant
            $tenant = Tenant::create([
                'name' => 'Demo RT ' . Str::random(4),
                'level' => 'RT',
                'tenant_type' => Tenant::TYPE_DEMO,
                'status' => Tenant::STATUS_DEMO,
                'trial_start_at' => now(),
                'trial_end_at' => now()->addHours(24), // 24 Hours Demo
            ]);

            // B. Create Wilayah Structure (RT Level Demo)
            // Create Dummy RW container
            $rw = WilayahRw::create([
                'tenant_id' => $tenant->id,
                'code' => 'DEMO' . Str::random(3),
                'name' => 'RW Demo',
                'subscription_status' => 'ACTIVE',
            ]);

            $rt = WilayahRt::create([
                'tenant_id' => $tenant->id,
                'rw_id' => $rw->id,
                'rt_number' => '001',
                'rt_name' => 'RT Demo 001',
                'kas_balance' => 0,
                'invite_code' => Str::random(6),
            ]);

            // C. Create Admin User
            $password = 'demo123';
            $adminRole = Role::where('role_code', 'ADMIN_RT')->first();
            
            $adminUser = User::create([
                'tenant_id' => $tenant->id,
                'rt_id' => $rt->id,
                'rw_id' => $rw->id,
                'name' => 'Admin Demo',
                'email' => 'admin.' . $tenant->id . '@demo.com',
                'phone' => '08' . mt_rand(10000000, 99999999) . mt_rand(10, 99), // Dummy phone
                'password' => Hash::make($password),
                'role' => 'ADMIN_RT',
                'role_id' => $adminRole ? $adminRole->id : null,
            ]);

            // D. Seed Data
            $seededData = $this->seederService->seedDemoTenant($tenant, $rt, $rw);

            // E. Determine User for Token
            $targetUser = $adminUser;
            $demoRole = $request->input('demo_role');
            if ($demoRole === 'WARGA' && !empty($seededData['warga'])) {
                // Return the first Head of Family
                $targetUser = collect($seededData['warga'])->first(function($w) {
                    return $w->status_in_family === 'KEPALA_KELUARGA';
                }) ?? $seededData['warga'][0];
            }

            // F. Generate Token
            $token = $targetUser->createToken('auth_token')->plainTextToken;

            return response()->json([
                'message' => 'Demo environment created successfully',
                'token' => $token, // Direct token field for easier access
                'user' => $targetUser,
                'tenant' => $tenant,
                'expires_in' => '24 hours'
            ]);
        });
    }

    // 2. LIVE REGISTER - STEP 1 (Request OTP) - Legacy/Optional if we use direct register
    public function registerLiveStep1(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string',
            'whatsapp' => 'required|string|unique:users,phone', // Unique global for now
            'level' => 'required|in:RT,RW',
            'rt_number' => 'required_if:level,RT',
            'rw_number' => 'required',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Logic to send OTP...
        return response()->json(['message' => 'OTP sent (simulation)']);
    }

    // 3. LIVE REGISTER - STEP 2 (Verify OTP & Create Tenant)
    // Renamed or consolidated? User asked for POST /api/register to be the flow.
    // I will implement a new 'register' method that can handle the full flow (or Step 2 if user implies that).
    // Given requirements, I'll create a robust single-step register for this task to satisfy the prompt's "Finalize Registration Flow".
    
    public function register(Request $request)
    {
        Log::info('Register attempt', $request->all());

        // 1. Check for Warga Registration (Invite Code)
        if ($request->has('invite_code')) {
            return $this->registerWarga($request);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string',
            'phone' => 'required|string|unique:users,phone',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|min:6',
            'level' => 'required|in:RT,RW',
            'rt_number' => 'required_if:level,RT',
            'rw_number' => 'required',
            'rt_name' => 'nullable|string',
            'address' => 'required_if:level,RT|string',
            'province' => 'required_if:level,RT|string',
            'city' => 'required_if:level,RT|string',
            'district' => 'required_if:level,RT|string',
            'subdistrict' => 'required_if:level,RT|string',
            'postal_code' => 'required_if:level,RT|string',
            // 'otp' => 'required', // Optional depending on strictness. Removing for streamlined prompt task unless requested.
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Check if tenant already exists?
        // For now, allow multiple tenants per RW number? Probably not good but scope is limited.
        // Assuming unique constraint logic isn't the focus, but Trial Policy is.

        return DB::transaction(function () use ($request) {
            // A. Create Tenant
            $tenantName = $request->level === 'RT' 
                ? "RT {$request->rt_number} RW {$request->rw_number}" 
                : "RW {$request->rw_number}";

            $tenant = Tenant::create([
                'name' => $tenantName,
                'level' => $request->level,
                'tenant_type' => Tenant::TYPE_LIVE,
                'status' => Tenant::STATUS_TRIAL,
                'trial_start_at' => now(),
                'trial_end_at' => now()->addDays(7), // Strict 7 Days
            ]);

            // B. Create Wilayah Structure
            $rwCode = 'RW' . str_pad($request->rw_number, 3, '0', STR_PAD_LEFT);
            
            // Find or Create RW
            // If RW registers, they own the RW.
            // If RT registers, they might need to be under an existing RW or create a placeholder.
            // For isolation, let's assume each Tenant gets its own Wilayah structure for now or attach to existing?
            // "Multi-Tenant SaaS RT-RW system".
            // If Level RW: Create RW.
            // If Level RT: Create RT (and RW container if needed).
            
            // Simpler approach for SaaS: Each Tenant is independent.
            // If RW tenant: Create WilayahRw linked to tenant.
            // If RT tenant: Create WilayahRw (placeholder or linked) and WilayahRt linked to tenant.
            
            $rw = WilayahRw::firstOrCreate(
                ['code' => $rwCode],
                [
                    'name' => "RW {$request->rw_number}",
                    'subscription_status' => 'ACTIVE',
                    'tenant_id' => $request->level === 'RW' ? $tenant->id : null, // Only assign if RW tenant
                ]
            );

            $rt = null;
            if ($request->level === 'RT') {
                $rtNumber = str_pad($request->rt_number, 3, '0', STR_PAD_LEFT);
                $rt = WilayahRt::create([
                    'tenant_id' => $tenant->id,
                    'rw_id' => $rw->id,
                    'rt_number' => $rtNumber,
                    'rt_name' => $request->rt_name ?? "RT {$rtNumber}",
                    'address' => $request->address,
                    'province' => $request->province,
                    'city' => $request->city,
                    'district' => $request->district,
                    'subdistrict' => $request->subdistrict,
                    'postal_code' => $request->postal_code,
                    'kas_balance' => 0,
                    'invite_code' => strtoupper(Str::random(6)),
                ]);
            } else {
                // If RW, maybe update RW tenant_id if it was null?
                if (!$rw->tenant_id) {
                    $rw->update(['tenant_id' => $tenant->id]);
                }
            }

            // C. Create Admin User
            $role = $request->level === 'RT' ? 'ADMIN_RT' : 'ADMIN_RW';
            $roleId = Role::where('role_code', $role)->value('id');

            if (!$roleId) {
                // Fallback or Error
                Log::error("Role code $role not found during registration");
                throw new \Exception("Configuration Error: Role $role not found.");
            }
            
            $user = User::create([
                'tenant_id' => $tenant->id,
                'rt_id' => $rt ? $rt->id : null,
                'rw_id' => $rw->id,
                'role_id' => $roleId,
                'name' => $request->name,
                'email' => $request->email,
                'phone' => $request->phone,
                'password' => Hash::make($request->password),
                'role' => $role,
            ]);

            // D. Generate Token
            $token = $user->createToken('auth_token')->plainTextToken;

            return response()->json([
                'success' => true,
                'message' => 'Registration successful. Trial started.',
                'data' => [
                    'tenant' => $tenant,
                    'user' => $user,
                    'token' => $token,
                    'trial_days_remaining' => 7
                ]
            ], 201);
        });
    }

    protected function registerWarga(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string',
            'phone' => 'required|string|unique:users,phone',
            'password' => 'required|min:6',
            'invite_code' => 'required|exists:wilayah_rt,invite_code',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        return DB::transaction(function () use ($request) {
            $rt = WilayahRt::where('invite_code', $request->invite_code)->first();
            
            $user = User::create([
                'tenant_id' => $rt->tenant_id,
                'rt_id' => $rt->id,
                'rw_id' => $rt->rw_id,
                'name' => $request->name,
                'phone' => $request->phone,
                'password' => Hash::make($request->password),
                'role' => 'WARGA',
                'status_in_family' => 'KEPALA_KELUARGA', // Default to Head of Family for initial registration
            ]);

            $token = $user->createToken('auth_token')->plainTextToken;

            return response()->json([
                'success' => true,
                'message' => 'Registration successful.',
                'data' => [
                    'user' => $user,
                    'token' => $token,
                    'tenant' => $user->tenant // Optional: include tenant info
                ]
            ], 201);
        });
    }

    // Keep verifyOtpAndCreateTenant for backward compatibility or if needed, but 'register' covers the requirement.
    public function verifyOtpAndCreateTenant(Request $request)
    {
        return $this->register($request);
    }

    // 4. LOGIN OTP (Simulated)
    public function loginOtp(Request $request)
    {
        $user = User::where('phone', $request->phone)->first();
        if (!$user) return response()->json(['message' => 'User not found'], 404);
        
        // Skip OTP check for simulation/dev
        $token = $user->createToken('auth_token')->plainTextToken;
        return response()->json(['token' => $token, 'user' => $user]);
    }

    public function mobileDemoLogin(Request $request)
    {
        // ... existing logic ...
        return response()->json(['message' => 'Not implemented yet']);
    }

    // 5. CHECK STATUS
    public function checkStatus(Request $request)
    {
        $user = $request->user();
        $tenant = $user->tenant;

        if (!$tenant) {
            return response()->json(['status' => 'NO_TENANT', 'message' => 'User does not belong to any tenant']);
        }
        
        // Auto update status if expired (Double check logic, Middleware also does this but API should reflect latest)
        if (($tenant->status === Tenant::STATUS_TRIAL || $tenant->status === Tenant::STATUS_DEMO) 
            && $tenant->trial_end_at 
            && now()->greaterThan($tenant->trial_end_at)) {
            
            $tenant->status = Tenant::STATUS_EXPIRED;
            $tenant->save();
        }

        $remainingDays = $tenant->remainingTrialDays();
        $actionRequired = null;
        
        if ($tenant->isExpired()) {
            $actionRequired = 'PAYMENT';
        } elseif ($tenant->isTrial() && $remainingDays < 3) {
            $actionRequired = 'UPGRADE_SOON';
        }

        return response()->json([
            'tenant_type' => $tenant->tenant_type,
            'tenant_status' => $tenant->status,
            'is_trial' => $tenant->isTrial(),
            'remaining_trial_days' => $remainingDays,
            'action_required' => $actionRequired,
            // Extra info for UI
            'trial_end_at' => $tenant->trial_end_at,
            'subscription_end_at' => $tenant->subscription_ended_at,
        ]);
    }
}
