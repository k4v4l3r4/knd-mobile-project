<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\RondaLocation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

class RondaLocationController extends Controller
{
    /**
     * Get Ronda Locations for current RT.
     */
    public function index(Request $request)
    {
        $rtId = Auth::user()->rt_id;
        if (!$rtId) {
            return response()->json([
                'success' => false,
                'message' => 'User does not belong to an RT'
            ], 403);
        }

        $locations = RondaLocation::where('rt_id', $rtId)->get();

        return response()->json([
            'success' => true,
            'data' => $locations
        ]);
    }

    /**
     * Store a new Ronda Location.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'latitude' => 'required|numeric',
            'longitude' => 'required|numeric',
            'radius_meters' => 'integer|min:5|max:500',
        ]);

        $rtId = Auth::user()->rt_id;
        if (!$rtId) {
            return response()->json([
                'success' => false,
                'message' => 'User does not belong to an RT'
            ], 403);
        }

        // Generate initial QR Token
        $qrToken = Str::random(32);

        $location = RondaLocation::create([
            'rt_id' => $rtId,
            'name' => $validated['name'],
            'latitude' => $validated['latitude'],
            'longitude' => $validated['longitude'],
            'radius_meters' => $validated['radius_meters'] ?? 50,
            'qr_token' => $qrToken,
            'token_expires_at' => null, // Static by default unless refreshed
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Lokasi Pos Ronda berhasil ditambahkan',
            'data' => $location
        ]);
    }

    /**
     * Update Ronda Location.
     */
    public function update(Request $request, string $id)
    {
        $location = RondaLocation::where('id', $id)
            ->where('rt_id', Auth::user()->rt_id)
            ->first();

        if (!$location) {
            return response()->json([
                'success' => false,
                'message' => 'Lokasi tidak ditemukan'
            ], 404);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'latitude' => 'sometimes|numeric',
            'longitude' => 'sometimes|numeric',
            'radius_meters' => 'sometimes|integer|min:5|max:500',
        ]);

        $location->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Lokasi Pos Ronda berhasil diperbarui',
            'data' => $location
        ]);
    }

    /**
     * Delete Ronda Location.
     */
    public function destroy(string $id)
    {
        $location = RondaLocation::where('id', $id)
            ->where('rt_id', Auth::user()->rt_id)
            ->first();

        if (!$location) {
            return response()->json([
                'success' => false,
                'message' => 'Lokasi tidak ditemukan'
            ], 404);
        }

        $location->delete();

        return response()->json([
            'success' => true,
            'message' => 'Lokasi Pos Ronda berhasil dihapus'
        ]);
    }

    /**
     * Refresh QR Token (make it dynamic).
     */
    public function refreshQr(string $id)
    {
        $location = RondaLocation::where('id', $id)
            ->where('rt_id', Auth::user()->rt_id)
            ->first();

        if (!$location) {
            return response()->json([
                'success' => false,
                'message' => 'Lokasi tidak ditemukan'
            ], 404);
        }

        $location->qr_token = Str::random(32);
        // Set expiration to 24 hours (covers one daily shift)
        $location->token_expires_at = now()->addHours(24);
        $location->save();

        return response()->json([
            'success' => true,
            'message' => 'QR Token berhasil diperbarui (Berlaku 24 Jam)',
            'data' => [
                'qr_token' => $location->qr_token,
                'token_expires_at' => $location->token_expires_at
            ]
        ]);
    }
}
