<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\RondaFineSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class RondaFineSettingController extends Controller
{
    /**
     * Get Fine Settings for current RT.
     */
    public function index()
    {
        $user = Auth::user();
        if (!$user->rt_id) {
            return response()->json(['message' => 'User not assigned to RT'], 403);
        }

        $settings = RondaFineSetting::where('rt_id', $user->rt_id)->get();
        return response()->json(['success' => true, 'data' => $settings]);
    }

    /**
     * Update or Create Fine Setting.
     * Expects an array of settings or single setting?
     * Based on UI "Simpan" button likely saves all.
     * Let's support bulk update/create based on fine_type.
     */
    public function store(Request $request)
    {
        $user = Auth::user();
        if (!$user->rt_id) {
            return response()->json(['message' => 'User not assigned to RT'], 403);
        }

        // Validate
        $validated = $request->validate([
            'settings' => 'required|array',
            'settings.*.fine_type' => 'required|in:TIDAK_HADIR,TELAT,PULANG_CEPAT',
            'settings.*.amount' => 'required|integer|min:0',
            'settings.*.tolerance_minutes' => 'nullable|integer|min:0',
            'settings.*.is_active' => 'boolean'
        ]);

        $savedSettings = [];

        foreach ($validated['settings'] as $item) {
            $setting = RondaFineSetting::updateOrCreate(
                [
                    'rt_id' => $user->rt_id,
                    'fine_type' => $item['fine_type']
                ],
                [
                    'amount' => $item['amount'],
                    'tolerance_minutes' => $item['tolerance_minutes'] ?? 0,
                    'is_active' => $item['is_active'] ?? true
                ]
            );
            $savedSettings[] = $setting;
        }

        return response()->json([
            'success' => true, 
            'message' => 'Pengaturan denda berhasil disimpan',
            'data' => $savedSettings
        ]);
    }
}
