<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;

class DebugFaisalController extends Controller
{
    public function show()
    {
        $user = User::withTrashed()
            ->with(['rt', 'rw', 'tenant', 'userRole'])
            ->find(613);

        if (!$user) {
            return response()->json([
                'error' => 'User 613 (Faisal) tidak ditemukan',
            ], 404);
        }

        return response()->json([
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'role' => $user->role,
            'role_id' => $user->role_id,
            'status_in_family' => $user->status_in_family,
            'kk_number' => $user->kk_number,
            'rt_id' => $user->rt_id,
            'rw_id' => $user->rw_id,
            'tenant_id' => $user->tenant_id,
            'deleted_at' => $user->deleted_at,
            'life_status' => $user->life_status,
            'email_verified_at' => $user->email_verified_at,
            'data_verified_at' => $user->data_verified_at,
            'rt' => $user->rt ? [
                'id' => $user->rt->id,
                'name' => $user->rt->name,
                'code' => $user->rt->code,
                'tenant_id' => $user->rt->tenant_id,
            ] : null,
            'rw' => $user->rw ? [
                'id' => $user->rw->id,
                'name' => $user->rw->name,
                'code' => $user->rw->code,
            ] : null,
            'tenant' => $user->tenant ? [
                'id' => $user->tenant->id,
                'name' => $user->tenant->name,
            ] : null,
            'userRole' => $user->userRole ? [
                'id' => $user->userRole->id,
                'role_code' => $user->userRole->role_code,
                'name' => $user->userRole->name,
            ] : null,
        ]);
    }
}