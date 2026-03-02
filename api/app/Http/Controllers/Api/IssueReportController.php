<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\IssueReport;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use App\Models\Scopes\TenantScope;

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
        
        $query = IssueReport::where('user_id', $user->id);

        if ($request->has('status') && $request->status !== 'ALL') {
            $query->where('status', $request->status);
        }

        $issues = $query->latest()->get();

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

        // Bypass TenantScope to ensure Admin sees all reports in their RT regardless of tenant_id mismatch
        $query = IssueReport::withoutGlobalScope(TenantScope::class)
            ->with('user:id,name,photo_url,phone');

        // Filter by RT ID for Admin RT
        // Ensure we explicitly use auth()->user()->rt_id as requested
        $rt_id = $user->rt_id;
        
        if ($rt_id) {
            $query->where('rt_id', $rt_id);
        }

        // Case-insensitive status filter
        // If status is 'pending', convert to 'PENDING' or handle case insensitivity
        if ($request->has('status') && strtoupper($request->status) !== 'ALL') {
            $status = strtoupper($request->status);
            $query->where(function($q) use ($status) {
                $q->where('status', $status)
                  ->orWhere('status', strtolower($status)); // Handle potential lowercase in DB
            });
        }

        $issues = $query->latest()->get();

        // Debug Logging
        Log::info('Admin RT ID: ' . ($rt_id ?? 'NULL'));
        Log::info('Status Filter: ' . ($request->status ?? 'NONE'));
        Log::info('Reports Found: ' . $issues->count());

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

        $issue = DB::transaction(function () use ($user, $request, $mappedCategory, $photoUrl) {
            $issue = IssueReport::create([
                'rt_id' => $user->rt_id,
                'user_id' => $user->id,
                'title' => $request->title,
                'description' => $request->description,
                'category' => $mappedCategory,
                'photo_url' => $photoUrl,
                'status' => 'PENDING',
            ]);

            $adminRoles = ['ADMIN_RT', 'RT', 'SECRETARY', 'TREASURER', 'ADMIN_RW'];
            $admins = User::query()
                ->where('rt_id', $user->rt_id)
                ->whereIn('role', $adminRoles)
                ->get(['id']);

            foreach ($admins as $admin) {
                Notification::create([
                    'user_id' => $admin->id,
                    'title' => 'Laporan Warga Baru',
                    'message' => ($user->name ?: 'Warga') . ': ' . $issue->title,
                    'type' => 'REPORT',
                    'related_id' => $issue->id,
                    'url' => '/dashboard/laporan-warga',
                    'is_read' => false,
                ]);
            }

            return $issue;
        });

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
