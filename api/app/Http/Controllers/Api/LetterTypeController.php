<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LetterType;
use App\Models\Scopes\TenantScope;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

class LetterTypeController extends Controller
{
    protected function normalizeLetterTypeCode(?string $code, string $name): string
    {
        $candidate = $code ? strtoupper(trim($code)) : '';

        if ($candidate !== '') {
            $candidate = preg_replace('/\s+/', '_', $candidate);
            $candidate = preg_replace('/[^A-Z0-9_]/', '_', $candidate);
            $candidate = preg_replace('/_+/', '_', $candidate);
            $candidate = trim($candidate, '_');
        }

        if ($candidate === '') {
            $candidate = strtoupper(Str::slug($name, '_'));
            $candidate = preg_replace('/_+/', '_', $candidate);
            $candidate = trim($candidate, '_');
        }

        if ($candidate === '') {
            $candidate = 'SURAT';
        }

        return substr($candidate, 0, 50);
    }

    protected function letterTypeCodeExists(string $code, $tenantId, $rtId, ?int $ignoreId = null): bool
    {
        $query = LetterType::withoutGlobalScope(TenantScope::class)->where('code', $code);

        $query->where(function ($q) use ($tenantId) {
            $q->whereNull('tenant_id');
            if ($tenantId) {
                $q->orWhere('tenant_id', $tenantId);
            }
        });

        if ($rtId) {
            $query->where(function ($q) use ($rtId) {
                $q->whereNull('rt_id')->orWhere('rt_id', $rtId);
            });
        }

        if ($ignoreId) {
            $query->where('id', '!=', $ignoreId);
        }

        return $query->exists();
    }

    protected function makeUniqueLetterTypeCode(string $baseCode, $tenantId, $rtId, ?int $ignoreId = null): string
    {
        $code = $baseCode;
        $suffix = 1;

        while ($this->letterTypeCodeExists($code, $tenantId, $rtId, $ignoreId)) {
            $suffix++;
            $suffixStr = '_' . $suffix;
            $maxBaseLen = 50 - strlen($suffixStr);
            $trimmedBase = substr($baseCode, 0, max(1, $maxBaseLen));
            $code = $trimmedBase . $suffixStr;
        }

        return $code;
    }

    public function index(Request $request)
    {
        $user = Auth::user();
        
        // Use withoutGlobalScope to allow fetching global types (tenant_id = null)
        $query = LetterType::withoutGlobalScope(TenantScope::class);

        // Filter: Global types OR Tenant types
        $query->where(function ($q) use ($user) {
            $q->whereNull('tenant_id');
            
            if ($user->tenant_id) {
                $q->orWhere('tenant_id', $user->tenant_id);
            }
        });

        // Filter by RT (for all users, not just Admin RT)
        // Ensure they only see types for their RT or Global RT types
        if ($user->rt_id) {
            $query->where(function ($q) use ($user) {
                $q->where('rt_id', $user->rt_id)
                  ->orWhereNull('rt_id');
            });
        }

        // Search
        if ($request->has('search')) {
            $search = $request->search;
            $query->where('name', 'like', "%{$search}%");
        }

        $letterTypes = $query->orderBy('name', 'asc')->get();

        return response()->json([
            'success' => true,
            'data' => $letterTypes
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'nullable|string|max:50', // Optional, can be auto-generated or left empty
            'description' => 'nullable|string',
        ]);

        $user = Auth::user();
        $rtId = ($user->role === 'ADMIN_RT') ? $user->rt_id : null;
        $tenantId = $user->tenant_id;
        $baseCode = $this->normalizeLetterTypeCode($request->code, $request->name);
        $code = $this->makeUniqueLetterTypeCode($baseCode, $tenantId, $rtId);

        $letterType = LetterType::create([
            'rt_id' => $rtId,
            'name' => $request->name,
            'code' => $code,
            'description' => $request->description,
            'is_active' => true,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Jenis surat berhasil ditambahkan',
            'data' => $letterType
        ]);
    }

    public function update(Request $request, $id)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'nullable|string|max:50',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $letterType = LetterType::findOrFail($id);
        
        // Authorization check: User can only edit their own RT's types
        $user = Auth::user();
        if ($user->role === 'ADMIN_RT' && $letterType->rt_id && $letterType->rt_id !== $user->rt_id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Global types (rt_id = null) might be restricted from editing by RT Admin, 
        // but for now let's allow it or maybe restrict. 
        // Let's assume RT Admin can ONLY edit types created by them (rt_id != null).
        if ($user->role === 'ADMIN_RT' && is_null($letterType->rt_id)) {
             return response()->json(['message' => 'Tidak dapat mengubah jenis surat default sistem'], 403);
        }

        $tenantId = $user->tenant_id;
        $rtId = $letterType->rt_id;
        $code = $letterType->code;

        if ($request->filled('code')) {
            $code = $this->normalizeLetterTypeCode($request->code, $request->name);
        } elseif (!$code) {
            $code = $this->normalizeLetterTypeCode(null, $request->name);
        }

        if ($code && $code !== $letterType->code) {
            $code = $this->makeUniqueLetterTypeCode($code, $tenantId, $rtId, (int) $letterType->id);
        }

        $letterType->update([
            'name' => $request->name,
            'code' => $code,
            'description' => $request->description,
            'is_active' => $request->is_active ?? $letterType->is_active,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Jenis surat berhasil diperbarui',
            'data' => $letterType
        ]);
    }

    public function destroy($id)
    {
        $letterType = LetterType::findOrFail($id);
        
        $user = Auth::user();
        if ($user->role === 'ADMIN_RT' && $letterType->rt_id && $letterType->rt_id !== $user->rt_id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if ($user->role === 'ADMIN_RT' && is_null($letterType->rt_id)) {
            return response()->json(['message' => 'Tidak dapat menghapus jenis surat default sistem'], 403);
       }

        $letterType->delete();

        return response()->json([
            'success' => true,
            'message' => 'Jenis surat berhasil dihapus'
        ]);
    }
}
