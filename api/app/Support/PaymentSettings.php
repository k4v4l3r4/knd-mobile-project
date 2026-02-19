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

        if (!isset($settings['umkm_scope']) || !in_array($settings['umkm_scope'], ['GLOBAL', 'RW'], true)) {
            $settings['umkm_scope'] = 'GLOBAL';
        }

        $gateways = $settings['gateways'] ?? [];
        $settings['gateways'] = [
            'subscription' => $gateways['subscription'] ?? 'MANUAL',
            'iuran_warga' => $gateways['iuran_warga'] ?? 'MANUAL',
            'umkm' => $gateways['umkm'] ?? 'MANUAL',
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
