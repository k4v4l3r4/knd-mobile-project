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
use Illuminate\Support\Facades\Log;
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

            // Get today's date
            $today = Carbon::today()->format('Y-m-d');
            
            Log::info('Patrol today query', [
                'rt_id' => $rtId,
                'today' => $today,
                'datetime' => now()->toDateTimeString()
            ]);

            // Get active schedules for today from RondaSchedule (NEW SYSTEM)
            // Include schedules with NULL dates (legacy) OR within date range
            $schedules = RondaSchedule::with(['participants.user'])
                ->where('rt_id', $rtId)
                ->where('status', 'ACTIVE')
                ->where(function($query) use ($today) {
                    $query->whereNull('start_date') // Legacy schedules without dates
                          ->orWhereNull('end_date')
                          ->orWhere(function($q) use ($today) {
                              $q->whereDate('start_date', '<=', $today)
                                ->whereDate('end_date', '>=', $today);
                          });
                })
                ->orderBy('schedule_type', 'desc') // WEEKLY before DAILY
                ->orderBy('start_time', 'asc') // Earliest shift first
                ->get();
            
            Log::info('Patrol schedules found', [
                'count' => $schedules->count(),
                'schedules' => $schedules->map(fn($s) => [
                    'id' => $s->id,
                    'start_date' => $s->start_date,
                    'end_date' => $s->end_date,
                    'shift_name' => $s->shift_name
                ])->toArray()
            ]);

            // If no new system schedules, fall back to old PatrolSchedule
            if ($schedules->isEmpty()) {
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
                $todayDayName = $dayMap[Carbon::now()->format('l')];
                $weekNumber = 1;

                $schedule = PatrolSchedule::firstOrCreate(
                    ['rt_id' => $rtId, 'day_of_week' => $todayDayName, 'week_number' => $weekNumber],
                    [
                        'start_time' => '22:00', 
                        'end_time' => '04:00',
                        'tenant_id' => $tenantId
                    ]
                );

                $schedule->load(['members.user']);

                return response()->json([
                    'success' => true,
                    'data' => [$schedule]
                ]);
            }

            // Build Indonesian day name map
            $dayMapId = [
                'Sunday'    => 'Minggu',
                'Monday'    => 'Senin',
                'Tuesday'   => 'Selasa',
                'Wednesday' => 'Rabu',
                'Thursday'  => 'Kamis',
                'Friday'    => 'Jumat',
                'Saturday'  => 'Sabtu',
            ];

            $authUserId = Auth::id();

            // Transform RondaSchedule data to match expected format
            $transformedSchedules = $schedules->map(function($schedule) use ($today, $dayMapId, $authUserId) {
                // Map participants to members format, and mark the current user with is_me
                $members = $schedule->participants->map(function($participant) use ($authUserId) {
                    return [
                        'id'            => $participant->id,
                        'user'          => $participant->user,
                        'status'        => $participant->status,
                        'attendance_at' => $participant->attendance_at,
                        'clock_out_at'  => $participant->clock_out_at ?? null,
                        'is_me'         => $participant->user_id === $authUserId,
                    ];
                });

                // Build dynamic Indonesian day label based on TODAY's date for "tonight" display
                // This ensures the badge shows the correct day/date for when the schedule is active
                $dayLabel = '';
                $todayCarbon = Carbon::parse($today);
                $todayDayNameId = $dayMapId[$todayCarbon->format('l')] ?? $todayCarbon->format('l');
                $todayDateLabel = $todayCarbon->format('d M Y');
                
                if ($schedule->start_date && $schedule->end_date) {
                    // For date-range schedules (WEEKLY), check if today falls within the range
                    $startCarbon = Carbon::parse($schedule->start_date);
                    $endCarbon = Carbon::parse($schedule->end_date);
                    
                    if ($todayCarbon->between($startCarbon, $endCarbon)) {
                        // Today is within the schedule range - use TODAY's date
                        $dayLabel = $schedule->shift_name
                            ? "{$schedule->shift_name} — {$todayDayNameId}, {$todayDateLabel}"
                            : "{$todayDayNameId}, {$todayDateLabel}";
                    } else {
                        // Outside range (shouldn't happen due to query, but fallback)
                        $parsed = $startCarbon;
                        $dayNameId = $dayMapId[$parsed->format('l')] ?? $parsed->format('l');
                        $dateLabel = $parsed->format('d M Y');
                        $dayLabel = $schedule->shift_name
                            ? "{$schedule->shift_name} — {$dayNameId}, {$dateLabel}"
                            : "{$dayNameId}, {$dateLabel}";
                    }
                } elseif ($schedule->start_date) {
                    // For DAILY schedules or schedules without end_date
                    $parsed    = Carbon::parse($schedule->start_date);
                    $dayNameId = $dayMapId[$parsed->format('l')] ?? $parsed->format('l');
                    $dateLabel = $parsed->format('d M Y');
                    $dayLabel  = $schedule->shift_name
                        ? "{$schedule->shift_name} — {$dayNameId}, {$dateLabel}"
                        : "{$dayNameId}, {$dateLabel}";
                } else {
                    // Fallback to today's date if no start_date (legacy)
                    $dayLabel = $schedule->shift_name
                        ? "{$schedule->shift_name} — {$todayDayNameId}, {$todayDateLabel}"
                        : "{$todayDayNameId}, {$todayDateLabel}";
                }

                return [
                    'id'            => $schedule->id,
                    'schedule_type' => $schedule->schedule_type,
                    'start_date'    => $schedule->start_date,
                    'end_date'      => $schedule->end_date,
                    'start_time'    => $schedule->start_time,
                    'end_time'      => $schedule->end_time,
                    'shift_name'    => $schedule->shift_name,
                    'members'       => $members,
                    // Dynamic Indonesian label — NOT hardcoded
                    'day_of_week'   => $dayLabel,
                    'week_number'   => 1,
                ];
            });

            return response()->json([
                'success' => true,
                'data' => $transformedSchedules
            ]);
        } catch (\Exception $e) {
            Log::error('Error in PatrolController@today: ' . $e->getMessage() . "\n" . $e->getTraceAsString());
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
        $today = Carbon::today()->format('Y-m-d');
        
        // Get today's day name in Indonesian (uppercase)
        Carbon::setLocale('id');
        $todayDayName = strtoupper(Carbon::now()->isoFormat('dddd'));
        
        Log::info('Patrol mine query', [
            'rt_id' => $user->rt_id,
            'today' => $today,
            'datetime' => now()->toDateTimeString()
        ]);
        
            // Find active schedules for today based on date range.
            // We intentionally do NOT filter by start_time/end_time here because:
            // - Overnight shifts (e.g. 22:00–04:00) would be invisible after midnight
            //   since end_time 04:00 < currentTime 23:00 → false positive empty result.
            // - The correct gate for "is this schedule active tonight?" is the date range:
            //   start_date <= today AND end_date >= today.
            // For an overnight schedule saved with start_date=14 / end_date=15,
            // at 23:00 on day 14: today=14, start_date=14 ≤ 14 ✓, end_date=15 ≥ 14 ✓ → shown.
            // At 02:00 on day 15: today=15, start_date=14 ≤ 15 ✓, end_date=15 ≥ 15 ✓ → still shown.
            $schedules = RondaSchedule::with(['participants.user'])
                ->where('rt_id', $user->rt_id)
                ->where('status', 'ACTIVE')
                ->where(function($query) use ($today) {
                    $query->whereNull('start_date') // Legacy schedules without dates
                          ->orWhereNull('end_date')
                          ->orWhere(function($q) use ($today) {
                              $q->whereDate('start_date', '<=', $today)
                                ->whereDate('end_date', '>=', $today);
                          });
                })
                ->get();
            
            Log::info('Patrol mine schedules found', [
                'count' => $schedules->count(),
                'schedules' => $schedules->map(fn($s) => [
                    'id' => $s->id,
                    'shift_name' => $s->shift_name,
                    'start_date' => $s->start_date,
                    'end_date' => $s->end_date,
                    'start_time' => $s->start_time,
                    'end_time' => $s->end_time
                ])->toArray()
            ]);

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

        // For "my schedule" we show schedules whose date window covers today.
        // We do NOT gate on start_time/end_time to avoid hiding overnight shifts
        // (a 22:00-04:00 shift has end_time=04:00 which is always < currentTime at night).
        $schedules = RondaSchedule::whereHas('participants', function($q) use ($user) {
            $q->where('user_id', $user->id);
        })
        ->where('rt_id', $user->rt_id)
        ->where('status', 'ACTIVE')
        ->where(function($query) use ($todayDate) {
            $query->whereNull('start_date')
                  ->orWhereNull('end_date')
                  ->orWhere(function($q) use ($todayDate) {
                      $q->whereDate('start_date', '<=', $todayDate)
                        ->whereDate('end_date', '>=', $todayDate);
                  });
        })
        ->orderBy('schedule_type', 'desc') // WEEKLY before DAILY
        ->orderBy('start_time', 'asc') // Earliest shift first
        ->get();

        Carbon::setLocale('id');

        $dayMapId = [
            'Sunday'    => 'Minggu',
            'Monday'    => 'Senin',
            'Tuesday'   => 'Selasa',
            'Wednesday' => 'Rabu',
            'Thursday'  => 'Kamis',
            'Friday'    => 'Jumat',
            'Saturday'  => 'Sabtu',
        ];

        $data = $schedules->map(function($s) use ($dayMapId) {
            // Build a fully dynamic Indonesian day label from start_date
            if ($s->start_date) {
                $parsed    = Carbon::parse($s->start_date);
                $dayNameId = $dayMapId[$parsed->format('l')] ?? $parsed->format('l');
                $dateLabel = $parsed->format('d M Y');
                if ($s->end_date && $s->end_date !== $s->start_date) {
                    $endParsed    = Carbon::parse($s->end_date);
                    $endDateLabel = $endParsed->format('d M Y');
                    $dayLabel = $s->shift_name
                        ? "{$s->shift_name} — {$dayNameId}, {$dateLabel} s/d {$endDateLabel}"
                        : "{$dayNameId}, {$dateLabel} s/d {$endDateLabel}";
                } else {
                    $dayLabel = $s->shift_name
                        ? "{$s->shift_name} — {$dayNameId}, {$dateLabel}"
                        : "{$dayNameId}, {$dateLabel}";
                }
            } else {
                // Fallback for legacy schedules with no date
                $dayLabel = strtoupper(Carbon::now()->isoFormat('dddd')) . ' (' . Carbon::now()->format('d M Y') . ')';
            }

            return [
                'id'            => $s->id,
                'schedule_type' => $s->schedule_type,
                'start_date'    => $s->start_date,
                'end_date'      => $s->end_date,
                'shift_name'    => $s->shift_name,
                'day_of_week'   => $dayLabel,
                'start_time'    => $s->start_time,
                'end_time'      => $s->end_time,
                'members'       => [],  // "My schedule" list — no need to expose other warga names
            ];
        });

        return response()->json([
            'success' => true,
            'message' => 'Jadwal Saya',
            'data' => $data
        ]);
    }
}
