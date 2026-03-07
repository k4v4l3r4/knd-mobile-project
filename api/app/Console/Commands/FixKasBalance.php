<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Wallet;
use App\Models\Transaction;
use Illuminate\Support\Facades\DB;

class FixKasBalance extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:fix-kas-balance';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Fix Kas Keamanan balance and move to Kas RT';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Starting Kas Balance Fix...');

        // 1. Identify Target Wallets
        // Based on user report: "KAS KEAMANAN" has the money, "KAS RT" needs it.
        // Based on tinker: we only see "KAS RT 04" (id:1). 
        // This implies "KAS KEAMANAN" might have been renamed or deleted, OR it exists under a different query.
        // Let's search broadly.
        
        $kasKeamanan = Wallet::where('name', 'like', '%KEAMANAN%')->first();
        
        // If "KAS RT" not found exactly, try "KAS RT 04" or just id=1 based on tinker result
        $kasRt = Wallet::where('name', 'KAS RT')->first();
        if (!$kasRt) {
            $kasRt = Wallet::where('name', 'like', 'KAS RT%')->first();
        }

        if (!$kasRt) {
            $this->error('Target KAS RT not found.');
            return;
        }

        $this->info("Target Wallet: {$kasRt->name} (ID: {$kasRt->id})");

        if (!$kasKeamanan) {
             $this->info("KAS KEAMANAN not found in DB. Searching for transactions with wrong category in ANY wallet other than KAS RT...");
             // Strategy: Find transactions that are 'Iuran Warga' but NOT in KAS RT (ID:1)
             // This covers the case where they went to a wallet we can't see or identify easily by name
             $transactions = Transaction::where('category', 'Iuran Warga')
                ->where('account_id', '!=', $kasRt->id)
                ->get();
        } else {
             $this->info("Source Wallet: {$kasKeamanan->name} (ID: {$kasKeamanan->id})");
             $transactions = Transaction::where('account_id', $kasKeamanan->id)
                ->where('category', 'Iuran Warga')
                ->get();
        }

        if ($transactions->isEmpty()) {
            $this->info('No misplaced transactions found.');
            return;
        }

        DB::beginTransaction();
        try {
            foreach ($transactions as $trx) {
                $oldWalletId = $trx->account_id;
                $this->info("Moving Transaction ID: {$trx->id} (Rp " . number_format($trx->amount) . ") from Wallet ID {$oldWalletId} to {$kasRt->name}");
                
                // Update Transaction Account
                $trx->account_id = $kasRt->id;
                $trx->save();
                
                // Recalculate Source Wallet (if we can find it)
                $oldWallet = Wallet::find($oldWalletId);
                if ($oldWallet) {
                    $this->recalculateBalance($oldWallet);
                }
            }

            // Recalculate Target
            $this->recalculateBalance($kasRt);

            DB::commit();
            $this->info('Fix completed successfully!');
        } catch (\Exception $e) {
            DB::rollBack();
            $this->error('Error: ' . $e->getMessage());
        }
    }

    private function recalculateBalance($wallet) {
        $income = Transaction::where('account_id', $wallet->id)->where('type', 'IN')->where('status', 'PAID')->sum('amount');
        $expense = Transaction::where('account_id', $wallet->id)->where('type', 'OUT')->where('status', 'PAID')->sum('amount');
        $wallet->balance = $income - $expense;
        $wallet->save();
        $this->info("Recalculated {$wallet->name}: Rp " . number_format($wallet->balance));
    }
}
