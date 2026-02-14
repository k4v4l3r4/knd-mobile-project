<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckPermission
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next, string $permission): Response
    {
        $user = $request->user();

        if (!$user || !$user->role) {
            return response()->json(['message' => 'Unauthorized. No role assigned.'], 403);
        }

        $userRole = $user->role;

        // Handle legacy string role column vs relationship
        if (is_string($userRole)) {
            if ($userRole === 'SUPER_ADMIN') {
                return $next($request);
            }
            // Fetch Role model via relationship
            $userRole = $user->userRole;
            if (!$userRole) {
                 return response()->json(['message' => 'Forbidden. Role not found.'], 403);
            }
        }

        // Super Admin Bypass
        if ($userRole->role_code === 'SUPER_ADMIN') {
            return $next($request);
        }

        // Check Permission via Role
        if (!$userRole->permissions()->where('permission_code', $permission)->exists()) {
            return response()->json(['message' => 'Forbidden. Missing permission: ' . $permission], 403);
        }

        return $next($request);
    }
}
