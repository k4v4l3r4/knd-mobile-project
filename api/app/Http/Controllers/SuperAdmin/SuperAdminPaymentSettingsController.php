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

            $defaultPlans = [
                'BASIC_RW_MONTHLY' => [
                    'price' => 150000,
                    'discount_percent' => 0,
                ],
                'BASIC_RW_YEARLY' => [
                    'price' => 1500000,
                    'discount_percent' => 0,
                ],
                'LIFETIME_RW' => [
                    'price' => 5000000,
                    'discount_percent' => 0,
                ],
            ];

            if (!isset($settings['gateways']) || !is_array($settings['gateways'])) {
                $settings['gateways'] = [
                    'subscription' => 'MANUAL',
                    'iuran_warga' => 'MANUAL',
                    'umkm' => 'MANUAL',
                ];
            }

            if (!isset($settings['plans']) || !is_array($settings['plans'])) {
                $settings['plans'] = $defaultPlans;
            } else {
                foreach ($defaultPlans as $code => $planDefaults) {
                    if (!isset($settings['plans'][$code]) || !is_array($settings['plans'][$code])) {
                        $settings['plans'][$code] = $planDefaults;
                    } else {
                        foreach ($planDefaults as $key => $value) {
                            if (!array_key_exists($key, $settings['plans'][$code])) {
                                $settings['plans'][$code][$key] = $value;
                            }
                        }
                    }
                }
            }
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
                'plans' => [
                    'BASIC_RW_MONTHLY' => [
                        'price' => 150000,
                        'discount_percent' => 0,
                    ],
                    'BASIC_RW_YEARLY' => [
                        'price' => 1500000,
                        'discount_percent' => 0,
                    ],
                    'LIFETIME_RW' => [
                        'price' => 5000000,
                        'discount_percent' => 0,
                    ],
                ],
                'gateways' => [
                    'subscription' => 'MANUAL',
                    'iuran_warga' => 'MANUAL',
                    'umkm' => 'MANUAL',
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
            'plans.BASIC_RW_MONTHLY.price' => 'required|numeric|min:0',
            'plans.BASIC_RW_MONTHLY.discount_percent' => 'nullable|numeric|min:0|max:100',
            'plans.BASIC_RW_YEARLY.price' => 'required|numeric|min:0',
            'plans.BASIC_RW_YEARLY.discount_percent' => 'nullable|numeric|min:0|max:100',
            'plans.LIFETIME_RW.price' => 'required|numeric|min:0',
            'plans.LIFETIME_RW.discount_percent' => 'nullable|numeric|min:0|max:100',
            'gateways.subscription' => 'required|string|in:MANUAL,DANA',
            'gateways.iuran_warga' => 'required|string|in:MANUAL,DANA',
            'gateways.umkm' => 'required|string|in:MANUAL,DANA',
        ]);

        Storage::disk('local')->put($this->settingsFile, json_encode($data));

        return response()->json([
            'success' => true,
            'message' => 'Payment settings updated successfully',
            'data' => $data
        ]);
    }
}
