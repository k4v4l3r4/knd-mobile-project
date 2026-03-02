<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class InvoiceRevenueSplit extends Model
{
    use HasFactory;

    protected $fillable = [
        'invoice_id',
        'target_type',
        'target_tenant_id',
        'amount',
    ];

    public function invoice()
    {
        return $this->belongsTo(Invoice::class);
    }
}
