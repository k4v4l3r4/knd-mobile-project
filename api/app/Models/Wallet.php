<?php 
namespace App\Models; 
use Illuminate\Database\Eloquent\Model; 
use App\Traits\BelongsToTenant;

class Wallet extends Model { 
    // use BelongsToTenant; // Disabled because table finance_accounts has no tenant_id column

    protected $table = 'finance_accounts';
    protected $guarded = ['id']; 
}