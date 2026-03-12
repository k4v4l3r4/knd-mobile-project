<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BoardingHouse;
use App\Models\BoardingTenant;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log;

class BoardingHouseController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $user = $request->user('sanctum');
        if (!$user) return response()->json(['message' => 'Unauthorized'], 401);

        $isAdmin = in_array($user->role, ['SUPER_ADMIN', 'ADMIN', 'ADMIN_RW', 'SECRETARY', 'TREASURER']);
        $isRtViewer = in_array($user->role, ['RT', 'ADMIN_RT', 'SECRETARY', 'TREASURER']) && !empty($user->rt_id);
        
        // 1. Base Query with Eager Loading
        $query = BoardingHouse::with(['owner', 'tenants' => function ($q) {
            $q->where('status', 'ACTIVE');
        }, 'tenants.user']);

        // 2. Strict Tenant Scope (Security)
        if (!in_array($user->role, ['SUPER_ADMIN'])) {
            $query->where('tenant_id', $user->tenant_id)
                  ->whereHas('owner', function ($q) use ($user) {
                      $q->where('tenant_id', $user->tenant_id);
                  });
        }

        // 3. Visibility Rules
        // - Owner: only their own kost
        // - RT Viewer: all kosts in the same RT (for census)
        // - Admin: all kosts within tenant scope
        if (!$isAdmin && !$isRtViewer) {
            $query->where('owner_id', $user->id);
        } elseif ($isRtViewer && !$isAdmin) {
            $query->whereHas('owner', function ($q) use ($user) {
                $q->where('rt_id', $user->rt_id);
            });
        }

        // 4. Get Data
        $boardingHouses = $query->latest()->get();

        // 5. Map & Sanitize Data based on Role
        $sanitizedData = $boardingHouses->map(function ($house) use ($user, $isRtViewer) {
            $isOwner = $house->owner_id === $user->id;
            
            $houseData = [
                'id' => $house->id,
                'name' => $house->name,
                'address' => $house->address,
                'owner_id' => $house->owner_id,
                'owner' => [
                    'id' => $house->owner->id,
                    'name' => $house->owner->name,
                    'phone' => $house->owner->phone, // Contact info for Warga
                    'photo_url' => $house->owner->photo_url ?? null,
                ],
                'is_mine' => $isOwner,
            ];

            if ($isOwner) {
                // === OWNER ACCESS (Full Business Data) ===
                $houseData['total_rooms'] = $house->total_rooms;
                $houseData['total_floors'] = $house->total_floors;
                $houseData['floor_config'] = $house->floor_config;
                // Full Tenant Details including Finance
                $houseData['tenants'] = $house->tenants; 
            } elseif ($isRtViewer) {
                // === RT ACCESS (Monitoring / Census) ===
                $houseData['total_rooms'] = $house->total_rooms;
                // Tenants: Names & Status ONLY. Hide Money.
                $houseData['tenants'] = $house->tenants->map(function ($tenant) {
                    return [
                        'id' => $tenant->id,
                        'user' => [
                            'id' => $tenant->user->id,
                            'name' => $tenant->user->name,
                            'nik' => $tenant->user->nik, // RT needs NIK for census
                            'phone' => $tenant->user->phone,
                            'gender' => $tenant->user->gender,
                            'marital_status' => $tenant->user->marital_status,
                            'occupation' => $tenant->user->occupation,
                            'photo_url' => $tenant->user->photo_url ?? null,
                        ],
                        'room_number' => $tenant->room_number,
                        'start_date' => $tenant->start_date,
                        'due_date' => $tenant->due_date,
                        // HIDDEN: room_price, deposit_amount, payment_status (maybe status is ok? Payment status is financial)
                        // User said: "DILARANG melihat data keuangan (harga sewa/status bayar)"
                        'status' => $tenant->status, // Active/Inactive is functional status, not financial
                    ];
                });
            } else {
                $houseData['tenants'] = []; 
            }

            return $houseData;
        });

        // Debug context
        try {
            Log::info('BoardingHouse Index', [
                'tenant_id' => $user->tenant_id,
                'user_id' => $user->id,
                'role' => $user->role,
                'count' => $sanitizedData->count(),
            ]);
        } catch (\Throwable $e) {}

        return response()->json([
            'success' => true,
            'message' => 'List data kost',
            'data' => $sanitizedData
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'address' => 'required|string',
            'total_rooms' => 'required|integer|min:1',
            'total_floors' => 'required|integer|min:1',
            'floor_config' => 'nullable|array',
            'floor_config.*' => 'integer|min:0',
            'owner_id' => 'nullable|exists:users,id', // Admin can assign owner
        ]);

        $user = $request->user('sanctum');
        if (!$user) return response()->json(['message' => 'Unauthorized'], 401);

        // RT can only view (read-only) UNLESS they are the owner (Dual Role)
        // If they are creating, they become the owner, so allow it.
        // if (in_array($user->role, ['RT', 'ADMIN_RT'])) {
        //     return response()->json([
        //         'success' => false,
        //         'message' => 'RT hanya memiliki akses baca (read-only)'
        //     ], 403);
        // }

        $isAdmin = in_array($user->role, ['SUPER_ADMIN', 'ADMIN', 'ADMIN_RW', 'SECRETARY', 'TREASURER']);
        $ownerId = $user->id;

        if ($request->has('owner_id') && $isAdmin) {
            $ownerId = $request->owner_id;
        }

        $boardingHouse = BoardingHouse::create([
            'owner_id' => $ownerId,
            'name' => $request->name,
            'address' => $request->address,
            'total_rooms' => $request->total_rooms,
            'total_floors' => $request->total_floors,
            'floor_config' => $request->floor_config,
        ]);

        // Do not change user role when creating kost. Ownership is used for authorization checks.

        return response()->json([
            'success' => true,
            'message' => 'Data kost berhasil ditambahkan',
            'data' => $boardingHouse
        ], 201);
    }
    
    /**
     * Display the specified resource.
     */
    public function show(Request $request, $id)
    {
        $boardingHouse = BoardingHouse::with(['owner', 'tenants' => function ($q) {
            $q->where('status', 'ACTIVE');
        }, 'tenants.user'])->find($id);
        
        if (!$boardingHouse) {
             return response()->json([
                'success' => false,
                'message' => 'Data kost tidak ditemukan',
            ], 404);
        }

        $user = $request->user('sanctum');
        if (!$user) return response()->json(['message' => 'Unauthorized'], 401);

        $isOwner = $boardingHouse->owner_id === $user->id;
        $isAdmin = in_array($user->role, ['SUPER_ADMIN', 'ADMIN', 'ADMIN_RW', 'SECRETARY', 'TREASURER']);
        $isRtViewer = in_array($user->role, ['RT', 'ADMIN_RT', 'SECRETARY', 'TREASURER']) && !empty($user->rt_id);

        if ($isRtViewer) {
            if (!$user->rt_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Anda tidak memiliki akses ke data kost ini'
                ], 403);
            }

            $ownerRtId = $boardingHouse->owner ? $boardingHouse->owner->rt_id : null;
            if (!$ownerRtId || (int) $ownerRtId !== (int) $user->rt_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Anda tidak memiliki akses ke data kost ini'
                ], 403);
            }

            $tenants = $boardingHouse->tenants ? $boardingHouse->tenants->map(function ($tenant) {
                $u = $tenant->user;
                return [
                    'id' => $tenant->id,
                    'boarding_house_id' => $tenant->boarding_house_id,
                    'user_id' => $tenant->user_id,
                    'room_number' => $tenant->room_number,
                    'start_date' => $tenant->start_date,
                    'due_date' => $tenant->due_date,
                    'rental_duration' => $tenant->rental_duration,
                    'status' => $tenant->status,
                    'user' => $u ? [
                        'id' => $u->id,
                        'name' => $u->name,
                        'nik' => $u->nik,
                        'phone' => $u->phone,
                        'gender' => $u->gender,
                        'marital_status' => $u->marital_status,
                        'occupation' => $u->occupation,
                        'photo_url' => $u->photo_url ?? null,
                    ] : null,
                ];
            })->values() : [];

            return response()->json([
                'success' => true,
                'message' => 'Detail data kost',
                'data' => [
                    'id' => $boardingHouse->id,
                    'name' => $boardingHouse->name,
                    'address' => $boardingHouse->address,
                    'owner_id' => $boardingHouse->owner_id,
                    'owner' => $boardingHouse->owner ? [
                        'id' => $boardingHouse->owner->id,
                        'name' => $boardingHouse->owner->name,
                        'phone' => $boardingHouse->owner->phone,
                        'photo_url' => $boardingHouse->owner->photo_url ?? null,
                    ] : null,
                    'tenants' => $tenants
                ]
            ]);
        }

        $isTenantHere = false;
        if (in_array($user->role, ['WARGA_KOST', 'WARGA', 'WARGA_TETAP'])) {
             $isTenantHere = $boardingHouse->tenants->contains('user_id', $user->id);
        }

        if (!$isAdmin && !$isOwner && !$isTenantHere) {
             return response()->json([
                'success' => false,
                'message' => 'Anda tidak memiliki akses ke data kost ini'
            ], 403);
        }

        if ($isOwner || $isAdmin) {
            return response()->json([
                'success' => true,
                'message' => 'Detail data kost',
                'data' => $boardingHouse
            ]);
        }

        $tenant = $boardingHouse->tenants ? $boardingHouse->tenants->firstWhere('user_id', $user->id) : null;
        
        return response()->json([
            'success' => true,
            'message' => 'Detail data kost',
            'data' => [
                'id' => $boardingHouse->id,
                'name' => $boardingHouse->name,
                'address' => $boardingHouse->address,
                'owner_id' => $boardingHouse->owner_id,
                'owner' => $boardingHouse->owner ? [
                    'id' => $boardingHouse->owner->id,
                    'name' => $boardingHouse->owner->name,
                    'phone' => $boardingHouse->owner->phone,
                    'photo_url' => $boardingHouse->owner->photo_url ?? null,
                ] : null,
                'tenants' => $tenant ? [[
                    'id' => $tenant->id,
                    'boarding_house_id' => $tenant->boarding_house_id,
                    'user_id' => $tenant->user_id,
                    'room_number' => $tenant->room_number,
                    'start_date' => $tenant->start_date,
                    'due_date' => $tenant->due_date,
                    'rental_duration' => $tenant->rental_duration,
                    'status' => $tenant->status,
                ]] : [],
            ]
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, $id)
    {
        $boardingHouse = BoardingHouse::find($id);

        if (!$boardingHouse) {
            return response()->json([
                'success' => false,
                'message' => 'Data kost tidak ditemukan',
            ], 404);
        }

        $user = $request->user('sanctum');
        if (!$user) return response()->json(['message' => 'Unauthorized'], 401);

        $isAdmin = in_array($user->role, ['SUPER_ADMIN', 'ADMIN', 'ADMIN_RW', 'SECRETARY', 'TREASURER']);
        $isOwner = $boardingHouse->owner_id === $user->id;

        if (!$isAdmin && !$isOwner) {
            return response()->json([
                'success' => false,
                'message' => 'Anda tidak memiliki akses ke kost ini'
            ], 403);
        }

        // RT can only view (read-only) UNLESS they are the owner
        if (in_array($user->role, ['RT', 'ADMIN_RT']) && !$isOwner) {
            return response()->json([
                'success' => false,
                'message' => 'RT hanya memiliki akses baca (read-only)'
            ], 403);
        }

        $request->validate([
            'name' => 'sometimes|string|max:255',
            'address' => 'sometimes|string',
            'total_rooms' => 'sometimes|integer|min:1',
            'total_floors' => 'sometimes|integer|min:1',
            'floor_config' => 'sometimes|array',
            'floor_config.*' => 'integer|min:0',
        ]);

        $boardingHouse->update($request->only(['name', 'address', 'total_rooms', 'total_floors', 'floor_config']));

        return response()->json([
            'success' => true,
            'message' => 'Data kost berhasil diperbarui',
            'data' => $boardingHouse
        ]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Request $request, $id)
    {
        $boardingHouse = BoardingHouse::find($id);

        if (!$boardingHouse) {
            return response()->json([
                'success' => false,
                'message' => 'Data kost tidak ditemukan',
            ], 404);
        }

        $user = $request->user('sanctum');
        if (!$user) return response()->json(['message' => 'Unauthorized'], 401);

        $isAdmin = in_array($user->role, ['SUPER_ADMIN', 'ADMIN', 'ADMIN_RW', 'SECRETARY', 'TREASURER']);
        $isOwner = $boardingHouse->owner_id === $user->id;

        if (!$isAdmin && !$isOwner) {
            return response()->json([
                'success' => false,
                'message' => 'Anda tidak memiliki akses ke kost ini'
            ], 403);
        }

        // RT can only view (read-only) UNLESS they are the owner
        if (in_array($user->role, ['RT', 'ADMIN_RT']) && !$isOwner) {
            return response()->json([
                'success' => false,
                'message' => 'RT hanya memiliki akses baca (read-only)'
            ], 403);
        }

        // Optional: Check if there are active tenants before deleting
        if ($boardingHouse->tenants()->where('status', 'ACTIVE')->exists()) {
             return response()->json([
                'success' => false,
                'message' => 'Tidak dapat menghapus kost yang masih memiliki penghuni aktif'
            ], 400);
        }

        $boardingHouse->delete();

        return response()->json([
            'success' => true,
            'message' => 'Data kost berhasil dihapus'
        ]);
    }

    /**
     * Add a tenant to a boarding house.
     */
    public function addTenant(Request $request, $id)
    {
        $boardingHouse = BoardingHouse::find($id);

        if (!$boardingHouse) {
            return response()->json([
                'success' => false,
                'message' => 'Kost tidak ditemukan'
            ], 404);
        }

        // Authorization check
        $user = $request->user('sanctum');
        if (!$user) return response()->json(['message' => 'Unauthorized'], 401);

        $isOwner = $boardingHouse->owner_id === $user->id;
        $isAdminOrRt = in_array($user->role, ['SUPER_ADMIN', 'ADMIN', 'ADMIN_RW', 'SECRETARY', 'TREASURER', 'RT', 'ADMIN_RT']);

        if (!$isOwner && !$isAdminOrRt) {
            return response()->json([
                'success' => false,
                'message' => 'Anda tidak memiliki akses ke kost ini'
            ], 403);
        }

        if (!$isOwner && in_array($user->role, ['RT', 'ADMIN_RT', 'SECRETARY', 'TREASURER'])) {
            if (!$user->rt_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Anda tidak memiliki akses ke kost ini'
                ], 403);
            }

            $ownerRtId = $boardingHouse->owner ? $boardingHouse->owner->rt_id : null;
            if (!$ownerRtId || (int) $ownerRtId !== (int) $user->rt_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Anda tidak memiliki akses ke kost ini'
                ], 403);
            }
        }

        // Map marital status variants to Title Case
        $maritalMap = [
            'SINGLE' => 'Belum Kawin',
            'MARRIED' => 'Kawin',
            'Lajang' => 'Belum Kawin',
            'LAJANG' => 'Belum Kawin',
            'BELUM_KAWIN' => 'Belum Kawin',
            'BELUM KAWIN' => 'Belum Kawin',
            'Belum Kawin' => 'Belum Kawin',
            'Menikah' => 'Kawin',
            'MENIKAH' => 'Kawin',
            'KAWIN' => 'Kawin',
            'Kawin' => 'Kawin',
            'Cerai Hidup' => 'Cerai Hidup',
            'CERAI_HIDUP' => 'Cerai Hidup',
            'CERAI HIDUP' => 'Cerai Hidup',
            'Cerai Mati' => 'Cerai Mati',
            'CERAI_MATI' => 'Cerai Mati',
            'CERAI MATI' => 'Cerai Mati',
        ];

        if ($request->has('marital_status')) {
            $rawStatus = (string) $request->marital_status;
            $upper = strtoupper(trim($rawStatus));
            $upperUnderscore = str_replace(' ', '_', $upper);

            if (isset($maritalMap[$rawStatus])) {
                $request->merge(['marital_status' => $maritalMap[$rawStatus]]);
            } elseif (isset($maritalMap[$upperUnderscore])) {
                $request->merge(['marital_status' => $maritalMap[$upperUnderscore]]);
            } elseif (isset($maritalMap[$upper])) {
                $request->merge(['marital_status' => $maritalMap[$upper]]);
            } else {
                $request->merge(['marital_status' => ucwords(strtolower($rawStatus))]);
            }
        }

        $request->validate([
            'name' => 'required|string|max:255',
            'nik' => 'required|string|size:16',
            'room_number' => 'nullable|string',
            'phone' => 'nullable|string',
            'start_date' => 'required|date',
            'rental_duration' => 'nullable|integer|min:1',
            'room_price' => 'nullable|numeric|min:0',
            'deposit_amount' => 'nullable|numeric|min:0',
            'ktp_image' => 'nullable|image|max:2048',
            'gender' => 'nullable|string|in:L,P',
            'marital_status' => 'nullable|string|in:Belum Kawin,Kawin,Cerai Hidup,Cerai Mati',
            'occupation' => 'nullable|string',
        ]);

        DB::beginTransaction();
        try {
            // 1. Find or Create User
            $tenantUser = User::where('nik', $request->nik)->first();

            // If not found by NIK, try to find by phone
            if (!$tenantUser && $request->phone) {
                $tenantUser = User::where('phone', $request->phone)->first();
            }

            if (!$tenantUser) {
                $userData = [
                    'name' => $request->name,
                    'nik' => $request->nik,
                    'phone' => $request->phone,
                    'gender' => $request->gender,
                    'marital_status' => $request->marital_status,
                    'occupation' => $request->occupation,
                    'role' => 'WARGA_KOST',
                    'password' => Hash::make(Str::random(12)),
                    // Assign RT/RW from owner if possible, or leave null for now
                ];
                
                if ($request->hasFile('ktp_image')) {
                    $path = $request->file('ktp_image')->store('ktp_images', 'public');
                    $userData['ktp_image_path'] = $path;
                }
                
                $tenantUser = User::create($userData);
            } else {
                // Ensure role allows being a tenant? Or just proceed.
                // Maybe update role if currently just a generic user?
                if ($tenantUser->role === 'WARGA') { // Assuming WARGA is default/old role
                     // Keep as is, or update? Let's just update role if strictly needed, 
                     // but WARGA_KOST is specific. Let's allow multi-roles conceptually but here just check.
                }
            }

            // 2. Add to Boarding Tenant
            // Check if already active in this kost
            $existingTenant = BoardingTenant::where('boarding_house_id', $id)
                ->where('user_id', $tenantUser->id)
                ->where('status', 'ACTIVE')
                ->exists();

            if ($existingTenant) {
                DB::rollBack();
                return response()->json([
                    'success' => false,
                    'message' => 'Penghuni sudah terdaftar aktif di kost ini'
                ], 422);
            }

            $tenant = BoardingTenant::create([
                'boarding_house_id' => $id,
                'user_id' => $tenantUser->id,
                'room_number' => $request->room_number,
                'start_date' => $request->start_date,
                'rental_duration' => $request->rental_duration ?: 1,
                'due_date' => null,
                'room_price' => $request->room_price ?: 0,
                'deposit_amount' => $request->deposit_amount ?: 0,
                'deposit_status' => 'UNPAID',
                'payment_status' => 'UNPAID',
                'status' => 'ACTIVE',
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Penghuni berhasil ditambahkan',
                'data' => $tenant->load('user')
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Gagal menambahkan penghuni: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function removeTenant(Request $request, $id, $tenantId)
    {
        $boardingHouse = BoardingHouse::find($id);
        if (!$boardingHouse) {
             return response()->json(['success' => false, 'message' => 'Kost tidak ditemukan'], 404);
        }

        $user = $request->user('sanctum');
        if (!$user) return response()->json(['message' => 'Unauthorized'], 401);

        $isAdmin = in_array($user->role, ['SUPER_ADMIN', 'ADMIN', 'ADMIN_RW', 'SECRETARY', 'TREASURER']);
        $isOwner = $boardingHouse->owner_id === $user->id;
        if (!$isAdmin && !$isOwner) {
             return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        // RT can only view (read-only)
        if (in_array($user->role, ['RT', 'ADMIN_RT'])) {
            return response()->json([
                'success' => false,
                'message' => 'RT hanya memiliki akses baca (read-only)'
            ], 403);
        }

        $tenant = BoardingTenant::where('id', $tenantId)
            ->where('boarding_house_id', $id)
            ->first();

        if (!$tenant) {
            return response()->json(['success' => false, 'message' => 'Data penghuni tidak ditemukan'], 404);
        }

        $tenant->status = 'MOVED_OUT';
        $tenant->save();
        // $tenant->delete(); // Keep record for history and deposit processing

        return response()->json([
            'success' => true,
            'message' => 'Data penghuni berhasil dihapus (Check-out)'
        ]);
    }

    /**
     * Update tenant data by Kost owner.
     */
    public function updateTenant(Request $request, $id, $tenantId)
    {
        $boardingHouse = BoardingHouse::find($id);
        if (!$boardingHouse) {
            return response()->json(['success' => false, 'message' => 'Kost tidak ditemukan'], 404);
        }

        $user = $request->user('sanctum');
        if (!$user) return response()->json(['message' => 'Unauthorized'], 401);

        $isAdmin = in_array($user->role, ['SUPER_ADMIN', 'ADMIN', 'ADMIN_RW', 'SECRETARY', 'TREASURER']);
        $isOwner = $boardingHouse->owner_id === $user->id;
        if (!$isAdmin && !$isOwner) {
            return response()->json(['success' => false, 'message' => 'Anda tidak memiliki akses ke kost ini'], 403);
        }

        // RT can only view (read-only)
        if (in_array($user->role, ['RT', 'ADMIN_RT'])) {
            return response()->json([
                'success' => false,
                'message' => 'RT hanya memiliki akses baca (read-only)'
            ], 403);
        }

        $tenant = BoardingTenant::where('id', $tenantId)
            ->where('boarding_house_id', $id)
            ->first();

        if (!$tenant) {
            return response()->json(['success' => false, 'message' => 'Data penghuni tidak ditemukan'], 404);
        }

        // Map marital status variants to Title Case
        $maritalMap = [
            'SINGLE' => 'Belum Kawin',
            'MARRIED' => 'Kawin',
            'Lajang' => 'Belum Kawin',
            'LAJANG' => 'Belum Kawin',
            'BELUM_KAWIN' => 'Belum Kawin',
            'BELUM KAWIN' => 'Belum Kawin',
            'Belum Kawin' => 'Belum Kawin',
            'Menikah' => 'Kawin',
            'MENIKAH' => 'Kawin',
            'KAWIN' => 'Kawin',
            'Kawin' => 'Kawin',
            'Cerai Hidup' => 'Cerai Hidup',
            'CERAI_HIDUP' => 'Cerai Hidup',
            'CERAI HIDUP' => 'Cerai Hidup',
            'Cerai Mati' => 'Cerai Mati',
            'CERAI_MATI' => 'Cerai Mati',
            'CERAI MATI' => 'Cerai Mati',
        ];

        if ($request->has('marital_status')) {
            $rawStatus = (string) $request->marital_status;
            $upper = strtoupper(trim($rawStatus));
            $upperUnderscore = str_replace(' ', '_', $upper);

            if (isset($maritalMap[$rawStatus])) {
                $request->merge(['marital_status' => $maritalMap[$rawStatus]]);
            } elseif (isset($maritalMap[$upperUnderscore])) {
                $request->merge(['marital_status' => $maritalMap[$upperUnderscore]]);
            } elseif (isset($maritalMap[$upper])) {
                $request->merge(['marital_status' => $maritalMap[$upper]]);
            } else {
                $request->merge(['marital_status' => ucwords(strtolower($rawStatus))]);
            }
        }

        $request->validate([
            'name' => 'sometimes|string|max:255',
            'nik' => 'nullable|string|size:16',
            'phone' => 'nullable|string',
            'room_number' => 'nullable|string',
            'start_date' => 'nullable|date',
            'status' => 'nullable|in:ACTIVE,MOVED_OUT',
            'gender' => 'nullable|in:L,P',
            'marital_status' => 'nullable|in:Belum Kawin,Kawin,Cerai Hidup,Cerai Mati',
            'occupation' => 'nullable|string',
            'room_price' => 'nullable|numeric|min:0',
            'deposit_amount' => 'nullable|numeric|min:0',
            'rental_duration' => 'nullable|integer|min:1',
        ]);

        DB::beginTransaction();
        try {
            // Update user profile fields if provided
            $tenantUser = $tenant->user;
            $userUpdated = false;

            if ($request->filled('nik') && $request->nik !== $tenantUser->nik) {
                if (User::where('nik', $request->nik)->where('id', '!=', $tenantUser->id)->exists()) {
                    return response()->json([
                        'success' => false,
                        'message' => 'NIK sudah digunakan oleh pengguna lain'
                    ], 422);
                }
                $tenantUser->nik = $request->nik;
                $userUpdated = true;
            }

            foreach (['name', 'phone', 'gender', 'marital_status', 'occupation'] as $field) {
                if ($request->filled($field)) {
                    $tenantUser->{$field} = $request->input($field);
                    $userUpdated = true;
                }
            }
            if ($userUpdated) {
                $tenantUser->save();
            }

            // Update tenant record
            foreach (['room_number', 'start_date', 'due_date', 'status', 'room_price', 'deposit_amount', 'rental_duration'] as $tField) {
                if ($request->filled($tField)) {
                    // Rule: Deposit amount cannot be changed if deposit status is PAID
                    if ($tField === 'deposit_amount' && $tenant->deposit_status === 'PAID') {
                        continue;
                    }
                    $tenant->{$tField} = $request->input($tField);
                }
            }
            $tenant->save();

            DB::commit();
            return response()->json([
                'success' => true,
                'message' => 'Data penghuni berhasil diperbarui',
                'data' => $tenant->load('user')
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Gagal memperbarui penghuni: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Mark deposit as PAID.
     */
    public function payDeposit(Request $request, $id, $tenantId)
    {
        $boardingHouse = BoardingHouse::find($id);
        if (!$boardingHouse) return response()->json(['success' => false, 'message' => 'Kost tidak ditemukan'], 404);

        $user = $request->user('sanctum');
        if (!$user) return response()->json(['message' => 'Unauthorized'], 401);

        if (in_array($user->role, ['RT', 'ADMIN_RT'])) {
            return response()->json([
                'success' => false,
                'message' => 'RT hanya memiliki akses baca (read-only)'
            ], 403);
        }

        $isAdmin = in_array($user->role, ['SUPER_ADMIN', 'ADMIN', 'ADMIN_RW', 'SECRETARY', 'TREASURER']);
        $isOwner = $boardingHouse->owner_id === $user->id;
        if (!$isAdmin && !$isOwner) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $tenant = BoardingTenant::where('id', $tenantId)->where('boarding_house_id', $id)->first();
        if (!$tenant) return response()->json(['success' => false, 'message' => 'Tenant not found'], 404);

        if ($tenant->deposit_status === 'PAID') {
            return response()->json(['success' => false, 'message' => 'Deposit sudah dibayar'], 400);
        }

        $tenant->deposit_status = 'PAID';
        $tenant->save();

        return response()->json([
            'success' => true,
            'message' => 'Deposit berhasil ditandai LUNAS',
            'data' => $tenant
        ]);
    }

    /**
     * Process deposit (Refund or Use) upon checkout.
     */
    public function processDeposit(Request $request, $id, $tenantId)
    {
        $boardingHouse = BoardingHouse::find($id);
        if (!$boardingHouse) return response()->json(['success' => false, 'message' => 'Kost tidak ditemukan'], 404);

        $user = $request->user('sanctum');
        if (!$user) return response()->json(['message' => 'Unauthorized'], 401);

        if (in_array($user->role, ['RT', 'ADMIN_RT'])) {
            return response()->json([
                'success' => false,
                'message' => 'RT hanya memiliki akses baca (read-only)'
            ], 403);
        }

        $isAdmin = in_array($user->role, ['SUPER_ADMIN', 'ADMIN', 'ADMIN_RW', 'SECRETARY', 'TREASURER']);
        $isOwner = $boardingHouse->owner_id === $user->id;
        if (!$isAdmin && !$isOwner) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $tenant = BoardingTenant::where('id', $tenantId)->where('boarding_house_id', $id)->first();
        if (!$tenant) return response()->json(['success' => false, 'message' => 'Tenant not found'], 404);

        if ($tenant->deposit_status !== 'PAID') {
            return response()->json([
                'success' => false, 
                'message' => 'Deposit belum dibayar atau sudah diproses sebelumnya'
            ], 400);
        }

        // Validate that tenant is inactive (MOVED_OUT)
        // Note: In handleCheckOut frontend, we set status to MOVED_OUT first.
        if ($tenant->status === 'ACTIVE') {
            return response()->json([
                'success' => false,
                'message' => 'Deposit hanya bisa diproses saat penghuni sudah tidak aktif (Check-out)'
            ], 400);
        }

        $request->validate([
            'action' => 'required|in:REFUND,USE',
            'note' => 'required_if:action,USE|string|nullable'
        ]);

        $action = $request->action;
        $note = $request->note;

        if ($action === 'REFUND') {
            $tenant->deposit_status = 'REFUNDED';
            $tenant->deposit_notes = 'Dikembalikan penuh';
        } else {
            $tenant->deposit_status = 'USED';
            $tenant->deposit_notes = $note;
        }

        $tenant->save();

        return response()->json([
            'success' => true,
            'message' => 'Deposit berhasil diproses',
            'data' => $tenant
        ]);
    }

    public function markAsPaid(Request $request, $id, $tenantId)
    {
        $boardingHouse = BoardingHouse::find($id);
        if (!$boardingHouse) {
            return response()->json(['success' => false, 'message' => 'Kost tidak ditemukan'], 404);
        }

        $user = $request->user('sanctum');
        if (!$user) return response()->json(['message' => 'Unauthorized'], 401);

        if (in_array($user->role, ['RT', 'ADMIN_RT'])) {
            return response()->json([
                'success' => false,
                'message' => 'RT hanya memiliki akses baca (read-only)'
            ], 403);
        }

        $isAdmin = in_array($user->role, ['SUPER_ADMIN', 'ADMIN', 'ADMIN_RW', 'SECRETARY', 'TREASURER']);
        $isOwner = $boardingHouse->owner_id === $user->id;
        if (!$isAdmin && !$isOwner) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $tenant = BoardingTenant::where('id', $tenantId)
            ->where('boarding_house_id', $id)
            ->first();

        if (!$tenant) {
            return response()->json(['success' => false, 'message' => 'Data penghuni tidak ditemukan'], 404);
        }

        // Logic requested:
        // IF status_sewa = BELUM_DIBAYAR: payment_status = PAID; due_date = due_date + durasi_sewa 
        // ELSE IF status_sewa = PAID: due_date = due_date + durasi_sewa
        
        $duration = $tenant->rental_duration ?: 1;
        $currentDueDate = $tenant->due_date ? \Carbon\Carbon::parse($tenant->due_date) : \Carbon\Carbon::now();
        
        // Always add duration to the current due date (or now)
        $nextDueDate = $currentDueDate->copy()->addMonths($duration);
        
        $tenant->payment_status = 'PAID';
        $tenant->due_date = $nextDueDate->toDateString();
        $tenant->save();

        return response()->json([
            'success' => true,
            'message' => 'Pembayaran berhasil ditandai, jatuh tempo diperbarui.',
            'data' => $tenant
        ]);
    }

    // Duplicated methods removed
}
