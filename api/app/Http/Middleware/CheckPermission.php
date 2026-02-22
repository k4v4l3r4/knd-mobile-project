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

        $roleModel = $user->userRole;
        $roleCode = $roleModel ? $roleModel->role_code : (is_string($user->role) ? $user->role : null);

        if (!$roleCode) {
            return response()->json(['message' => 'Forbidden. Role not found.'], 403);
        }

        if ($roleCode === 'SUPER_ADMIN') {
            return $next($request);
        }

        if ($roleModel) {
            if ($roleModel->permissions()->where('permission_code', $permission)->exists()) {
                return $next($request);
            }
        } else {
            $legacyPermissions = [
                'ADMIN_RW' => [
                    'dashboard.view', 'tenant.manage', 'warga.view',
                    'kas.view', 'iuran.view', 'laporan.view', 'laporan.export',
                    'billing.manage', 'user.invite', 'settings.update'
                ],
                'ADMIN_RT' => [
                    'dashboard.view', 'warga.view', 'warga.create', 'warga.update', 'warga.delete',
                    'kas.view', 'kas.create', 'kas.update', 'kas.delete',
                    'iuran.view', 'iuran.generate', 'laporan.view', 'laporan.export',
                    'user.invite', 'settings.update'
                ],
                'BENDAHARA_RT' => [
                    'dashboard.view', 'kas.view', 'kas.create', 'kas.update',
                    'iuran.view', 'laporan.view'
                ],
                'SEKRETARIS_RT' => [
                    'dashboard.view', 'warga.view', 'warga.create', 'warga.update',
                    'iuran.view', 'laporan.view'
                ],
                'WARGA' => [
                    'dashboard.view', 'warga.view', 'iuran.view', 'iuran.pay', 'kas.view'
                ],
                'WARGA_TETAP' => [
                    'dashboard.view', 'warga.view', 'iuran.view', 'iuran.pay', 'kas.view'
                ],
                'WARGA_KOST' => [
                    'dashboard.view', 'warga.view', 'iuran.view', 'iuran.pay', 'kas.view'
                ],
                'GUEST' => [
                    'dashboard.view', 'warga.view', 'kas.view', 'iuran.view', 'laporan.view'
                ],
            ];

            $allowed = $legacyPermissions[$roleCode] ?? [];
            if (in_array($permission, $allowed, true)) {
                return $next($request);
            }
        }

        return response()->json(['message' => 'Forbidden. Missing permission: ' . $permission], 403);
    }
}
