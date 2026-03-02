<?php 
namespace App\Models; 
use Illuminate\Database\Eloquent\Model; 
use App\Traits\BelongsToTenant;

class Wallet extends Model { 
    use BelongsToTenant;

    protected $guarded = ['id']; 
}