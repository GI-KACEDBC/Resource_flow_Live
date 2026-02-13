<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * User listing for Admin Dashboard (recipients count, pending verification, etc.).
 * Admin only.
 */
class UserController extends Controller
{
    public function __construct()
    {
        $this->middleware(function ($request, $next) {
            if (!$request->user()?->isAdmin()) {
                return response()->json(['message' => 'Unauthorized. Admin only.'], 403);
            }
            return $next($request);
        });
    }

    /**
     * List users for admin dashboard. Returns array of users (id, name, email, role, is_verified, etc.).
     */
    public function index(Request $request): JsonResponse
    {
        $query = User::select([
            'id', 'name', 'email', 'role', 'organization', 'phone', 'ghana_card',
            'is_active', 'is_verified', 'is_blocked', 'verified_at',
            'verification_status', 'created_at',
        ]);

        if ($request->filled('role')) {
            $query->where('role', $request->role);
        }
        if ($request->filled('status')) {
            if ($request->status === 'verified') {
                $query->where('is_verified', true);
            } elseif ($request->status === 'pending') {
                $query->where('is_verified', false);
            }
        }

        $users = $query->orderBy('name')->get();

        return response()->json($users);
    }

    /**
     * Get a single user by ID.
     */
    public function show(User $user): JsonResponse
    {
        $user->makeHidden(['password', 'remember_token']);
        return response()->json($user);
    }

    /**
     * Update user (admin only). Used for verification status, block, etc.
     */
    public function update(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'is_verified' => 'sometimes|boolean',
            'is_blocked' => 'sometimes|boolean',
            'verification_status' => 'sometimes|string|in:pending,verified,rejected',
        ]);

        $data = [];
        if (array_key_exists('is_verified', $validated)) {
            $data['is_verified'] = $validated['is_verified'];
            $data['verified_at'] = $validated['is_verified'] ? now() : null;
        }
        if (array_key_exists('is_blocked', $validated)) {
            $data['is_blocked'] = $validated['is_blocked'];
        }
        if (array_key_exists('verification_status', $validated)) {
            $data['verification_status'] = $validated['verification_status'];
        }
        if (!empty($data)) {
            $user->update($data);
        }

        $user->makeHidden(['password', 'remember_token']);
        return response()->json($user);
    }
}
