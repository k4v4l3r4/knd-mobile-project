<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\RondaParticipant;
use App\Models\RondaSchedule;
use App\Models\RondaLocation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Carbon\Carbon;

class RondaController extends Controller
{
    /**
     * Get current schedule (single card).
     */
    public function index(Request $request)
    {
        $user = Auth::user();
        $today = now()->format('Y-m-d');

        // Check active schedules
        $schedules = RondaSchedule::with(['participants.user', 'participants'])
        ->where('rt_id', $user->rt_id)
        ->where('status', 'ACTIVE')
        ->orderByDesc('created_at')
        ->get();

        // Deactivate expired schedules
        foreach ($schedules as $schedule) {
            if ($schedule->end_date < $today) {
                $schedule->status = 'INACTIVE';
                $schedule->save();
            }
        }

        // Re-fetch active only
        $activeSchedules = $schedules->where('status', 'ACTIVE')->values();

        if ($activeSchedules->isEmpty()) {
            return response()->json([
                'success' => true,
                'message' => 'Belum Ada Jadwal Aktif',
                'data' => null,
                'all_schedules' => []
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Jadwal Ronda Aktif',
            'data' => $activeSchedules->first(),
            'all_schedules' => $activeSchedules
        ]);
    }

    /**
     * Scan QR Code for Attendance.
     */
    public function scanAttendance(Request $request)
    {
        $validated = $request->validate([
            'qr_token' => 'required|string',
            'latitude' => 'required|numeric',
            'longitude' => 'required|numeric',
        ]);

        $user = Auth::user();
        if (!$user->rt_id) {
            return response()->json([
                'success' => false,
                'message' => 'Anda tidak terdaftar di RT manapun'
            ], 403);
        }

        // 1. Find Location by Token (support manual check-in with special token)
        $location = null;
        $isManualCheckIn = in_array($validated['qr_token'], ['manual-checkin-gps', 'manual-checkout']);
        
        if (!$isManualCheckIn) {
            // Regular QR code scan - find location by token
            $location = RondaLocation::where('qr_token', $validated['qr_token'])->first();
            if (!$location) {
                return response()->json([
                    'success' => false,
                    'message' => 'QR Code tidak valid atau lokasi tidak ditemukan'
                ], 404);
            }

            // Check Token Expiration
            if ($location->token_expires_at && Carbon::now()->gt($location->token_expires_at)) {
                return response()->json([
                    'success' => false,
                    'message' => 'QR Token sudah kadaluarsa. Minta petugas untuk refresh QR Code.'
                ], 400);
            }

            // Check if location belongs to same RT
            if ($location->rt_id !== $user->rt_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Lokasi ini bukan milik RT Anda'
                ], 403);
            }
        } else {
            // Manual check-in: Find active schedule location for this user
            $today = now()->toDateString();
            $schedule = RondaSchedule::where('rt_id', $user->rt_id)
                ->where('status', 'ACTIVE')
                ->where('start_date', '<=', $today)
                ->where('end_date', '>=', $today)
                ->whereHas('participants', function($q) use ($user) {
                    $q->where('user_id', $user->id);
                })
                ->first();

            if ($schedule) {
                // Get the first location associated with this schedule or create one
                $location = RondaLocation::where('rt_id', $user->rt_id)->first();
                
                if (!$location) {
                    // Create a default location based on user's current position
                    $location = RondaLocation::create([
                        'rt_id' => $user->rt_id,
                        'name' => 'Lokasi Default - ' . date('Y-m-d'),
                        'latitude' => $validated['latitude'],
                        'longitude' => $validated['longitude'],
                        'radius_meters' => 100,
                        'qr_token' => Str::random(32),
                        'token_expires_at' => now()->addDays(30),
                    ]);
                }
            }
            
            if (!$location) {
                return response()->json([
                    'success' => false,
                    'message' => 'Tidak ada jadwal ronda aktif hari ini. Hubungi admin RT.'
                ], 404);
            }
        }

        // 2. Calculate Distance (Haversine Formula)
        $earthRadius = 6371000; // meters

        $latFrom = deg2rad($validated['latitude']);
        $lonFrom = deg2rad($validated['longitude']);
        $latTo = deg2rad($location->latitude);
        $lonTo = deg2rad($location->longitude);

        $latDelta = $latTo - $latFrom;
        $lonDelta = $lonTo - $lonFrom;

        $angle = 2 * asin(sqrt(pow(sin($latDelta / 2), 2) +
            cos($latFrom) * cos($latTo) * pow(sin($lonDelta / 2), 2)));

        $distance = $angle * $earthRadius;

        if ($distance > $location->radius_meters) {
            return response()->json([
                'success' => false,
                'message' => "Anda berada di luar radius lokasi (" . round($distance) . " meter). Harap mendekat ke pos ronda."
            ], 400);
        }

        // 3. Find Active Schedule for User TODAY
        $today = now()->toDateString();
        
        $schedule = RondaSchedule::where('rt_id', $user->rt_id)
            ->where('status', 'ACTIVE')
            ->where('start_date', '<=', $today)
            ->where('end_date', '>=', $today)
            ->whereHas('participants', function($q) use ($user) {
                $q->where('user_id', $user->id);
            })
            ->first();

        if (!$schedule) {
            return response()->json([
                'success' => false,
                'message' => 'Anda tidak memiliki jadwal ronda aktif hari ini'
            ], 404);
        }

        // 4. Validate Time Window (Strict)
        $now = Carbon::now();
        $currentTime = $now->format('H:i');
        $startTime = $schedule->start_time; // e.g., "22:00"
        $endTime = $schedule->end_time;     // e.g., "04:00"

        $isValidTime = false;

        if ($startTime <= $endTime) {
            // Same day shift (e.g., 08:00 to 16:00)
            if ($currentTime >= $startTime && $currentTime <= $endTime) {
                $isValidTime = true;
            }
        } else {
            // Cross day shift (e.g., 22:00 to 04:00)
            if ($currentTime >= $startTime || $currentTime <= $endTime) {
                $isValidTime = true;
            }
        }

        if (!$isValidTime) {
            return response()->json([
                'success' => false,
                'message' => "Absensi hanya dapat dilakukan pada jam operasional ronda ($startTime - $endTime)"
            ], 400);
        }

        // 5. Update Status (Clock In or Clock Out)
        $participant = RondaParticipant::where('schedule_id', $schedule->id)
            ->where('user_id', $user->id)
            ->first();

        // If already PRESENT, check if we should Clock Out
        if ($participant->status === 'PRESENT') {
            // If already clocked out, just return info
            if ($participant->clock_out_at) {
                return response()->json([
                    'success' => true,
                    'message' => 'Anda sudah melakukan Clock Out sebelumnya.',
                    'data' => $participant
                ]);
            }

            // Perform Clock Out
            $participant->update([
                'clock_out_at' => now(),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Clock Out Berhasil! Hati-hati di jalan.',
                'data' => $participant
            ]);
        }

        // Clock In Logic (First Scan)
        $participant->update([
            'status' => 'PRESENT',
            'attendance_at' => now(),
            'attendance_lat' => $validated['latitude'],
            'attendance_long' => $validated['longitude'],
            'attendance_method' => 'QR',
            'attendance_distance' => $distance,
            'ronda_location_id' => $location->id,
            'is_fined' => false,
            'fine_amount' => 0
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Absensi Masuk Berhasil! Terima kasih telah bertugas.',
            'data' => $participant
        ]);
    }

    /**
     * Submit Permission (Izin) for Ronda.
     */
    public function permitAttendance(Request $request)
    {
        $validated = $request->validate([
            'notes' => 'required|string|max:255',
            // Optional: require photo proof
        ]);

        $user = Auth::user();
        $today = now()->toDateString();
        
        // Find Active Schedule for User TODAY
        $schedule = RondaSchedule::where('rt_id', $user->rt_id)
            ->where('status', 'ACTIVE')
            ->where('start_date', '<=', $today)
            ->where('end_date', '>=', $today)
            ->whereHas('participants', function($q) use ($user) {
                $q->where('user_id', $user->id);
            })
            ->first();

        if (!$schedule) {
            return response()->json([
                'success' => false,
                'message' => 'Anda tidak memiliki jadwal ronda aktif hari ini'
            ], 404);
        }

        $participant = RondaParticipant::where('schedule_id', $schedule->id)
            ->where('user_id', $user->id)
            ->first();

        if ($participant->status === 'PRESENT') {
            return response()->json([
                'success' => false,
                'message' => 'Anda sudah melakukan absensi (Hadir). Tidak dapat mengajukan izin.'
            ], 400);
        }

        if ($participant->status === 'EXCUSED') {
             return response()->json([
                'success' => true,
                'message' => 'Anda sudah mengajukan izin sebelumnya',
                'data' => $participant
            ]);
        }

        $participant->update([
            'status' => 'EXCUSED',
            'notes' => $validated['notes'],
            'is_fined' => false,
            'fine_amount' => 0
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Izin berhasil diajukan',
            'data' => $participant
        ]);
    }

    /**
     * Close schedule and mark absent participants.
     * Usually called by admin or scheduled job.
     */
    public function closeSchedule(Request $request, $id, \App\Services\RondaFineService $fineService)
    {
        $user = Auth::user();
        if (!in_array(strtoupper($user->role), ['ADMIN_RT', 'RT'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $schedule = RondaSchedule::find($id);
        if (!$schedule) {
            return response()->json(['message' => 'Jadwal tidak ditemukan'], 404);
        }

        if ($schedule->rt_id !== $user->rt_id) {
            return response()->json(['message' => 'Unauthorized access to other RT schedule'], 403);
        }

        // 1. Mark PENDING as ABSENT
        $participants = RondaParticipant::where('schedule_id', $schedule->id)
            ->where('status', 'PENDING')
            ->get();

        $count = 0;
        foreach ($participants as $p) {
            $p->update([
                'status' => 'ABSENT',
                // is_fined and fine_amount will be handled by RondaFineService
            ]);
            $count++;
        }

        // 2. Generate Fines (using Service)
        $fineService->generateForSchedule($schedule->id);

        return response()->json([
            'success' => true,
            'message' => "Jadwal ditutup. $count peserta ditandai Alpha. Denda telah dikalkulasi.",
            'data' => [
                'absent_count' => $count
            ]
        ]);
    }

    /**
     * Create or update schedule (Daily or Weekly).
     */
    public function store(Request $request)
    {
        $user = Auth::user();
        if (!in_array(strtoupper($user->role), ['ADMIN_RT', 'RT'])) {
            return response()->json([
                'success' => false,
                'message' => 'Anda tidak memiliki akses untuk membuat jadwal'
            ], 403);
        }

        try {
            $validated = $request->validate([
                'rt_id' => 'nullable|exists:wilayah_rt,id',
                'schedule_type' => 'required|in:DAILY,WEEKLY',
                'start_date' => 'required|date',
                'start_time' => 'required|date_format:H:i',
                'end_time' => 'required|date_format:H:i',
                'officers' => 'array',
                'officers.*' => 'exists:users,id',
                'status' => 'nullable|in:ACTIVE,INACTIVE',
                'shift_name' => 'nullable|string|max:100'
            ]);

            // Log validation result
            \Illuminate\Support\Facades\Log::info('Ronda schedule validation passed', [
                'user_id' => $user->id,
                'user_role' => $user->role,
                'user_rt_id' => $user->rt_id,
                'validated_data' => $validated,
            ]);

            $rtId = $validated['rt_id'] ?? (Auth::user()->rt_id ?? null);
            
            // Security: Ensure RT/ADMIN_RT can only create for their own RT
            if ($user->rt_id && $rtId != $user->rt_id) {
                return response()->json(['message' => 'Unauthorized. Anda hanya bisa membuat jadwal untuk RT Anda sendiri.'], 403);
            }
            
            if (!$rtId) {
                \Illuminate\Support\Facades\Log::error('RT ID is null', [
                    'user_id' => $user->id,
                    'user_rt_id' => $user->rt_id,
                    'validated_rt_id' => $validated['rt_id'] ?? null,
                ]);
                
                return response()->json([
                    'success' => false,
                    'message' => 'RT tidak diketahui. Pastikan pengguna memiliki rt_id yang valid.'
                ], 422);
            }

            $startDate = \Carbon\Carbon::parse($validated['start_date']);
            $scheduleType = $validated['schedule_type'];
            
            if ($scheduleType === 'DAILY') {
                $endDate = $startDate->copy()->format('Y-m-d');
                $shiftName = $validated['shift_name'] ?? ('Ronda Harian (' . $startDate->isoFormat('dddd') . ')');
            } else {
                $endDate = $startDate->copy()->addDays(6)->format('Y-m-d');
                $shiftName = $validated['shift_name'] ?? 'Ronda Mingguan';
            }

            $overlap = RondaSchedule::where('rt_id', $rtId)
                ->where('start_date', '<=', $endDate)
                ->where('end_date', '>=', $validated['start_date'])
                ->where('status', 'ACTIVE')
                ->where('shift_name', $shiftName)
                ->exists();

            if ($overlap) {
                return response()->json([
                    'success' => false,
                    'message' => 'Jadwal bertabrakan dengan jadwal aktif lain'
                ], 422);
            }

            $schedule = RondaSchedule::create([
                'rt_id' => $rtId,
                'schedule_type' => $scheduleType,
                'shift_name' => $shiftName,
                'start_date' => $validated['start_date'],
                'end_date' => $endDate,
                'start_time' => $validated['start_time'],
                'end_time' => $validated['end_time'],
                'status' => $validated['status'] ?? 'ACTIVE',
            ]);

            // Verify tenant_id was set by BelongsToTenant trait
            if (!$schedule->tenant_id) {
                \Illuminate\Support\Facades\Log::warning('Schedule created without tenant_id', [
                    'schedule_id' => $schedule->id,
                    'user_id' => $user->id,
                    'user_tenant_id' => $user->tenant_id ?? null,
                ]);
            }

            if (!empty($validated['officers'])) {
                foreach ($validated['officers'] as $userId) {
                    RondaParticipant::create([
                        'schedule_id' => $schedule->id,
                        'user_id' => $userId,
                        'status' => 'PENDING'
                    ]);
                }
            }

            // Log successful creation for debugging
            \Illuminate\Support\Facades\Log::info('Ronda schedule created successfully', [
                'schedule_id' => $schedule->id,
                'rt_id' => $rtId,
                'tenant_id' => $schedule->tenant_id,
                'user_id' => $user->id,
                'participants_count' => count($validated['officers'] ?? []),
            ]);

            $schedule->load(['participants.user' => function($query) {
                $query->select('id', 'name', 'phone');
            }]);

            return response()->json([
                'success' => true,
                'message' => 'Jadwal berhasil dibuat',
                'data' => $schedule
            ]);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('Failed to create ronda schedule', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'user_id' => $user->id,
                'rt_id' => $rtId ?? null,
                'payload' => $request->all(),
            ]);

            // Return more detailed error message in development
            $detailedMessage = config('app.debug') 
                ? 'Server error: ' . $e->getMessage() 
                : 'Terjadi kesalahan pada server saat menyimpan jadwal ronda.';

            return response()->json([
                'success' => false,
                'message' => $detailedMessage,
            ], 500);
        }
    }

    /**
     * Clone last schedule to a new period.
     */
    public function clone(Request $request)
    {
        $user = Auth::user();
        if (!in_array(strtoupper($user->role), ['ADMIN_RT', 'RT'])) {
            return response()->json([
                'success' => false,
                'message' => 'Anda tidak memiliki akses untuk menyalin jadwal'
            ], 403);
        }

        $validated = $request->validate([
            'rt_id' => 'nullable|exists:wilayah_rt,id',
            'start_date' => 'required|date',
        ]);

        $rtId = $validated['rt_id'] ?? (Auth::user()->rt_id ?? null);
        if (!$rtId) {
            return response()->json([
                'success' => false,
                'message' => 'RT tidak diketahui'
            ], 422);
        }

        $last = RondaSchedule::where('rt_id', $rtId)
            ->whereNotNull('start_date')
            ->orderByDesc('start_date')
            ->first();

        if (!$last) {
            return response()->json([
                'success' => false,
                'message' => 'Tidak ada jadwal sebelumnya untuk disalin'
            ], 404);
        }

        $startDate = \Carbon\Carbon::parse($validated['start_date']);
        $scheduleType = $last->schedule_type ?? 'WEEKLY'; // Default if null

        if ($scheduleType === 'DAILY') {
            $endDate = $startDate->copy()->format('Y-m-d');
            $shiftName = 'Ronda Harian (' . $startDate->isoFormat('dddd') . ')';
        } else {
            $endDate = $startDate->copy()->addDays(6)->format('Y-m-d');
            $shiftName = 'Ronda Mingguan';
        }

        $overlap = RondaSchedule::where('rt_id', $rtId)
            ->where('start_date', '<=', $endDate)
            ->where('end_date', '>=', $validated['start_date'])
            ->where('status', 'ACTIVE')
            ->exists();

        if ($overlap) {
            return response()->json([
                'success' => false,
                'message' => 'Jadwal bertabrakan dengan jadwal aktif lain'
            ], 422);
        }

        $new = RondaSchedule::create([
            'rt_id' => $rtId,
            'schedule_type' => $scheduleType,
            'shift_name' => $shiftName,
            'start_date' => $validated['start_date'],
            'end_date' => $endDate,
            'start_time' => $last->start_time,
            'end_time' => $last->end_time,
            'status' => 'ACTIVE',
        ]);

        $lastParticipants = RondaParticipant::where('schedule_id', $last->id)->pluck('user_id')->all();
        foreach ($lastParticipants as $userId) {
            RondaParticipant::create([
                'schedule_id' => $new->id,
                'user_id' => $userId,
                'status' => 'PENDING'
            ]);
        }

        $new->load(['participants.user' => function($query) {
            $query->select('id', 'name', 'phone');
        }]);

        return response()->json([
            'success' => true,
            'message' => 'Jadwal berhasil disalin',
            'data' => $new
        ]);
    }

    /**
     * Update weekly schedule (times and officers).
     */
    public function update(Request $request, string $id)
    {
        $user = Auth::user();
        if (!in_array(strtoupper($user->role), ['ADMIN_RT', 'RT'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $schedule = RondaSchedule::find($id);
        if (!$schedule) {
            return response()->json([
                'success' => false,
                'message' => 'Jadwal tidak ditemukan'
            ], 404);
        }

        if ($schedule->rt_id !== $user->rt_id) {
            return response()->json(['message' => 'Unauthorized access to other RT schedule'], 403);
        }

        // Log the incoming request for debugging
        \Illuminate\Support\Facades\Log::info('Updating ronda schedule', [
            'schedule_id' => $id,
            'user_id' => $user->id,
            'payload' => $request->all()
        ]);

        try {
            $validated = $request->validate([
                'start_date' => 'nullable|date',
                'end_date'   => 'nullable|date|after_or_equal:start_date',
                'start_time' => 'nullable|date_format:H:i',
                'end_time' => 'nullable|date_format:H:i',
                'status' => 'nullable|in:ACTIVE,INACTIVE',
                'shift_name' => 'nullable|string|max:100',
                'officers' => 'nullable|array',
                'officers.*' => 'exists:users,id',
            ]);

            if (isset($validated['start_date'])) {
                $schedule->start_date = $validated['start_date'];
            }
            if (isset($validated['end_date'])) {
                $schedule->end_date = $validated['end_date'];
            }

            if (isset($validated['start_time'])) {
                $schedule->start_time = $validated['start_time'];
            }
            if (isset($validated['end_time'])) {
                $schedule->end_time = $validated['end_time'];
            }
            if (isset($validated['status'])) {
                $schedule->status = $validated['status'];
            }
            if (array_key_exists('shift_name', $validated)) {
                $schedule->shift_name = $validated['shift_name'];
            }
            $schedule->save();

            // Handle officers update
            if (isset($validated['officers'])) {
                // Delete existing participants
                RondaParticipant::where('schedule_id', $schedule->id)->delete();
                
                // Add new participants only if officers array is not empty
                if (!empty($validated['officers'])) {
                    foreach ($validated['officers'] as $userId) {
                        RondaParticipant::create([
                            'schedule_id' => $schedule->id,
                            'user_id' => $userId,
                            'status' => 'PENDING'
                        ]);
                    }
                }
            }

            $schedule->load(['participants.user' => function($query) {
                $query->select('id', 'name', 'phone');
            }]);

            return response()->json([
                'success' => true,
                'message' => 'Jadwal mingguan berhasil diperbarui',
                'data' => $schedule
            ]);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('Failed to update ronda schedule', [
                'schedule_id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'user_id' => $user->id,
                'payload' => $request->all(),
            ]);

            // Return more detailed error message in development
            $detailedMessage = config('app.debug') 
                ? 'Server error: ' . $e->getMessage() 
                : 'Terjadi kesalahan pada server saat memperbarui jadwal.';

            return response()->json([
                'success' => false,
                'message' => $detailedMessage,
            ], 500);
        }
    }

    /**
     * Assign a citizen (warga) to a schedule.
     */
    public function assignWarga(Request $request, string $id)
    {
        $user = Auth::user();
        if (!in_array(strtoupper($user->role), ['ADMIN_RT', 'RT'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $schedule = RondaSchedule::find($id);

        if (!$schedule) {
            return response()->json([
                'success' => false,
                'message' => 'Jadwal tidak ditemukan'
            ], 404);
        }

        if ($schedule->rt_id !== $user->rt_id) {
            return response()->json(['message' => 'Unauthorized access to other RT schedule'], 403);
        }

        $request->validate([
            'user_id' => 'required|exists:users,id'
        ]);

        // Check duplicate
        $exists = RondaParticipant::where('schedule_id', $id)
            ->where('user_id', $request->user_id)
            ->exists();

        if ($exists) {
            return response()->json([
                'success' => false,
                'message' => 'Warga sudah terdaftar di jadwal ini'
            ], 422);
        }

        $participant = RondaParticipant::create([
            'schedule_id' => $id,
            'user_id' => $request->user_id,
            'status' => 'PENDING' // Default
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Warga berhasil ditambahkan ke jadwal',
            'data' => $participant
        ]);
    }

    /**
     * Remove a citizen from a schedule.
     */
    public function removeWarga(string $id, string $userId)
    {
        $user = Auth::user();
        if (!in_array(strtoupper($user->role), ['ADMIN_RT', 'RT'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $schedule = RondaSchedule::find($id);
        if (!$schedule) {
             return response()->json([
                'success' => false,
                'message' => 'Jadwal tidak ditemukan'
            ], 404);
        }

        if ($schedule->rt_id !== $user->rt_id) {
            return response()->json(['message' => 'Unauthorized access to other RT schedule'], 403);
        }

        $participant = RondaParticipant::where('schedule_id', $id)
            ->where('user_id', $userId)
            ->first();

        if (!$participant) {
            return response()->json([
                'success' => false,
                'message' => 'Warga tidak ditemukan di jadwal ini'
            ], 404);
        }

        $participant->delete();

        return response()->json([
            'success' => true,
            'message' => 'Warga berhasil dihapus dari jadwal'
        ]);
    }

    /**
     * Delete weekly schedule.
     */
    public function destroy(string $id)
    {
        $user = Auth::user();
        if (!in_array(strtoupper($user->role), ['ADMIN_RT', 'RT'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $schedule = RondaSchedule::find($id);

        if (!$schedule) {
            return response()->json([
                'success' => false,
                'message' => 'Jadwal tidak ditemukan'
            ], 404);
        }

        if ($schedule->rt_id !== $user->rt_id) {
            return response()->json(['message' => 'Unauthorized access to other RT schedule'], 403);
        }

        // Delete participants manually to ensure cleanup
        RondaParticipant::where('schedule_id', $schedule->id)->delete();
        
        $schedule->delete();

        return response()->json([
            'success' => true,
            'message' => 'Jadwal berhasil dihapus'
        ]);
    }

    /**
     * Update participant attendance status.
     */
    public function updateAttendance(Request $request, string $scheduleId, string $userId)
    {
        $user = Auth::user();
        if (!in_array(strtoupper($user->role), ['ADMIN_RT', 'RT'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $schedule = RondaSchedule::find($scheduleId);
        if (!$schedule) {
             return response()->json([
                'success' => false,
                'message' => 'Jadwal tidak ditemukan'
            ], 404);
        }

        if ($schedule->rt_id !== $user->rt_id) {
            return response()->json(['message' => 'Unauthorized access to other RT schedule'], 403);
        }

        $participant = RondaParticipant::where('schedule_id', $scheduleId)
            ->where('user_id', $userId)
            ->first();

        if (!$participant) {
            return response()->json([
                'success' => false,
                'message' => 'Peserta tidak ditemukan di jadwal ini'
            ], 404);
        }

        $validated = $request->validate([
            'status' => 'required|in:PRESENT,ABSENT,PENDING,EXCUSED',
            'notes' => 'nullable|string',
            'fine_amount' => 'nullable|numeric|min:0'
        ]);

        $status = $validated['status'];
        $notes = $validated['notes'] ?? $participant->notes;
        $fineAmount = $validated['fine_amount'] ?? 0;
        $isFined = false;

        if ($status === 'PRESENT') {
            $participant->attendance_at = now();
            $isFined = false;
            $fineAmount = 0;
        } elseif ($status === 'ABSENT') {
            $participant->attendance_at = null;
            $isFined = true;
            // Use provided fine amount or default if not set
            if ($fineAmount <= 0) {
                 // Hardcoded default for now, could be setting
                 $fineAmount = 50000;
            }
        } elseif ($status === 'EXCUSED') {
            $participant->attendance_at = null;
            $isFined = false;
            $fineAmount = 0;
        } else { // PENDING
            $participant->attendance_at = null;
            $isFined = false;
            $fineAmount = 0;
        }

        $participant->update([
            'status' => $status,
            'notes' => $notes,
            'is_fined' => $isFined,
            'fine_amount' => $fineAmount
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Status kehadiran berhasil diperbarui',
            'data' => $participant
        ]);
    }
}
