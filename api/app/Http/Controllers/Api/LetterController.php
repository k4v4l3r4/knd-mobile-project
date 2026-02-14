<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Letter;
use App\Models\Notification;
use App\Models\WilayahRt;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;

class LetterController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $user = Auth::user();
        $query = Letter::with(['user:id,name,phone,address', 'rt']);

        // If user is Admin RT, filter by their RT
        if (in_array(strtoupper($user->role), ['ADMIN_RT', 'RT'])) {
            $query->where('rt_id', $user->rt_id);
        }
        // If user is Warga (not admin), show only their own
        elseif (!in_array(strtoupper($user->role), ['SUPER_ADMIN', 'ADMIN_RW'])) {
            $query->where('user_id', $user->id);
        }

        // Filter by status if provided
        if ($request->has('status') && $request->status !== '') {
            $query->where('status', $request->status);
        }

        $letters = $query->latest()->get();

        return response()->json([
            'success' => true,
            'message' => 'List Surat Pengantar',
            'data' => $letters
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $request->validate([
            // Updated validation to check against letter_types table
            'type' => 'required|exists:letter_types,code',
            'purpose' => 'required|string|max:255',
            'user_id' => 'nullable|exists:users,id', // Admin can specify user_id
        ]);

        $user = Auth::user();
        $targetUserId = $user->id;

        // If Admin is creating for a Warga
        if (in_array($user->role, ['admin_rt', 'super_admin', 'ADMIN_RT', 'SUPER_ADMIN']) && $request->has('user_id')) {
            $targetUserId = $request->user_id;
        }

        $letter = Letter::create([
            'rt_id' => $user->rt_id, // Assuming same RT for now, or fetch from target user
            'user_id' => $targetUserId,
            'type' => $request->type,
            'purpose' => $request->purpose,
            'status' => 'PENDING',
        ]);

        // Notify Admin RT (if created by Warga)
        if ($targetUserId === $user->id) {
             // Logic to notify admin
        } else {
             // Logic to notify Warga if created by Admin
             Notification::create([
                'user_id' => $targetUserId,
                'title' => 'Surat Baru Dibuat',
                'message' => "Admin telah membuat surat pengantar untuk Anda: {$request->type}",
                'type' => 'SURAT',
                'related_id' => $letter->id,
                'is_read' => false
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Permintaan surat berhasil dibuat',
            'data' => $letter
        ], 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        $letter = Letter::with(['user', 'rt'])->find($id);

        if (!$letter) {
            return response()->json([
                'success' => false,
                'message' => 'Surat tidak ditemukan'
            ], 404);
        }

        $user = Auth::user();
        // Authorization check
        if (!in_array($user->role, ['super_admin', 'admin_rt', 'admin_rw', 'SUPER_ADMIN', 'ADMIN_RT', 'ADMIN_RW']) && $letter->user_id !== $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized'
            ], 403);
        }

        return response()->json([
            'success' => true,
            'data' => $letter
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $letter = Letter::with(['user', 'rt.rw'])->find($id);

        if (!$letter) {
            return response()->json([
                'success' => false,
                'message' => 'Surat tidak ditemukan'
            ], 404);
        }

        $user = Auth::user();

        // Only Admin can update status/admin_note
        if (!in_array(strtoupper($user->role), ['SUPER_ADMIN', 'ADMIN_RT', 'RT', 'ADMIN_RW'])) {
            return response()->json([
                'success' => false,
                'message' => 'Hanya Admin yang dapat memproses surat'
            ], 403);
        }

        $request->validate([
            'status' => 'required|in:PENDING,APPROVED,REJECTED',
            'admin_note' => 'nullable|string',
        ]);

        $updateData = [
            'status' => $request->status,
            'admin_note' => $request->admin_note,
        ];

        // Process Approval
        if ($request->status === 'APPROVED' && $letter->status !== 'APPROVED') {
            // 1. Generate Letter Number
            // Format: NO/RT-RW/YEAR/MONTH/SEQUENCE
            $year = date('Y');
            $month = date('m');
            $rtNumber = $letter->rt->rt_number ?? '00';
            $rwNumber = $letter->rt->rw->rw_number ?? '00'; // Assuming relationship exists
            
            // Get sequence (count of letters this month + 1)
            $count = Letter::where('rt_id', $letter->rt_id)
                ->whereYear('created_at', $year)
                ->whereMonth('created_at', $month)
                ->where('status', 'APPROVED')
                ->count();
            $sequence = str_pad($count + 1, 3, '0', STR_PAD_LEFT);
            
            $letterNumber = sprintf("%s/RT%s-RW%s/%s/%s/%s", 
                $sequence, 
                $rtNumber, 
                $rwNumber, 
                $year, 
                $month,
                'SRT' // Code for Surat
            );

            $updateData['letter_number'] = $letterNumber;

            // 2. Generate PDF
            try {
                // Generate QR Code URL
                // We use a public API for QR Code image generation to avoid GD dependency issues
                // Content: Verification URL (e.g., frontend url to check status)
                $verificationUrl = env('FRONTEND_URL', 'http://localhost:3000') . "/verify-letter/" . $letter->id;
                $qrCodeUrl = "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=" . urlencode($verificationUrl);

                $approver = Auth::user();

                $pdfData = [
                    'letter' => $letter, // Pass letter object but with new number temporarily
                    'user' => $letter->user,
                    'rt_number' => $rtNumber,
                    'rw_number' => $rwNumber,
                    'subdistrict' => $letter->rt->subdistrict ?? 'Unknown',
                    'district' => $letter->rt->district ?? 'Unknown',
                    'city' => $letter->rt->city ?? 'Unknown',
                    'address' => $letter->rt->address ?? '',
                    'rt_chairman_name' => $approver->name, 
                    'approver' => $approver,
                    'qr_code_url' => $qrCodeUrl
                ];
                
                // Hack to inject letter_number into the object instance for the view
                $letter->letter_number = $letterNumber; 
                
                $pdf = Pdf::loadView('pdf.letter', $pdfData);
                $pdf->setPaper('A4', 'portrait');
                
                $fileName = 'surat_' . $letter->id . '_' . time() . '.pdf';
                $filePath = 'letters/' . $fileName;
                
                Storage::disk('public')->put($filePath, $pdf->output());
                
                $updateData['file_url'] = Storage::url($filePath);
                $updateData['qr_code_path'] = $qrCodeUrl; // Save the URL used

            } catch (\Exception $e) {
                return response()->json([
                    'success' => false,
                    'message' => 'Gagal generate PDF: ' . $e->getMessage()
                ], 500);
            }
        }

        $letter->update($updateData);

        // 3. Notification
        $title = $request->status === 'APPROVED' ? 'Surat Disetujui' : 'Surat Ditolak';
        $message = $request->status === 'APPROVED' 
            ? 'Pengajuan surat Anda telah disetujui. Silakan unduh dokumen.'
            : 'Pengajuan surat Anda ditolak. Alasan: ' . ($request->admin_note ?? '-');

        Notification::create([
            'user_id' => $letter->user_id,
            'title' => $title,
            'message' => $message,
            'type' => 'LETTER',
            'related_id' => $letter->id,
            'url' => '/layanan-surat', // Frontend route
            'is_read' => false
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Status surat berhasil diperbarui',
            'data' => $letter
        ]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $letter = Letter::find($id);

        if (!$letter) {
            return response()->json([
                'success' => false,
                'message' => 'Surat tidak ditemukan'
            ], 404);
        }

        $user = Auth::user();

        if ($letter->user_id !== $user->id && !in_array($user->role, ['super_admin', 'admin_rt', 'admin_rw'])) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized'
            ], 403);
        }
        
        if ($letter->user_id === $user->id && $letter->status !== 'PENDING') {
             return response()->json([
                'success' => false,
                'message' => 'Tidak dapat menghapus surat yang sudah diproses'
            ], 422);
        }

        // Delete file if exists
        if ($letter->file_url) {
            $path = str_replace('/storage/', '', $letter->file_url);
            Storage::disk('public')->delete($path);
        }

        $letter->delete();

        return response()->json([
            'success' => true,
            'message' => 'Surat berhasil dihapus'
        ]);
    }
}
