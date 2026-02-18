<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class SuperAdminPaymentSettingsController extends Controller
{
    private $settingsFile = 'payment_settings.json';

    public function index()
    {
        if (Storage::disk('local')->exists($this->settingsFile)) {
            $settings = json_decode(Storage::disk('local')->get($this->settingsFile), true);
        } else {
            $settings = [
                'subscription_mode' => 'CENTRALIZED',
                'iuran_warga_mode' => 'SPLIT',
                'umkm_mode' => 'SPLIT',
                'umkm_scope' => 'GLOBAL',
                'iuran_warga_config' => [
                    'platform_fee_percent' => 5,
                ],
                'umkm_config' => [
                    'umkm_share_percent' => 90,
                    'platform_fee_percent' => 5,
                    'rt_share_percent' => 5,
                    'is_rt_share_enabled' => true,
                ],
            ];
        }

        return response()->json([
            'success' => true,
            'data' => $settings
        ]);
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'subscription_mode' => 'required|string|in:CENTRALIZED',
            'iuran_warga_mode' => 'required|string|in:CENTRALIZED,SPLIT',
            'umkm_mode' => 'required|string|in:CENTRALIZED,SPLIT',
            'umkm_scope' => 'required|string|in:GLOBAL,RW',
            'iuran_warga_config.platform_fee_percent' => 'required|numeric|min:0|max:100',
            'umkm_config.umkm_share_percent' => 'required|numeric|min:0|max:100',
            'umkm_config.platform_fee_percent' => 'required|numeric|min:0|max:100',
            'umkm_config.rt_share_percent' => 'required|numeric|min:0|max:100',
            'umkm_config.is_rt_share_enabled' => 'required|boolean',
        ]);

        Storage::disk('local')->put($this->settingsFile, json_encode($data));

        return response()->json([
            'success' => true,
            'message' => 'Payment settings updated successfully',
            'data' => $data
        ]);
    }
}
