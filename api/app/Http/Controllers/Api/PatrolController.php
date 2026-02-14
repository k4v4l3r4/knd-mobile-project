<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PatrolSchedule;
use App\Models\PatrolMember;
use App\Models\RondaSchedule;
use App\Models\RondaParticipant;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;

use App\Models\WilayahRt; // Add this import

class PatrolController extends Controller
{
    /**
     * Get list jadwal 7 hari beserta anggotanya (untuk Web Admin).
     */
    public function index(Request $request)
    {
        $user = Auth::user();
        
        $userRole = $user->role;
        $roleCode = is_string($userRole) ? $userRole : ($userRole->role_code ?? '');

        \Illuminate\Support\Facades\Log::info('PatrolController index accessed by user: ' . $user->id . ' role: ' . $roleCode);
        
        if (!in_array($roleCode, ['admin_rt', 'ADMIN_RT', 'super_admin', 'SUPER_ADMIN'])) {
            \Illuminate\Support\Facades\Log::warning('PatrolController Unauthorized access attempt by user: ' . $user->id . ' role: ' . $roleCode);
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Determine RT ID
        $rtId = $user->rt_id;
        if (in_array($roleCode, ['super_admin', 'SUPER_ADMIN'])) {
            $rtId = $request->query('rt_id', 1); // Default to RT 1 for Super Admin if not provided
        }

        if (!$rtId) {
             return response()->json(['message' => 'RT ID is required'], 400);
        }

        // Fetch RT to get tenant_id (Important for Super Admin)
        $rt = WilayahRt::find($rtId);
        if (!$rt) {
             return response()->json(['message' => 'RT not found'], 404);
        }
        $tenantId = $rt->tenant_id;

        // Ensure schedules exist for all 7 days
        $days = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU', 'MINGGU'];
        $schedules = [];
        
        // Get week number from request, default to 1
        $weekNumber = $request->query('week', 1);

        foreach ($days as $day) {
            $schedule = PatrolSchedule::firstOrCreate(
                ['rt_id' => $rtId, 'day_of_week' => $day, 'week_number' => $weekNumber],
                [
                    'start_time' => '22:00', 
                    'end_time' => '04:00',
                    'tenant_id' => $tenantId // Explicitly set tenant_id
                ]
            );
            
            // Load members
            $schedule->load(['members.user']);
            $schedules[] = $schedule;
        }

        return response()->json([
            'success' => true,
            'data' => $schedules
        ]);
    }

    /**
     * Get today's schedule.
     */
    public function today(Request $request)
    {
        try {
            $user = Auth::user();
            $rtId = $user->rt_id;
            
            // Handle Super Admin
            $userRole = $user->role;
            $roleCode = is_string($userRole) ? $userRole : ($userRole->role_code ?? '');
            
            if (in_array($roleCode, ['super_admin', 'SUPER_ADMIN'])) {
                $rtId = $request->query('rt_id', 1);
            }

            if (!$rtId) {
                 return response()->json(['message' => 'RT ID is required'], 400);
            }

            // Fetch RT to get tenant_id
            $rt = WilayahRt::find($rtId);
            if (!$rt) {
                 return response()->json(['message' => 'RT not found'], 404);
            }
            $tenantId = $rt->tenant_id;

            // Get today's day name in Indonesian
            $dayMap = [
                'Sunday' => 'MINGGU',
                'Monday' => 'SENIN',
                'Tuesday' => 'SELASA',
                'Wednesday' => 'RABU',
                'Thursday' => 'KAMIS',
                'Friday' => 'JUMAT',
                'Saturday' => 'SABTU'
            ];
            $today = $dayMap[Carbon::now()->format('l')];
            $weekNumber = 1; // Default to week 1 for now

            $schedule = PatrolSchedule::firstOrCreate(
                ['rt_id' => $rtId, 'day_of_week' => $today, 'week_number' => $weekNumber],
                [
                    'start_time' => '22:00', 
                    'end_time' => '04:00',
                    'tenant_id' => $tenantId // Explicitly set tenant_id
                ]
            );

            $schedule->load(['members.user']);

            return response()->json([
                'success' => true,
                'data' => $schedule
            ]);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Error in PatrolController@today: ' . $e->getMessage() . "\n" . $e->getTraceAsString());
            return response()->json(['message' => 'Internal Server Error: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Admin atur siapa saja yang jaga di hari tertentu (Sync members).
     */
    public function updateMembers(Request $request, $id)
    {
        $user = Auth::user();
        
        $userRole = $user->role;
        $roleCode = is_string($userRole) ? $userRole : ($userRole->role_code ?? '');

        if (!in_array($roleCode, ['admin_rt', 'ADMIN_RT', 'super_admin', 'SUPER_ADMIN'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Determine RT ID
        $rtId = $user->rt_id;
        if (in_array($roleCode, ['super_admin', 'SUPER_ADMIN'])) {
            $rtId = $request->input('rt_id', 1); // Default to RT 1 for Super Admin
        }

        $schedule = PatrolSchedule::where('rt_id', $rtId)->find($id);
        if (!$schedule) {
            return response()->json(['message' => 'Schedule not found'], 404);
        }

        $request->validate([
            'user_ids' => 'array',
            'user_ids.*' => 'exists:users,id'
        ]);

        // Sync members: Delete existing and create new
        PatrolMember::where('patrol_schedule_id', $id)->delete();

        foreach ($request->user_ids as $userId) {
            PatrolMember::create([
                'patrol_schedule_id' => $id,
                'user_id' => $userId
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Members updated successfully',
            'data' => $schedule->load('members.user')
        ]);
    }

    /**
     * API Mobile untuk melihat "Siapa jaga malam ini?".
     */
    public function getTodaySchedule()
    {
        $user = Auth::user();
        $todayDate = now()->toDateString();
        
        // Get today's day name in Indonesian (uppercase)
        Carbon::setLocale('id');
        $todayDayName = strtoupper(Carbon::now()->isoFormat('dddd'));
        
        // Find active schedules covering today from RondaSchedule
        $schedules = RondaSchedule::with(['participants.user'])
            ->where('rt_id', $user->rt_id)
            ->where('status', 'ACTIVE')
            ->where('start_date', '<=', $todayDate)
            ->where('end_date', '>=', $todayDate)
            ->get();

        if ($schedules->isEmpty()) {
             return response()->json([
                'success' => true,
                'message' => 'No schedule found for today',
                'data' => [] // Return empty array
            ]);
        }

        $data = $schedules->map(function($schedule) use ($todayDayName) {
            // Transform participants to members
            $members = $schedule->participants->map(function($p) {
                return [
                    'id' => $p->id,
                    'user' => $p->user
                ];
            });

            return [
                'id' => $schedule->id,
                'day_of_week' => $todayDayName,
                'shift_name' => $schedule->shift_name,
                'week_number' => Carbon::now()->weekOfMonth,
                'start_time' => $schedule->start_time,
                'end_time' => $schedule->end_time,
                'members' => $members
            ];
        });

        return response()->json([
            'success' => true,
            'message' => "Jadwal Ronda Hari $todayDayName",
            'data' => $data
        ]);
    }

    /**
     * API Mobile untuk melihat "Kapan giliran saya?".
     */
    public function getMySchedule()
    {
        $user = Auth::user();
        $todayDate = now()->toDateString();

        $schedules = RondaSchedule::whereHas('participants', function($q) use ($user) {
            $q->where('user_id', $user->id);
        })
        ->where('rt_id', $user->rt_id)
        ->where('status', 'ACTIVE')
        ->where('end_date', '>=', $todayDate)
        ->orderBy('start_date')
        ->get();

        Carbon::setLocale('id');

        $data = $schedules->map(function($s) {
            $start = Carbon::parse($s->start_date);
            $end = Carbon::parse($s->end_date);
            
            if ($s->schedule_type === 'WEEKLY') {
                 $dayLabel = "MINGGUAN (" . $start->format('d M') . " - " . $end->format('d M') . ")";
            } else {
                 $dayLabel = strtoupper($start->isoFormat('dddd')) . " (" . $start->format('d M') . ")";
            }

            return [
                'id' => $s->id,
                'day_of_week' => $dayLabel,
                'start_time' => $s->start_time,
                'end_time' => $s->end_time,
                'members' => []
            ];
        });

        return response()->json([
            'success' => true,
            'message' => 'Jadwal Saya',
            'data' => $data
        ]);
    }
}
