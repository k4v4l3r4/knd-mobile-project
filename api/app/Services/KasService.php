<?php

namespace App\Services;

use App\Models\KasTransaction;

class KasService
{
    public static function recordTransaction(
        int $rtId,
        string $sourceType,
        ?int $sourceId,
        int $amount,
        string $direction,
        ?string $description = null
    ) {
        return KasTransaction::create([
            'rt_id' => $rtId,
            'source_type' => $sourceType,
            'source_id' => $sourceId,
            'amount' => $amount,
            'direction' => $direction,
            'description' => $description,
        ]);
    }
}
