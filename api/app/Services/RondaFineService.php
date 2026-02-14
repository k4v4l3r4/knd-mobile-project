<?php

namespace App\Services;

use App\Models\RondaSchedule;
use App\Models\RondaParticipant;
use App\Models\RondaFineSetting;
use App\Models\RondaFine;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class RondaFineService
{
    /**
     * Generate fines for a given schedule.
     * Only runs if fines have not been generated for this schedule/user pair yet (prevent duplicates).
     */
    public function generateForSchedule($scheduleId)
    {
        $schedule = RondaSchedule::find($scheduleId);
        if (!$schedule) return;

        // Get Fine Settings for this RT
        $settings = RondaFineSetting::where('rt_id', $schedule->rt_id)
            ->where('is_active', true)
            ->get()
            ->keyBy('fine_type'); // Key by TIDAK_HADIR, TELAT, PULANG_CEPAT

        if ($settings->isEmpty()) {
            return; // No fine rules, skip
        }

        // Get all participants
        $participants = RondaParticipant::where('schedule_id', $scheduleId)->get();

        foreach ($participants as $participant) {
            $this->processParticipant($participant, $schedule, $settings);
        }
    }

    private function processParticipant($participant, $schedule, $settings)
    {
        // 1. Check if user already has a fine for this schedule to avoid double billing
        // Note: Logic might differ if we allow multiple fine types (e.g. Telat AND Pulang Cepat).
        // For now, let's assume we can stack fines OR take the highest priority.
        // The prompt says: "Tidak terjadi double fine. Satu schedule -> satu denda per user".
        // This implies we should pick the worst violation or just one.
        // Let's check if any fine exists.
        $existingFine = RondaFine::where('ronda_schedule_id', $schedule->id)
            ->where('user_id', $participant->user_id)
            ->first();

        if ($existingFine) {
            return; // Already fined
        }

        $fineType = null;
        $amount = 0;

        // Logic Hierarchy:
        // 1. TIDAK_HADIR / ABSENT (Most severe)
        // 2. PULANG_CEPAT (Early Leave)
        // 3. TELAT (Late Arrival)

        // Case 1: TIDAK_HADIR
        if ($participant->status === 'ABSENT' || $participant->status === 'PENDING') {
            // PENDING implies they never showed up by the time we close the schedule
            if ($settings->has('TIDAK_HADIR')) {
                $setting = $settings->get('TIDAK_HADIR');
                $fineType = 'TIDAK_HADIR';
                $amount = $setting->amount;
            }
        }
        // Case 2: HADIR (PRESENT) but maybe late or early leave
        elseif ($participant->status === 'PRESENT') {
            
            // Check Late (TELAT)
            $isLate = false;
            $lateAmount = 0;
            if ($settings->has('TELAT')) {
                $setting = $settings->get('TELAT');
                $startTime = Carbon::parse($schedule->start_time); // 22:00
                
                // Attendance time
                if ($participant->attendance_at) {
                     // Need to handle cross-day logic carefully or just assume time comparison
                     // If schedule is 22:00 - 04:00.
                     // Scan at 22:15.
                     // Let's assume date part is handled in attendance_at (datetime)
                     // But start_time in schedule is just H:i:s.
                     // We need to construct the expected start datetime based on schedule date.
                     
                     // However, simpler approach: Calculate diff in minutes from expected start.
                     // If attendance_at > expected_start + tolerance
                     
                     // Construct Expected Start DateTime
                     // $schedule->start_date (Y-m-d) + $schedule->start_time (H:i)
                     $expectedStart = Carbon::parse($schedule->start_date . ' ' . $schedule->start_time);
                     $attendedAt = Carbon::parse($participant->attendance_at);
                     
                     // If attendedAt is before expectedStart (early), it's fine.
                     if ($attendedAt->gt($expectedStart)) {
                         $diffMinutes = $expectedStart->diffInMinutes($attendedAt);
                         if ($diffMinutes > $setting->tolerance_minutes) {
                             $isLate = true;
                             $lateAmount = $setting->amount;
                         }
                     }
                }
            }

            // Check Early Leave (PULANG_CEPAT)
            $isEarlyLeave = false;
            $earlyAmount = 0;
            if ($settings->has('PULANG_CEPAT') && $participant->clock_out_at) {
                $setting = $settings->get('PULANG_CEPAT');
                
                // Construct Expected End DateTime
                // Note: end_date might be different from start_date (cross day)
                $expectedEnd = Carbon::parse($schedule->end_date . ' ' . $schedule->end_time);
                $clockOutAt = Carbon::parse($participant->clock_out_at);

                if ($clockOutAt->lt($expectedEnd)) {
                    // It is before end time
                     // Check if it's "significantly" early? Prompt doesn't specify tolerance for early leave,
                     // but DB schema has tolerance_minutes nullable. Let's use it if present.
                     $diffMinutes = $clockOutAt->diffInMinutes($expectedEnd);
                     $tolerance = $setting->tolerance_minutes ?? 0;
                     
                     if ($diffMinutes > $tolerance) {
                         $isEarlyLeave = true;
                         $earlyAmount = $setting->amount;
                     }
                }
            }

            // Determine which fine to apply (Single fine policy)
            // If both Late and Early Leave, which one?
            // Usually we pick the higher amount or the first one.
            // Let's pick the higher amount.
            
            if ($isLate && $isEarlyLeave) {
                if ($lateAmount >= $earlyAmount) {
                    $fineType = 'TELAT';
                    $amount = $lateAmount;
                } else {
                    $fineType = 'PULANG_CEPAT';
                    $amount = $earlyAmount;
                }
            } elseif ($isLate) {
                $fineType = 'TELAT';
                $amount = $lateAmount;
            } elseif ($isEarlyLeave) {
                $fineType = 'PULANG_CEPAT';
                $amount = $earlyAmount;
            }
        }
        // Case 3: EXCUSED / IZIN
        elseif ($participant->status === 'EXCUSED') {
            // No fine
            return;
        }

        // Create Fine Record if applicable
        if ($fineType && $amount > 0) {
            RondaFine::create([
                'rt_id' => $schedule->rt_id,
                'user_id' => $participant->user_id,
                'ronda_schedule_id' => $schedule->id,
                'fine_type' => $fineType,
                'amount' => $amount,
                'status' => 'UNPAID'
            ]);
            
            // Also update participant to show they are fined (backward compatibility/easy check)
            $participant->update([
                'is_fined' => true,
                'fine_amount' => $amount
            ]);
        }
    }
}
