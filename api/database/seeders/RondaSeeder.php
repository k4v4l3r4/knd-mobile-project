<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\RondaSchedule;
use App\Models\RondaParticipant;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class RondaSeeder extends Seeder
{
    public function run()
    {
        $rt = DB::table('wilayah_rt')->first();
        if (!$rt) return;

        $days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
        
        // Get some users to assign (excluding admins if preferred, but for now just all)
        $users = User::where('rt_id', $rt->id)->limit(20)->get();
        if ($users->isEmpty()) return;

        foreach ($days as $index => $day) {
            $schedule = RondaSchedule::firstOrCreate(
                ['rt_id' => $rt->id, 'day' => $day],
                [
                    'shift_name' => 'Malam',
                    'location' => $index % 2 == 0 ? 'Pos Utama' : 'Keliling Blok A'
                ]
            );

            // Assign 2-3 random users per day
            $randomUsers = $users->random(min(3, $users->count()));
            
            foreach ($randomUsers as $user) {
                RondaParticipant::firstOrCreate(
                    ['schedule_id' => $schedule->id, 'user_id' => $user->id]
                );
            }
        }
    }
}
