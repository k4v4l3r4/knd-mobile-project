<?php

namespace App\Support;

use Illuminate\Support\Facades\Storage;

class PaymentSettings
{
    protected static $file = 'payment_settings.json';

    public static function all(): array
    {
        $settings = [];

        if (Storage::disk('local')->exists(static::$file)) {
            $decoded = json_decode(Storage::disk('local')->get(static::$file), true);
            if (is_array($decoded)) {
                $settings = $decoded;
            }
        }

        if (!isset($settings['subscription_mode']) || $settings['subscription_mode'] !== 'CENTRALIZED') {
            $settings['subscription_mode'] = 'CENTRALIZED';
        }

        if (!isset($settings['iuran_warga_mode']) || !in_array($settings['iuran_warga_mode'], ['CENTRALIZED', 'SPLIT'], true)) {
            $settings['iuran_warga_mode'] = 'SPLIT';
        }

        if (!isset($settings['umkm_mode']) || !in_array($settings['umkm_mode'], ['CENTRALIZED', 'SPLIT'], true)) {
            $settings['umkm_mode'] = 'SPLIT';
        }

        if (!isset($settings['umkm_scope']) || !in_array($settings['umkm_scope'], ['GLOBAL', 'RW'], true)) {
            $settings['umkm_scope'] = 'GLOBAL';
        }

        $gateways = $settings['gateways'] ?? [];
        $settings['gateways'] = [
            'subscription' => $gateways['subscription'] ?? 'MANUAL',
            'iuran_warga' => $gateways['iuran_warga'] ?? 'DANA',
            'umkm' => $gateways['umkm'] ?? 'DANA',
        ];

        return $settings;
    }

    public static function getGateway(string $key): string
    {
        $settings = static::all();
        $value = $settings['gateways'][$key] ?? 'MANUAL';
        $allowed = ['MANUAL', 'DANA'];

        if (!in_array($value, $allowed, true)) {
            return 'MANUAL';
        }

        return $value;
    }

    public static function getUmkmScope(): string
    {
        $settings = static::all();

        return $settings['umkm_scope'] ?? 'GLOBAL';
    }
}
