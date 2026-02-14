<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\User;
use App\Models\Letter;
use Carbon\Carbon;

class KelurahanIntegrationController extends Controller
{
    private function authorizeRequest(Request $request)
    {
        $key = $request->header('X-API-KEY');
        $secret = env('KELURAHAN_SECRET_KEY');
        if (!$secret || !$key || !hash_equals($secret, $key)) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }
        return null;
    }

    public function stats(Request $request)
    {
        if ($auth = $this->authorizeRequest($request)) {
            return $auth;
        }

        $rtId = $request->query('rt_id');
        $activeRoles = ['WARGA_TETAP', 'WARGA_KOST', 'WARGA'];

        $userQuery = User::query()->whereIn('role', $activeRoles);
        if ($rtId) {
            $userQuery->where('rt_id', $rtId);
        }

        $totalActive = (clone $userQuery)->count();
        $kkCount = (clone $userQuery)->where('status_in_family', 'KEPALA_KELUARGA')->count();
        $genderL = (clone $userQuery)->where('gender', 'L')->count();
        $genderP = (clone $userQuery)->where('gender', 'P')->count();

        $ages = (clone $userQuery)
            ->whereNotNull('date_of_birth')
            ->get(['date_of_birth'])
            ->map(function ($u) {
                return Carbon::parse($u->date_of_birth)->age;
            });

        $balita = $ages->filter(fn($age) => $age <= 5)->count();
        $remaja = $ages->filter(fn($age) => $age >= 6 && $age <= 17)->count();
        $dewasa = $ages->filter(fn($age) => $age >= 18 && $age <= 59)->count();
        $lansia = $ages->filter(fn($age) => $age >= 60)->count();

        return response()->json([
            'success' => true,
            'data' => [
                'total_active_citizens' => $totalActive,
                'total_households' => $kkCount,
                'gender' => [
                    'L' => $genderL,
                    'P' => $genderP,
                ],
                'age_breakdown' => [
                    'balita' => $balita,
                    'remaja' => $remaja,
                    'dewasa' => $dewasa,
                    'lansia' => $lansia,
                ],
            ],
        ]);
    }

    public function verifyCitizen(Request $request)
    {
        if ($auth = $this->authorizeRequest($request)) {
            return $auth;
        }

        $request->validate([
            'nik' => ['required', 'string', 'size:16'],
        ]);

        $activeRoles = ['WARGA_TETAP', 'WARGA_KOST', 'WARGA'];
        $user = User::where('nik', $request->nik)->first();
        $isActive = $user && in_array($user->role, $activeRoles);

        return response()->json([
            'success' => true,
            'data' => [
                'exists' => (bool) $user,
                'active' => $isActive,
                'name' => $user ? $user->name : null,
                'address' => $user ? $user->address : null,
            ],
        ]);
    }

    public function pendingLetters(Request $request)
    {
        if ($auth = $this->authorizeRequest($request)) {
            return $auth;
        }

        $rtId = $request->query('rt_id');
        $query = Letter::with('user')->where('status', 'APPROVED');
        if ($rtId) {
            $query->where('rt_id', $rtId);
        }
        $letters = $query->latest()->get();

        $data = $letters->map(function ($l) {
            return [
                'id' => $l->id,
                'rt_id' => $l->rt_id,
                'type' => $l->type,
                'purpose' => $l->purpose,
                'status' => $l->status,
                'letter_number' => $l->letter_number,
                'user' => $l->user ? [
                    'id' => $l->user->id,
                    'name' => $l->user->name,
                    'nik' => $l->user->nik,
                    'address' => $l->user->address,
                ] : null,
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }

    public function potentialBansos(Request $request)
    {
        if ($auth = $this->authorizeRequest($request)) {
            return $auth;
        }

        $rtId = $request->query('rt_id');
        $activeRoles = ['WARGA_TETAP', 'WARGA_KOST', 'WARGA'];
        $query = User::query()
            ->whereIn('role', $activeRoles)
            ->whereNotNull('occupation')
            ->whereIn(DB::raw('LOWER(occupation)'), ['buruh', 'tidak bekerja']);
        if ($rtId) {
            $query->where('rt_id', $rtId);
        }

        $users = $query->get();
        $data = $users->map(function ($u) {
            return [
                'id' => $u->id,
                'name' => $u->name,
                'nik' => $u->nik,
                'kk_number' => $u->kk_number,
                'occupation' => $u->occupation,
                'address' => $u->address,
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }
}

