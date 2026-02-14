<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\RondaFine;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class RondaFineController extends Controller
{
    /**
     * Get All Fines for RT (Admin View).
     */
    public function index(Request $request)
    {
        $user = Auth::user();
        if (!$user->rt_id) {
            return response()->json(['message' => 'User not assigned to RT'], 403);
        }

        $query = RondaFine::with(['user', 'schedule'])
            ->where('rt_id', $user->rt_id);

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        $fines = $query->orderBy('generated_at', 'desc')->paginate(20);

        return response()->json([
            'success' => true,
            'data' => $fines
        ]);
    }

    /**
     * Get My Fines (Warga View).
     */
    public function myFines(Request $request)
    {
        $user = Auth::user();
        
        $fines = RondaFine::with(['schedule'])
            ->where('user_id', $user->id)
            ->orderBy('generated_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $fines
        ]);
    }

    /**
     * Mark Fine as Paid (Admin only).
     */
    public function markAsPaid($id)
    {
        $user = Auth::user();
        // Add check if user is admin/pengurus if needed. Assuming middleware handles basic auth.

        $fine = RondaFine::where('id', $id)
            ->where('rt_id', $user->rt_id)
            ->first();

        if (!$fine) {
            return response()->json(['message' => 'Denda tidak ditemukan'], 404);
        }

        if ($fine->status === 'PAID') {
            return response()->json(['message' => 'Denda sudah lunas sebelumnya'], 400);
        }

        try {
            \Illuminate\Support\Facades\DB::transaction(function () use ($fine, $user) {
                // 1. Update Fine
                $fine->update([
                    'status' => 'PAID',
                    'paid_at' => now()
                ]);

                // 2. Record to Kas
                \App\Services\KasService::recordTransaction(
                    $user->rt_id,
                    'DENDA',
                    $fine->id,
                    $fine->amount,
                    'IN',
                    "Pembayaran Denda Ronda: " . $fine->fine_type . " oleh " . ($fine->user->name ?? 'Warga')
                );
            });

            return response()->json([
                'success' => true,
                'message' => 'Denda ditandai lunas dan masuk Kas RT',
                'data' => $fine
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal memproses pembayaran: ' . $e->getMessage()
            ], 500);
        }
    }
}
