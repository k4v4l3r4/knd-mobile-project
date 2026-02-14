<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckRole
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next, string $role): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        // Check if role is legacy string column or relation
        $userRole = $user->role;
        $roleCode = null;

        if (is_string($userRole)) {
            $roleCode = $userRole;
        } 
        
        // If legacy role is empty/null, check new relationship
        if (!$roleCode && $user->userRole) {
            $roleCode = $user->userRole->role_code;
        } elseif ($userRole && isset($userRole->role_code)) {
             // Fallback if user->role somehow returns object (unlikely now)
            $roleCode = $userRole->role_code;
        }

        // Support multiple roles separated by pipe
        $roles = explode('|', $role);

        if ($roleCode && in_array($roleCode, $roles)) {
            return $next($request);
        }

        return response()->json(['message' => 'Unauthorized.'], 403);
    }
}
