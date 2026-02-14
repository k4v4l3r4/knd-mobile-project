<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BansosHistory;
use App\Models\BansosRecipient;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;

class BansosController extends Controller
{
    /**
     * Display a listing of recipients (DTKS).
     */
    public function index(Request $request)
    {
        $user = Auth::user();
        
        // Ensure user is admin_rt
        if ($user->role !== 'ADMIN_RT') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $query = BansosRecipient::with('user')
            ->where('rt_id', $user->rt_id);

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        $recipients = $query->latest()->paginate(10);

        return response()->json([
            'success' => true,
            'message' => 'Daftar Penerima Bansos',
            'data' => $recipients
        ]);
    }

    /**
     * Store a new recipient.
     */
    public function store(Request $request)
    {
        $user = Auth::user();

        if ($user->role !== 'ADMIN_RT') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'user_id' => 'required|exists:users,id',
            'no_kk' => 'nullable|string',
            'status' => 'required|in:LAYAK,TIDAK_LAYAK,PENDING',
            'notes' => 'nullable|string',
            'score' => 'nullable|integer|min:0|max:10',
        ]);

        // Check if already exists in this RT
        $exists = BansosRecipient::where('rt_id', $user->rt_id)
            ->where('user_id', $request->user_id)
            ->exists();

        if ($exists) {
            return response()->json(['message' => 'Warga sudah terdaftar di DTKS'], 422);
        }

        $recipient = BansosRecipient::create([
            'rt_id' => $user->rt_id,
            'user_id' => $request->user_id,
            'no_kk' => $request->no_kk,
            'status' => $request->status,
            'notes' => $request->notes,
            'score' => $request->score ?? 0,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Penerima berhasil ditambahkan',
            'data' => $recipient
        ], 201);
    }

    /**
     * Update recipient status.
     */
    public function update(Request $request, $id)
    {
        $user = Auth::user();

        if ($user->role !== 'ADMIN_RT') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $recipient = BansosRecipient::where('rt_id', $user->rt_id)->find($id);

        if (!$recipient) {
            return response()->json(['message' => 'Data tidak ditemukan'], 404);
        }

        $request->validate([
            'status' => 'sometimes|required|in:LAYAK,TIDAK_LAYAK,PENDING',
            'notes' => 'nullable|string',
            'score' => 'nullable|integer',
            'no_kk' => 'nullable|string',
        ]);

        $recipient->update($request->only(['status', 'notes', 'score', 'no_kk']));

        return response()->json([
            'success' => true,
            'message' => 'Data berhasil diperbarui',
            'data' => $recipient
        ]);
    }

    /**
     * Delete recipient.
     */
    public function destroy($id)
    {
        $user = Auth::user();

        if ($user->role !== 'ADMIN_RT') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $recipient = BansosRecipient::where('rt_id', $user->rt_id)->find($id);

        if (!$recipient) {
            return response()->json(['message' => 'Data tidak ditemukan'], 404);
        }

        $recipient->delete();

        return response()->json([
            'success' => true,
            'message' => 'Data berhasil dihapus'
        ]);
    }

    /**
     * Distribute aid (create history).
     */
    public function distribute(Request $request, $id)
    {
        $user = Auth::user();

        if ($user->role !== 'ADMIN_RT') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $recipient = BansosRecipient::where('rt_id', $user->rt_id)->find($id);

        if (!$recipient) {
            return response()->json(['message' => 'Penerima tidak ditemukan'], 404);
        }

        if ($recipient->status !== 'LAYAK') {
            return response()->json(['message' => 'Penerima belum berstatus LAYAK'], 422);
        }

        $request->validate([
            'program_name' => 'required|string',
            'date_received' => 'required|date',
            'amount' => 'nullable|numeric',
            'evidence_photo' => 'nullable|image|max:2048',
        ]);

        $evidencePath = null;
        if ($request->hasFile('evidence_photo')) {
            $evidencePath = $request->file('evidence_photo')->store('bansos_evidence', 'public');
        }

        $history = $recipient->histories()->create([
            'program_name' => $request->program_name,
            'date_received' => $request->date_received,
            'amount' => $request->amount,
            'evidence_photo' => $evidencePath,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Penyaluran berhasil dicatat',
            'data' => $history
        ], 201);
    }

    /**
     * Get distribution history.
     */
    public function history(Request $request)
    {
        $user = Auth::user();

        if ($user->role !== 'ADMIN_RT') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $query = BansosHistory::with(['recipient.user'])
            ->whereHas('recipient', function($q) use ($user) {
                $q->where('rt_id', $user->rt_id);
            });

        $histories = $query->latest()->paginate(10);

        return response()->json([
            'success' => true,
            'message' => 'Riwayat Penyaluran',
            'data' => $histories
        ]);
    }
}
