<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Product;
use App\Models\Store;
use App\Models\User;

class MigrateProductStoreSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Get all products with null store_id
        $userIds = Product::whereNull('store_id')->pluck('user_id')->unique();

        foreach ($userIds as $userId) {
            $user = User::find($userId);
            if (!$user) continue;

            // Find or create store for this user
            $store = Store::firstOrCreate(
                ['user_id' => $userId],
                [
                    'rt_id' => $user->rt_id,
                    'name' => 'Toko ' . $user->name,
                    'description' => 'Toko otomatis dibuat dari migrasi data',
                    'status' => 'verified',
                    'verified_at' => now(),
                ]
            );

            // Update all user's products to link to this store
            Product::where('user_id', $userId)
                ->whereNull('store_id')
                ->update(['store_id' => $store->id]);

            $this->command->info("Migrated products for user {$user->name} to store {$store->name}");
        }
    }
}
