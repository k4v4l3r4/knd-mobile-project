<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\WilayahRt;
use App\Models\Wallet;
use App\Models\ActivityCategory;
use App\Models\User;
use App\Models\Role as UserRole;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Support\Str;

class SettingController extends Controller {

    // --- Public Settings (For Login Page) ---
    public function getPublicSettings() {
        $rt = WilayahRt::first();
        
        if (!$rt) {
            return response()->json([
                'success' => true,
                'data' => [
                    'logo_url' => null,
                    'rt_name' => 'RT Online'
                ]
            ]);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'logo_url' => $rt->logo_url,
                'rt_name' => $rt->rt_name ?? 'RT Online'
            ]
        ]);
    }

    // --- Profil RT ---
    public function getProfile(Request $request) {
        $user = $request->user('sanctum');
        if (!$user) return response()->json(['message' => 'Unauthorized'], 401);
        
        return response()->json(WilayahRt::find($user->rt_id));
    }

    public function updateProfile(Request $request) {
        $user = $request->user('sanctum');
        $rt = WilayahRt::find($user->rt_id);
        
        $validated = $request->validate([
            'rt_name' => 'nullable|string',
            'address' => 'nullable|string',
            'province' => 'nullable|string',
            'city' => 'nullable|string',
            'district' => 'nullable|string',
            'subdistrict' => 'nullable|string',
            'postal_code' => 'nullable|string',
            'logo' => 'nullable|image|max:2048',
            'structure_image' => 'nullable|image|max:2048',
        ]);

        if ($request->hasFile('logo')) {
            if ($rt->logo_url) {
                Storage::disk('public')->delete($rt->logo_url);
            }
            $path = $request->file('logo')->store('rt_profiles', 'public');
            $validated['logo_url'] = $path;
        }

        if ($request->hasFile('structure_image')) {
            if ($rt->structure_image_url) {
                Storage::disk('public')->delete($rt->structure_image_url);
            }
            $path = $request->file('structure_image')->store('rt_profiles', 'public');
            $validated['structure_image_url'] = $path;
        }

        $rt->update($validated);
        return response()->json(['message' => 'Profil updated', 'data' => $rt]);
    }

    // --- Wallets ---
    public function getWallets(Request $request) {
        $user = $request->user('sanctum');
        if (!$user) return response()->json(['message' => 'Unauthorized'], 401);
        return response()->json(Wallet::where('rt_id', $user->rt_id)->get());
    }

    public function storeWallet(Request $request) {
        $user = $request->user('sanctum');
        $validated = $request->validate([
            'name' => 'required',
            'type' => 'required|in:CASH,BANK',
            'balance' => 'numeric',
            'bank_name' => 'nullable|string',
            'account_number' => 'nullable|string'
        ]);
        $validated['rt_id'] = $user->rt_id;
        $wallet = Wallet::create($validated);
        return response()->json(['message' => 'Wallet created', 'data' => $wallet]);
    }

    public function updateWallet(Request $request, $id) {
        $user = $request->user('sanctum');
        $wallet = Wallet::where('rt_id', $user->rt_id)->findOrFail($id);
        $validated = $request->validate([
            'name' => 'required',
            'type' => 'required|in:CASH,BANK',
            'balance' => 'numeric',
            'bank_name' => 'nullable|string',
            'account_number' => 'nullable|string'
        ]);
        $wallet->update($validated);
        return response()->json(['message' => 'Wallet updated', 'data' => $wallet]);
    }

    public function deleteWallet(Request $request, $id) {
        $user = $request->user('sanctum');
        $wallet = Wallet::where('rt_id', $user->rt_id)->findOrFail($id);
        $wallet->delete();
        return response()->json(['message' => 'Deleted']);
    }

    // --- Activities ---
    public function getActivities(Request $request) {
        $user = $request->user('sanctum');
        if (!$user) return response()->json(['message' => 'Unauthorized'], 401);
        return response()->json(ActivityCategory::where('rt_id', $user->rt_id)->get());
    }

    public function storeActivity(Request $request) {
        $user = $request->user('sanctum');
        $validated = $request->validate([
            'name' => 'required',
            'description' => 'nullable|string'
        ]);
        $validated['rt_id'] = $user->rt_id;
        $activity = ActivityCategory::create($validated);
        return response()->json(['message' => 'Activity created', 'data' => $activity]);
    }

    public function updateActivity(Request $request, $id) {
        $user = $request->user('sanctum');
        $activity = ActivityCategory::where('rt_id', $user->rt_id)->findOrFail($id);
        $validated = $request->validate([
            'name' => 'required',
            'description' => 'nullable|string'
        ]);
        $activity->update($validated);
        return response()->json(['message' => 'Activity updated', 'data' => $activity]);
    }

    public function deleteActivity(Request $request, $id) {
        $user = $request->user('sanctum');
        $activity = ActivityCategory::where('rt_id', $user->rt_id)->findOrFail($id);
        $activity->delete();
        return response()->json(['message' => 'Deleted']);
    }

    // --- Roles (Manajemen Peran) ---
    public function getRoles(Request $request) {
        $user = $request->user('sanctum');
        if (!$user) return response()->json(['message' => 'Unauthorized'], 401);

        // Hide legacy/global roles that should not be managed at tenant level
        $excludedCodes = ['SUPER_ADMIN', 'SECRETARY', 'TREASURER'];

        $roles = UserRole::where(function ($q) use ($user) {
                $q->whereNull('rt_id') // System roles
                  ->orWhere('rt_id', $user->rt_id); // Custom roles
            })
            ->whereNotIn('role_code', $excludedCodes)
            ->get();

        // Transform for frontend compatibility (name = role_code)
        $roles->transform(function ($role) {
            $role->name = $role->role_code;
            return $role;
        });

        return response()->json($roles);
    }

    public function storeRole(Request $request) {
        $user = $request->user('sanctum');
        $validated = $request->validate([
            'name' => 'required|string|regex:/^[A-Z0-9_]+$/', 
            'label' => 'required|string',
            'description' => 'nullable|string',
            'permissions' => 'nullable|array'
            // 'scope' ignored here, we force TENANT
        ]);

        // Check uniqueness for role_code
        $exists = UserRole::where('role_code', $validated['name'])
            ->where(function($q) use ($user) {
                $q->whereNull('rt_id')->orWhere('rt_id', $user->rt_id);
            })->exists();

        if ($exists) {
            return response()->json(['message' => 'Role ID/Key already exists'], 422);
        }

        $validated['rt_id'] = $user->rt_id;
        $validated['is_system'] = false;
        $validated['role_code'] = $validated['name'];
        $validated['scope'] = 'TENANT';
        
        $role = UserRole::create($validated);
        return response()->json(['message' => 'Role created', 'data' => $role]);
    }

    public function updateRole(Request $request, $id) {
        $user = $request->user('sanctum');
        $role = UserRole::find($id);

        if (!$role) {
            return response()->json(['message' => 'Role tidak ditemukan atau tidak bisa diubah'], 404);
        }

        if (in_array($role->role_code, ['ADMIN_RT', 'ADMIN_RW'])) {
            return response()->json(['message' => 'Role Admin RT dan Admin RW tidak boleh diubah'], 403);
        }

        $validated = $request->validate([
            'label' => 'required|string',
            'description' => 'nullable|string',
            'permissions' => 'nullable|array'
        ]);
        
        $role->update($validated);
        return response()->json(['message' => 'Role updated', 'data' => $role]);
    }

    public function deleteRole(Request $request, $id) {
        $user = $request->user('sanctum');
        $role = UserRole::where(function ($q) use ($user) {
                $q->whereNull('rt_id')->orWhere('rt_id', $user->rt_id);
            })
            ->findOrFail($id);

        if (in_array($role->role_code, ['ADMIN_RT', 'ADMIN_RW'])) {
            return response()->json(['message' => 'Role Admin RT dan Admin RW tidak boleh dihapus'], 403);
        }
        
        // Check if any user uses this role
        $inUse = User::where('role_id', $role->id)->exists();
        if ($inUse) {
            return response()->json(['message' => 'Cannot delete role because it is assigned to users'], 400);
        }

        $role->delete();
        return response()->json(['message' => 'Deleted']);
    }

    // --- Admins ---
    public function getAdmins(Request $request) {
        $user = $request->user('sanctum');
        if (!$user) return response()->json(['message' => 'Unauthorized'], 401);
        
        $excludedCodes = ['WARGA_TETAP', 'WARGA_KOST', 'JURAGAN_KOST', 'SUPER_ADMIN'];
        
        // Get valid role IDs
        $validRoleIds = UserRole::where(function($q) use ($user) {
                $q->whereNull('rt_id')->orWhere('rt_id', $user->rt_id);
            })
            ->whereNotIn('role_code', $excludedCodes)
            ->pluck('id');

        return response()->json(
            User::where('rt_id', $user->rt_id)
                ->whereIn('role_id', $validRoleIds)
                ->with('userRole')
                ->get()
                ->map(function ($u) {
                    // Map role code to 'role' attribute for frontend compatibility
                    if ($u->userRole) {
                        $u->role = $u->userRole->role_code;
                    }
                    return $u;
                })
        );
    }

    public function storeAdmin(Request $request) {
        $user = $request->user('sanctum');
        
        // Get valid role codes for validation
        $validRoles = UserRole::where(function($q) use ($user) {
                $q->whereNull('rt_id')->orWhere('rt_id', $user->rt_id);
            })
            ->where('scope', 'TENANT')
            ->where('role_code', '!=', 'SUPER_ADMIN')
            ->pluck('role_code')
            ->implode(',');

        // Check if promoting existing user
        if ($request->has('user_id') && $request->user_id) {
            $targetUser = User::where('rt_id', $user->rt_id)->findOrFail($request->user_id);
            
            $validated = $request->validate([
                'role' => 'required|in:' . $validRoles,
            ]);
            
            // Find role ID
            $role = UserRole::where('role_code', $validated['role'])
                ->where(function($q) use ($user) {
                    $q->whereNull('rt_id')->orWhere('rt_id', $user->rt_id);
                })->firstOrFail();
            
            $targetUser->update([
                'role_id' => $role->id,
                'role' => $role->role_code // Keep legacy synced
            ]);
            return response()->json(['message' => 'User promoted to Admin', 'data' => $targetUser]);
        }

        $validated = $request->validate([
            'name' => 'required|string',
            'email' => 'required|email|unique:users,email',
            'phone' => 'required|string|unique:users,phone',
            'role' => 'required|in:' . $validRoles,
            'password' => 'nullable|min:6'
        ]);

        // Find role ID
        $role = UserRole::where('role_code', $validated['role'])
            ->where(function($q) use ($user) {
                $q->whereNull('rt_id')->orWhere('rt_id', $user->rt_id);
            })->firstOrFail();

        $validated['rt_id'] = $user->rt_id;
        $validated['rw_id'] = $user->rw_id;
        $validated['role_id'] = $role->id;
        // validated['role'] is already role_code, which matches User fillable 'role' (legacy)
        $validated['password'] = Hash::make($validated['password'] ?? Str::random(12));
        
        $admin = User::create($validated);
        return response()->json(['message' => 'Admin created', 'data' => $admin]);
    }

    public function updateAdmin(Request $request, $id) {
        $user = $request->user('sanctum');
        $admin = User::where('rt_id', $user->rt_id)->findOrFail($id);
        
        $validRoles = UserRole::where(function($q) use ($user) {
                $q->whereNull('rt_id')->orWhere('rt_id', $user->rt_id);
            })
            ->where('scope', 'TENANT')
            ->where('role_code', '!=', 'SUPER_ADMIN')
            ->pluck('role_code')
            ->implode(',');

        $validated = $request->validate([
            'name' => 'required|string',
            'email' => ['required', 'email', Rule::unique('users')->ignore($admin->id)],
            'phone' => ['required', 'string', Rule::unique('users')->ignore($admin->id)],
            'role' => 'required|in:' . $validRoles,
            'password' => 'nullable|min:6'
        ]);

        if (!empty($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        } else {
            unset($validated['password']);
        }
        
        // Find role ID
        $role = UserRole::where('role_code', $validated['role'])
            ->where(function($q) use ($user) {
                $q->whereNull('rt_id')->orWhere('rt_id', $user->rt_id);
            })->firstOrFail();
            
        $validated['role_id'] = $role->id;

        $admin->update($validated);
        return response()->json(['message' => 'Admin updated', 'data' => $admin]);
    }

    public function deleteAdmin(Request $request, $id) {
        $user = $request->user('sanctum');
        $admin = User::where('rt_id', $user->rt_id)->findOrFail($id);
        
        if ($admin->id === $request->user()->id) {
            return response()->json(['message' => 'Cannot delete yourself'], 403);
        }
        
        $admin->delete();
        return response()->json(['message' => 'Deleted']);
    }
}
