<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use App\Models\User;
use App\Models\WilayahRt;
use App\Models\KasTransaction;
use App\Models\Transaction;
use App\Models\Wallet;
use Carbon\Carbon;

class FinanceDemoSeeder extends Seeder
{
    public function run()
    {
        $this->command->info('Seeding Finance Demo Data (New System)...');

        $rt = WilayahRt::where('rt_number', '001')->first();
        if (!$rt) {
            $this->command->error('RT 001 not found! Please run StarterSeeder first.');
            return;
        }
        $rtId = $rt->id;
        
        // 1. Tambahkan Data Lama (Legacy Transactions) - jika belum ada banyak
        // Pastikan Wallet ada (Minimal 2 untuk demo transfer)
        $cashWallet = Wallet::firstOrCreate(
            ['rt_id' => $rtId, 'type' => 'CASH'],
            ['name' => 'Kas Tunai', 'balance' => 0]
        );

        $bankWallet = Wallet::firstOrCreate(
            ['rt_id' => $rtId, 'type' => 'BANK'],
            ['name' => 'Rekening Bank RT', 'balance' => 0]
        );

        // Legacy Expense (Pengeluaran Lama)
        $legacyExpenses = [
            ['amount' => 150000, 'desc' => 'Beli Alat Tulis Kantor (Lama)', 'date' => now()->subMonths(2)],
            ['amount' => 500000, 'desc' => 'Perbaikan Gapura (Lama)', 'date' => now()->subMonths(1)],
        ];

        foreach ($legacyExpenses as $exp) {
            if (!Transaction::where('description', $exp['desc'])->exists()) {
                Transaction::create([
                    'rt_id' => $rtId,
                    'account_id' => $cashWallet->id,
                    'type' => 'OUT',
                    'amount' => $exp['amount'],
                    'category' => 'EXPENSE',
                    'description' => $exp['desc'],
                    'status' => 'PAID',
                    'date' => $exp['date'],
                    'user_id' => User::where('rt_id', $rtId)->first()->id ?? 1
                ]);
                // Kurangi saldo
                $cashWallet->decrement('balance', $exp['amount']);
            }
        }

        // Tambah Saldo Awal (Supaya bisa transfer)
        if ($cashWallet->balance <= 0) {
            $initialDeposit = 5000000;
            Transaction::create([
                'rt_id' => $rtId,
                'account_id' => $cashWallet->id,
                'type' => 'IN',
                'amount' => $initialDeposit,
                'category' => 'IURAN',
                'description' => 'Saldo Awal Kas Tunai (Seeding)',
                'status' => 'PAID',
                'date' => now()->subMonths(3),
                'user_id' => User::where('rt_id', $rtId)->first()->id ?? 1
            ]);
            $cashWallet->increment('balance', $initialDeposit);
        }

        if ($bankWallet->balance <= 0) {
            $bankDeposit = 10000000;
            Transaction::create([
                'rt_id' => $rtId,
                'account_id' => $bankWallet->id,
                'type' => 'IN',
                'amount' => $bankDeposit,
                'category' => 'HIBAH',
                'description' => 'Saldo Awal Rekening Bank (Seeding)',
                'status' => 'PAID',
                'date' => now()->subMonths(3),
                'user_id' => User::where('rt_id', $rtId)->first()->id ?? 1
            ]);
            $bankWallet->increment('balance', $bankDeposit);
        }

        // 2. Tambahkan Data Baru (KasTransactions)
        // Denda Ronda (IN)
        $dendaIn = [
            ['amount' => 20000, 'desc' => 'Denda Ronda: Budi Santoso (Tidak Hadir)', 'date' => now()->subDays(5)],
            ['amount' => 5000, 'desc' => 'Denda Ronda: Siti Aminah (Telat)', 'date' => now()->subDays(3)],
        ];

        foreach ($dendaIn as $d) {
            KasTransaction::create([
                'rt_id' => $rtId,
                'amount' => $d['amount'],
                'direction' => 'IN',
                'source_type' => 'DENDA',
                'description' => $d['desc'],
                'created_at' => $d['date']
            ]);
        }

        // Kas Manual (IN) - Donasi / Sumbangan
        $manualIn = [
            ['amount' => 1000000, 'desc' => 'Sumbangan Warga untuk 17 Agustus', 'date' => now()->subDays(10)],
            ['amount' => 250000, 'desc' => 'Penjualan Barang Bekas Inventaris', 'date' => now()->subDays(2)],
        ];

        foreach ($manualIn as $m) {
            KasTransaction::create([
                'rt_id' => $rtId,
                'amount' => $m['amount'],
                'direction' => 'IN',
                'source_type' => 'KAS_MANUAL',
                'description' => $m['desc'],
                'created_at' => $m['date']
            ]);
        }

        // Pengeluaran Baru (OUT)
        $newOut = [
            ['amount' => 300000, 'desc' => 'Konsumsi Rapat Bulanan', 'date' => now()->subDays(4)],
            ['amount' => 50000, 'desc' => 'Beli Lampu Pos Ronda', 'date' => now()->subDays(1)],
        ];

        foreach ($newOut as $o) {
            KasTransaction::create([
                'rt_id' => $rtId,
                'amount' => $o['amount'],
                'direction' => 'OUT',
                'source_type' => 'PENGELUARAN_RT',
                'description' => $o['desc'],
                'created_at' => $o['date']
            ]);
        }

        $this->command->info('Finance Demo Data Seeded Successfully!');
    }
}
