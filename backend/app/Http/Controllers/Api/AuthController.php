<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user) {
            return response()->json([
                'message' => 'The provided credentials are incorrect.',
                'errors' => [
                    'email' => ['The provided credentials are incorrect.'],
                ],
            ], 422);
        }

        if (!Hash::check($request->password, $user->password)) {
            return response()->json([
                'message' => 'The provided credentials are incorrect.',
                'errors' => [
                    'email' => ['The provided credentials are incorrect.'],
                ],
            ], 422);
        }

        if (!$user->is_active) {
            return response()->json([
                'message' => 'Your account has been deactivated.',
                'errors' => [
                    'email' => ['Your account has been deactivated.'],
                ],
            ], 422);
        }

        if ($user->is_blocked) {
            return response()->json([
                'message' => 'Your account has been blocked. Please contact support for assistance.',
                'errors' => [
                    'email' => ['Your account has been blocked.'],
                ],
            ], 422);
        }

        if ($user->isPasswordExpired()) {
            return response()->json([
                'message' => 'Your password has expired. Please change it to continue.',
                'error_code' => 'PASSWORD_EXPIRED',
                'requires_password_change' => true,
                'email' => $user->email,
            ], 422);
        }

        $token = $user->createToken('auth-token')->plainTextToken;

        $userData = $user->toArray();
        $userData['is_super_admin'] = $user->isSuperAdmin();

        return response()->json([
            'user' => $userData,
            'token' => $token,
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out successfully']);
    }

    public function me(Request $request)
    {
        $user = $request->user();
        $data = $user->toArray();
        $data['is_super_admin'] = $user->isSuperAdmin();
        return response()->json($data);
    }

    /**
     * Change expired password (public - no auth required).
     * User must provide current password to verify identity.
     */
    public function changeExpiredPassword(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'current_password' => 'required',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->current_password, $user->password)) {
            return response()->json([
                'message' => 'The provided credentials are incorrect.',
                'errors' => ['current_password' => ['The current password is incorrect.']],
            ], 422);
        }

        if (!$user->isPasswordExpired()) {
            return response()->json([
                'message' => 'Your password has not expired. Use the normal change password flow.',
            ], 422);
        }

        $user->forceFill([
            'password' => Hash::make($request->password),
            'password_changed_at' => now(),
        ])->save();

        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'message' => 'Password changed successfully.',
            'user' => $user,
            'token' => $token,
        ]);
    }

    /**
     * Change password (protected - requires auth).
     * For users who want to change password from settings.
     */
    public function changePassword(Request $request)
    {
        $request->validate([
            'current_password' => 'required',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $user = $request->user();

        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json([
                'message' => 'The current password is incorrect.',
                'errors' => ['current_password' => ['The current password is incorrect.']],
            ], 422);
        }

        $user->forceFill([
            'password' => Hash::make($request->password),
            'password_changed_at' => now(),
        ])->save();

        return response()->json(['message' => 'Password changed successfully.']);
    }

    public function register(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8|confirmed',
            'role' => 'required|in:requestor,donor,supplier,ngo,corporate',
            'organization' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:20',
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'password_changed_at' => now(),
            'role' => $request->role,
            'organization' => $request->organization,
            'phone' => $request->phone,
            'is_active' => true,
        ]);

        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'user' => $user,
            'token' => $token,
        ], 201);
    }
}
