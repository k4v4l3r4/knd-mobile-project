<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use App\Models\WilayahRt;
use App\Models\EmergencyContact;
use App\Models\Product;
use Illuminate\Support\Facades\DB;

class FixPhoneNumberFormat extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'fix:phone-format {--dry-run : Simulate the changes without saving}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Fix phone number formats from 08.../02... to 62... and resolve conflicts.';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $dryRun = $this->option('dry-run');
        
        if ($dryRun) {
            $this->info("Running in DRY-RUN mode. No changes will be saved.");
        }

        $this->processUsers($dryRun);
        $this->processWilayahRt($dryRun);
        $this->processEmergencyContacts($dryRun);
        $this->processProducts($dryRun);
        
        $this->info("All phone number standardization tasks completed.");
    }

    protected function processUsers($dryRun)
    {
        $this->info("--- Processing Users ---");
        $users = User::where('phone', 'like', '0%')->get();

        if ($users->isEmpty()) {
            $this->info("No users found with '0...' format.");
            return;
        }

        $this->info("Found {$users->count()} users. Processing...");

        foreach ($users as $user) {
            $oldPhone = $user->phone;
            $newPhone = '62' . substr($oldPhone, 1);
            
            $this->line("Processing User ID: {$user->id} ({$user->name}) - {$oldPhone} -> {$newPhone}");

            $conflict = User::where('phone', $newPhone)->where('id', '!=', $user->id)->first();

            if ($conflict) {
                $this->warn("  CONFLICT DETECTED with User ID: {$conflict->id} ({$conflict->name}) - Role: {$conflict->role}");
                
                // Strategy: Prioritize RT/ADMIN roles over WARGA roles
                $isUserAdmin = in_array($user->role, ['SUPER_ADMIN', 'ADMIN', 'RT', 'RW', 'ADMIN_RW']);
                $isConflictAdmin = in_array($conflict->role, ['SUPER_ADMIN', 'ADMIN', 'RT', 'RW', 'ADMIN_RW']);

                if ($isUserAdmin && !$isConflictAdmin) {
                    // Rename conflict user (Warga)
                    $renamedPhone = $newPhone . '_old_' . time();
                    $this->info("  Resolution: Renaming conflicting WARGA user {$conflict->id} to {$renamedPhone}");
                    
                    if (!$dryRun) {
                        $conflict->phone = $renamedPhone;
                        $conflict->save();
                        
                        $user->phone = $newPhone;
                        $user->save();
                        $this->info("  Success: User {$user->id} updated to {$newPhone}.");
                    }
                } elseif (!$isUserAdmin && $isConflictAdmin) {
                    // Rename current user (Warga duplicate)
                    $renamedPhone = $oldPhone . '_duplicate_' . time();
                    $this->info("  Resolution: Renaming duplicate WARGA user {$user->id} to {$renamedPhone}");
                    
                    if (!$dryRun) {
                        $user->phone = $renamedPhone;
                        $user->save();
                        $this->info("  Success: User {$user->id} renamed.");
                    }
                } elseif ($isUserAdmin && $isConflictAdmin) {
                    // Both are admins - Critical Conflict
                    $this->error("  CRITICAL: Both users are Admins/RT. Manual intervention required. SKIPPING.");
                } else {
                    // Both are Warga - Rename current user (duplicate)
                    $renamedPhone = $oldPhone . '_duplicate_' . time();
                    $this->info("  Resolution: Both are WARGA. Renaming duplicate user {$user->id} to {$renamedPhone}");
                    
                    if (!$dryRun) {
                        $user->phone = $renamedPhone;
                        $user->save();
                        $this->info("  Success: User {$user->id} renamed.");
                    }
                }

            } else {
                if (!$dryRun) {
                    $user->phone = $newPhone;
                    $user->save();
                    $this->info("  Updated.");
                }
            }
        }
    }

    protected function processWilayahRt($dryRun)
    {
        $this->info("--- Processing Wilayah RT ---");
        $rts = WilayahRt::where('contact_phone', 'like', '0%')->get();

        if ($rts->isEmpty()) {
            $this->info("No Wilayah RT found with '0...' format.");
            return;
        }

        foreach ($rts as $rt) {
            $oldPhone = $rt->contact_phone;
            $newPhone = '62' . substr($oldPhone, 1);
            $this->line("RT ID: {$rt->id} - {$oldPhone} -> {$newPhone}");
            
            if (!$dryRun) {
                $rt->contact_phone = $newPhone;
                $rt->save();
            }
        }
    }

    protected function processEmergencyContacts($dryRun)
    {
        $this->info("--- Processing Emergency Contacts ---");
        $contacts = EmergencyContact::where('number', 'like', '0%')->get();

        if ($contacts->isEmpty()) {
            $this->info("No Emergency Contacts found with '0...' format.");
            return;
        }

        foreach ($contacts as $contact) {
            $oldPhone = $contact->number;
            $newPhone = '62' . substr($oldPhone, 1);
            $this->line("Contact ID: {$contact->id} ({$contact->name}) - {$oldPhone} -> {$newPhone}");
            
            if (!$dryRun) {
                $contact->number = $newPhone;
                $contact->save();
            }
        }
    }

    protected function processProducts($dryRun)
    {
        $this->info("--- Processing Products ---");
        $products = Product::where('whatsapp', 'like', '0%')->get();

        if ($products->isEmpty()) {
            $this->info("No Products found with '0...' format.");
            return;
        }

        foreach ($products as $product) {
            $oldPhone = $product->whatsapp;
            $newPhone = '62' . substr($oldPhone, 1);
            $this->line("Product ID: {$product->id} ({$product->name}) - {$oldPhone} -> {$newPhone}");
            
            if (!$dryRun) {
                $product->whatsapp = $newPhone;
                $product->save();
            }
        }
    }
}
