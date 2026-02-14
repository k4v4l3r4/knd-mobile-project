<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use App\Models\User;

class ProfileController extends Controller
{
    public function show()
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();
        $user->load(['rt', 'rw', 'userRole']);
        
        if ($user->userRole) {
            $user->role = $user->userRole->role_code;
        }

        return response()->json([
            'data' => $user
        ]);
    }

    public function update(Request $request)
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();
        
        $request->validate([
            'name' => 'required|string|max:255',
            'phone' => ['required', 'string', 'max:20', Rule::unique('users')->ignore($user->id)],
            'signature_type' => 'nullable|in:image,auto_font,qr_only',
            'signature_image' => 'nullable|image|max:2048',
        ]);

        $data = [
            'name' => $request->name,
            'phone' => $request->phone,
        ];

        if ($request->has('signature_type')) {
            $data['signature_type'] = $request->signature_type;
        }

        if ($request->hasFile('signature_image')) {
            // Delete old signature if exists
            if ($user->signature_image) {
                $oldPath = str_replace('/storage/', '', $user->signature_image);
                if (Storage::disk('public')->exists($oldPath)) {
                    Storage::disk('public')->delete($oldPath);
                }
            }

            $path = $request->file('signature_image')->store('signatures', 'public');
            $data['signature_image'] = Storage::url($path);
        }

        $user->update($data);

        return response()->json([
            'message' => 'Profile updated successfully',
            'data' => $user
        ]);
    }

    public function uploadAvatar(Request $request)
    {
        $request->validate([
            'avatar' => 'required|image|mimes:jpeg,png,jpg,gif|max:2048',
        ]);

        /** @var \App\Models\User $user */
        $user = Auth::user();

        if ($request->hasFile('avatar')) {
            // Delete old avatar if exists
            if ($user->avatar) {
                $oldPath = str_replace('/storage/', '', $user->avatar);
                if (Storage::disk('public')->exists($oldPath)) {
                    Storage::disk('public')->delete($oldPath);
                }
            }

            $path = $request->file('avatar')->store('avatars', 'public');
            
            // Generate full URL
            $url = Storage::url($path);

            $user->update([
                'avatar' => $url 
            ]);

            return response()->json([
                'message' => 'Avatar uploaded successfully',
                'avatar_url' => $url
            ]);
        }

        return response()->json(['message' => 'No file uploaded'], 400);
    }

    public function updatePassword(Request $request)
    {
        $request->validate([
            'current_password' => 'required',
            'password' => 'required|min:8|confirmed',
        ]);

        /** @var \App\Models\User $user */
        $user = Auth::user();

        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json([
                'message' => 'Password saat ini salah',
                'errors' => ['current_password' => ['Password saat ini tidak cocok']]
            ], 422);
        }

        $user->update([
            'password' => Hash::make($request->password)
        ]);

        return response()->json([
            'message' => 'Password berhasil diperbarui'
        ]);
    }
}
