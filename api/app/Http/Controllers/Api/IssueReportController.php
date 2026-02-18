<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\IssueReport;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;

class IssueReportController extends Controller
{
    /**
     * Display a listing of the resource (Warga's history or Admin view).
     */
    public function index(Request $request)
    {
        $user = Auth::user();

        // If user is Admin, use Admin logic (Show all in RT)
        if (in_array(strtoupper($user->role), ['ADMIN_RT', 'RT', 'ADMIN_RW', 'SUPER_ADMIN'])) {
            return $this->indexAdmin($request);
        }
        
        $issues = IssueReport::where('user_id', $user->id)
            ->latest()
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Riwayat laporan berhasil diambil',
            'data' => $issues
        ]);
    }

    /**
     * Display a listing of the resource for Admin (All in RT).
     */
    public function indexAdmin(Request $request)
    {
        $user = Auth::user();
        
        // Ensure user is admin
        if (!in_array(strtoupper($user->role), ['ADMIN_RT', 'RT', 'ADMIN_RW', 'SUPER_ADMIN'])) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized access'
            ], 403);
        }

        $query = IssueReport::with('user:id,name,photo_url,phone')
            ->where('rt_id', $user->rt_id);

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        $issues = $query->latest()->get();

        return response()->json([
            'success' => true,
            'message' => 'Daftar laporan warga berhasil diambil',
            'data' => $issues
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $rawCategory = $request->input('category');
        $mappedCategory = null;

        if ($rawCategory) {
            $normalized = strtoupper($rawCategory);

            $mapping = [
                'KEBERSIHAN' => 'KEBERSIHAN',
                'KEAMANAN' => 'KEAMANAN',
                'INFRASTRUKTUR' => 'INFRASTRUKTUR',
                'LAINNYA' => 'LAINNYA',
            ];

            if (isset($mapping[$normalized])) {
                $mappedCategory = $mapping[$normalized];
            }
        }

        $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'required|string',
            'category' => 'required|string',
            'photo' => 'nullable|image|max:5120',
            'image' => 'nullable|image|max:5120',
        ]);

        if (!$mappedCategory) {
            return response()->json([
                'success' => false,
                'message' => 'Kategori laporan tidak valid',
            ], 422);
        }

        $user = Auth::user();
        $photoUrl = null;

        if ($request->hasFile('photo')) {
            $photoUrl = $request->file('photo')->store('issue_reports', 'public');
        } elseif ($request->hasFile('image')) {
            $photoUrl = $request->file('image')->store('issue_reports', 'public');
        }

        $issue = IssueReport::create([
            'rt_id' => $user->rt_id,
            'user_id' => $user->id,
            'title' => $request->title,
            'description' => $request->description,
            'category' => $mappedCategory,
            'photo_url' => $photoUrl,
            'status' => 'PENDING',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Laporan berhasil dikirim',
            'data' => $issue
        ], 201);
    }

    /**
     * Update the status of the specified resource.
     */
    public function updateStatus(Request $request, string $id)
    {
        $user = Auth::user();

        // Ensure user is admin
        if (!in_array(strtoupper($user->role), ['ADMIN_RT', 'RT', 'ADMIN_RW', 'SUPER_ADMIN'])) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized access'
            ], 403);
        }

        $request->validate([
            'status' => 'required|in:PENDING,PROCESSED,DONE,REJECTED'
        ]);

        $issue = IssueReport::where('rt_id', $user->rt_id)->find($id);

        if (!$issue) {
            return response()->json([
                'success' => false,
                'message' => 'Laporan tidak ditemukan'
            ], 404);
        }

        $issue->update([
            'status' => $request->status
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Status laporan berhasil diperbarui',
            'data' => $issue
        ]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $user = Auth::user();

        if (!in_array(strtoupper($user->role), ['ADMIN_RT', 'RT', 'ADMIN_RW', 'SUPER_ADMIN'])) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized access'
            ], 403);
        }

        $issue = IssueReport::where('rt_id', $user->rt_id)->find($id);

        if (!$issue) {
            return response()->json([
                'success' => false,
                'message' => 'Laporan tidak ditemukan'
            ], 404);
        }

        if ($issue->photo_url) {
            Storage::disk('public')->delete($issue->photo_url);
        }

        $issue->delete();

        return response()->json([
            'success' => true,
            'message' => 'Laporan berhasil dihapus'
        ]);
    }
}
