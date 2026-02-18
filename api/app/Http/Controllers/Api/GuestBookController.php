<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\GuestBook;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;

class GuestBookController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();
        $role = strtoupper($user->role ?? '');
        $isResident = in_array($role, ['WARGA', 'WARGA_TETAP', 'WARGA_KOST']);
        $query = GuestBook::query();

        if ($isResident) {
            $query->where('host_user_id', $user->id);
        } else {
            if ($user->rt_id) {
                $query->where('rt_id', $user->rt_id);
            }
        }

        // Filter by status if requested
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        $guests = $query->with('host:id,name,address')
            ->orderBy('visit_date', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $guests
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'guest_name' => 'required|string',
            'purpose' => 'required|string',
            'visit_date' => 'required|date',
            'host_user_id' => 'nullable|exists:users,id',
            'guest_phone' => 'nullable|string',
            'origin' => 'nullable|string',
            'id_card_photo' => 'nullable|image|max:2048', // Allow image upload
        ]);

        $user = Auth::user();
        $role = strtoupper($user->role ?? '');
        $isResident = in_array($role, ['WARGA', 'WARGA_TETAP', 'WARGA_KOST']);
        $rtId = $user->rt_id; // Default to user's RT
        $hostUserId = $request->host_user_id;
        if (!$hostUserId && $isResident) {
            $hostUserId = $user->id;
        }

        DB::beginTransaction();
        try {
            $photoPath = null;
            if ($request->hasFile('id_card_photo')) {
                $photoPath = $request->file('id_card_photo')->store('guest_ids', 'public');
            }

            $guest = GuestBook::create([
                'rt_id' => $rtId,
                'host_user_id' => $hostUserId,
                'guest_name' => $request->guest_name,
                'guest_phone' => $request->guest_phone,
                'origin' => $request->origin,
                'purpose' => $request->purpose,
                'visit_date' => $request->visit_date,
                'id_card_photo' => $photoPath,
                'status' => 'CHECK_IN',
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Tamu berhasil dicatat',
                'data' => $guest
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Gagal mencatat tamu: ' . $e->getMessage()
            ], 500);
        }
    }

    public function checkout($id)
    {
        $guest = GuestBook::findOrFail($id);
        $user = Auth::user();
        $role = strtoupper($user->role ?? '');
        $isResident = in_array($role, ['WARGA', 'WARGA_TETAP', 'WARGA_KOST']);

        if ($isResident && $guest->host_user_id !== $user->id) {
             return response()->json(['message' => 'Unauthorized'], 403);
        }
        if ($user->rt_id && $guest->rt_id !== $user->rt_id) {
             return response()->json(['message' => 'Unauthorized RT'], 403);
        }

        $guest->update(['status' => 'CHECK_OUT']);

        return response()->json([
            'success' => true,
            'message' => 'Tamu berhasil check-out',
            'data' => $guest
        ]);
    }
    
    public function show($id) {
        $guest = GuestBook::with('host')->findOrFail($id);
        return response()->json(['success' => true, 'data' => $guest]);
    }

    public function update(Request $request, $id)
    {
        $guest = GuestBook::findOrFail($id);
        $user = Auth::user();
        $role = strtoupper($user->role ?? '');
        $isResident = in_array($role, ['WARGA', 'WARGA_TETAP', 'WARGA_KOST']);

        if ($isResident && $guest->host_user_id !== $user->id) {
             return response()->json(['message' => 'Unauthorized'], 403);
        }
        if ($user->rt_id && $guest->rt_id !== $user->rt_id) {
             return response()->json(['message' => 'Unauthorized RT'], 403);
        }

        $validated = $request->validate([
            'status' => 'sometimes|string',
            'guest_name' => 'sometimes|string',
            'purpose' => 'sometimes|string',
        ]);

        $guest->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Data tamu berhasil diperbarui',
            'data' => $guest
        ]);
    }
}
