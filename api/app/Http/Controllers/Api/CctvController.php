<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Cctv;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class CctvController extends Controller
{
    /**
     * Get list of CCTVs for the current RT.
     */
    public function index(Request $request)
    {
        $user = Auth::user();
        $rtId = $user->rt_id;
        
        $cctvs = Cctv::where('rt_id', $rtId)->get();

        return response()->json([
            'success' => true,
            'data' => $cctvs
        ]);
    }

    /**
     * Store a new CCTV.
     */
    public function store(Request $request)
    {
        $user = Auth::user();
        if (!in_array($user->role, ['admin_rt', 'ADMIN_RT', 'super_admin', 'SUPER_ADMIN'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'label' => 'required|string|max:255',
            'stream_url' => 'required|string',
            'location' => 'nullable|string|max:255',
            'is_active' => 'boolean',
        ]);

        $validated['rt_id'] = $user->rt_id;

        $cctv = Cctv::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'CCTV added successfully',
            'data' => $cctv
        ]);
    }

    /**
     * Update existing CCTV.
     */
    public function update(Request $request, $id)
    {
        $user = Auth::user();
        if (!in_array($user->role, ['admin_rt', 'ADMIN_RT', 'super_admin', 'SUPER_ADMIN'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $cctv = Cctv::where('rt_id', $user->rt_id)->findOrFail($id);

        $validated = $request->validate([
            'label' => 'sometimes|required|string|max:255',
            'stream_url' => 'sometimes|required|string',
            'location' => 'nullable|string|max:255',
            'is_active' => 'boolean',
        ]);

        $cctv->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'CCTV updated successfully',
            'data' => $cctv
        ]);
    }

    /**
     * Delete CCTV.
     */
    public function destroy($id)
    {
        $user = Auth::user();
        if (!in_array($user->role, ['admin_rt', 'ADMIN_RT', 'super_admin', 'SUPER_ADMIN'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $cctv = Cctv::where('rt_id', $user->rt_id)->findOrFail($id);
        $cctv->delete();

        return response()->json([
            'success' => true,
            'message' => 'CCTV deleted successfully'
        ]);
    }
}
