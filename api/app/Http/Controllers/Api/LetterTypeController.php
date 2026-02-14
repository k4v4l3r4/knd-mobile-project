<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LetterType;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class LetterTypeController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();
        $query = LetterType::query();

        // Filter by RT (if user is RT admin)
        if ($user->role === 'ADMIN_RT' && $user->rt_id) {
            $query->where(function ($q) use ($user) {
                $q->where('rt_id', $user->rt_id)
                  ->orWhereNull('rt_id'); // Include global types
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

        $letterType = LetterType::create([
            'rt_id' => $rtId,
            'name' => $request->name,
            'code' => $request->code ? strtoupper($request->code) : null,
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

        $letterType->update([
            'name' => $request->name,
            'code' => $request->code ? strtoupper($request->code) : $letterType->code,
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
