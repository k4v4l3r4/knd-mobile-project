<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Asset;
use App\Models\AssetLoan;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class AssetLoanController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();
        $query = AssetLoan::with(['user', 'asset'])->latest();

        // If user is not admin (Warga), only show their own loans
        // Assuming we have role check, for now let's rely on simple logic:
        // Or if 'mine' query param is present
        if ($request->has('mine')) {
            $query->where('user_id', $user->id);
        }

        $loans = $query->get();

        return response()->json([
            'success' => true,
            'message' => 'Daftar Peminjaman Aset',
            'data' => $loans
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'asset_id' => 'required|exists:assets,id',
            'quantity' => 'required|integer|min:1',
            'loan_date' => 'required|date|after_or_equal:today',
            'return_date' => 'required|date|after_or_equal:loan_date',
            'purpose' => 'required|string',
        ]);

        $asset = Asset::findOrFail($request->asset_id);

        // Check if enough stock available
        if ($asset->available_quantity < $request->quantity) {
            return response()->json([
                'success' => false,
                'message' => 'Stok aset tidak mencukupi saat ini.'
            ], 400);
        }

        $loan = AssetLoan::create([
            'user_id' => Auth::id(),
            'asset_id' => $request->asset_id,
            'quantity' => $request->quantity,
            'loan_date' => $request->loan_date,
            'return_date' => $request->return_date,
            'purpose' => $request->purpose,
            'status' => 'PENDING',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Pengajuan peminjaman berhasil dibuat',
            'data' => $loan
        ], 201);
    }

    public function update(Request $request, string $id)
    {
        // Typically Admin Only
        $loan = AssetLoan::findOrFail($id);
        $asset = $loan->asset;

        $request->validate([
            'status' => 'required|in:APPROVED,REJECTED,RETURNED',
            'admin_note' => 'nullable|string',
        ]);

        $newStatus = $request->status;
        $oldStatus = $loan->status;

        if ($newStatus === $oldStatus) {
            // Just update note maybe?
            $loan->update(['admin_note' => $request->admin_note]);
            return response()->json(['success' => true, 'message' => 'Tidak ada perubahan status', 'data' => $loan]);
        }

        DB::beginTransaction();
        try {
            // Logic for Stock Management
            if ($newStatus === 'APPROVED' && $oldStatus !== 'APPROVED') {
                // Check stock again to be safe
                if ($asset->available_quantity < $loan->quantity) {
                    throw new \Exception('Stok tidak cukup untuk menyetujui peminjaman ini.');
                }
                $asset->decrement('available_quantity', $loan->quantity);
            } 
            elseif (($newStatus === 'RETURNED' || $newStatus === 'REJECTED') && $oldStatus === 'APPROVED') {
                // Return stock
                $asset->increment('available_quantity', $loan->quantity);
            }
            
            // If changing from REJECTED/RETURNED back to APPROVED (Unlikely flow but possible)
            // Handled by first condition

            $loan->update([
                'status' => $newStatus,
                'admin_note' => $request->admin_note
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Status peminjaman berhasil diperbarui',
                'data' => $loan->fresh()
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Gagal memperbarui status: ' . $e->getMessage()
            ], 400);
        }
    }
}
