<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Support\Facades\Auth;
use App\Models\WilayahRw;

class CheckSubscription
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = Auth::user();

        if ($user && $user->rw_id) {
            $rw = WilayahRw::find($user->rw_id);

            if ($rw && $rw->subscription_status === 'EXPIRED') {
                return response()->json([
                    'meta' => [
                        'code' => 403,
                        'status' => 'error',
                        'message' => 'Masa aktif RW Anda telah habis. Silakan hubungi Admin.'
                    ],
                    'data' => null
                ], 403);
            }
        }

        return $next($request);
    }
}
