<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

/**
 * CRUD for Admin and Staff accounts. Super Admin only – Admin cannot create users.
 */
class UserManagementController extends Controller
{
    public function __construct()
    {
        $this->middleware(function ($request, $next) {
            if (!$request->user()?->isSuperAdmin()) {
                return response()->json(['message' => 'Unauthorized. Super Admin only. Admins cannot create or manage user accounts.'], 403);
            }
            return $next($request);
        });
    }

    /**
     * List managed users (admin, auditor, field_agent, driver, supervisor, special). Excludes Super Admin.
     */
    public function index(Request $request): JsonResponse
    {
        $superAdminEmail = config('app.super_admin_email', 'superadmin@resourceflow.com');
        $query = User::whereIn('role', User::MANAGED_ROLES)
            ->where('email', '!=', $superAdminEmail)
            ->orderBy('role')
            ->orderBy('name');

        if ($request->filled('role')) {
            $query->where('role', $request->role);
        }
        if ($request->filled('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }
        if ($request->filled('search')) {
            $s = '%' . $request->search . '%';
            $driver = DB::getDriverName();
            $query->where(function ($q) use ($s, $driver) {
                if ($driver === 'pgsql') {
                    $q->where('name', 'ilike', $s)->orWhere('email', 'ilike', $s);
                } else {
                    $q->where('name', 'like', $s)->orWhere('email', 'like', $s);
                }
            });
        }

        $users = $query->get()->map(fn ($u) => $this->formatStaffUser($u));
        $permissions = config('permissions.available', []);
        $roleDefaults = config('permissions.role_defaults', []);

        return response()->json([
            'users' => $users,
            'permissions' => $permissions,
            'role_defaults' => $roleDefaults,
            'staff_roles' => User::MANAGED_ROLES,
        ]);
    }

    /**
     * Create a new Admin or Staff account. Pre-verified.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:8|confirmed',
            'role' => ['required', Rule::in(User::MANAGED_ROLES)],
            'organization' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:20',
            'custom_role_name' => 'nullable|string|max:100',
            'permissions' => 'nullable|array',
            'permissions.*' => 'string|max:100',
        ]);

        $role = $validated['role'];
        $permissions = $validated['permissions'] ?? null;

        // Admin has full access – no permissions array needed
        if ($role === 'admin') {
            $permissions = [];
        } elseif ($permissions === null && $role !== 'special') {
            $permissions = config("permissions.role_defaults.{$role}", []);
        } elseif ($role === 'special' && empty($permissions)) {
            $permissions = [];
        }

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'password_changed_at' => now(),
            'role' => $role,
            'organization' => $validated['organization'] ?? null,
            'phone' => $validated['phone'] ?? null,
            'custom_role_name' => $validated['custom_role_name'] ?? null,
            'permissions' => $permissions,
            'is_active' => true,
            'is_verified' => true,
            'verified_at' => now(),
        ]);

        return response()->json([
            'message' => 'Staff account created successfully.',
            'user' => $this->formatStaffUser($user),
        ], 201);
    }

    /**
     * Show a single managed user.
     */
    public function show(User $user): JsonResponse
    {
        if (!in_array($user->role, User::MANAGED_ROLES)) {
            return response()->json(['message' => 'User is not a managed account.'], 404);
        }
        return response()->json(['user' => $this->formatStaffUser($user)]);
    }

    /**
     * Update a managed user.
     */
    public function update(Request $request, User $user): JsonResponse
    {
        if (!in_array($user->role, User::MANAGED_ROLES)) {
            return response()->json(['message' => 'User is not a managed account.'], 404);
        }
        if ($user->email === config('app.super_admin_email', 'superadmin@resourceflow.com')) {
            return response()->json(['message' => 'Cannot modify Super Admin account.'], 403);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => ['sometimes', 'email', Rule::unique('users', 'email')->ignore($user->id)],
            'password' => 'nullable|string|min:8|confirmed',
            'role' => ['sometimes', Rule::in(User::MANAGED_ROLES)],
            'organization' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:20',
            'custom_role_name' => 'nullable|string|max:100',
            'permissions' => 'nullable|array',
            'permissions.*' => 'string|max:100',
            'is_active' => 'sometimes|boolean',
        ]);

        $data = collect($validated)->except(['password', 'password_confirmation'])->filter()->toArray();

        if (!empty($validated['password'])) {
            $data['password'] = Hash::make($validated['password']);
            $data['password_changed_at'] = now();
        }

        $user->update($data);

        return response()->json([
            'message' => 'Staff account updated successfully.',
            'user' => $this->formatStaffUser($user->fresh()),
        ]);
    }

    /**
     * Deactivate (soft) or optionally delete. We use is_active = false for "deactivate".
     */
    public function destroy(Request $request, User $user): JsonResponse
    {
        if (!in_array($user->role, User::MANAGED_ROLES)) {
            return response()->json(['message' => 'User is not a managed account.'], 404);
        }
        if ($user->email === config('app.super_admin_email', 'superadmin@resourceflow.com')) {
            return response()->json(['message' => 'Cannot deactivate Super Admin account.'], 403);
        }

        if ($request->boolean('permanent')) {
            $user->delete();
            return response()->json(['message' => 'Staff account permanently deleted.']);
        }

        $user->update(['is_active' => false]);
        return response()->json(['message' => 'Staff account deactivated.']);
    }

    /**
     * Reactivate a deactivated managed account.
     */
    public function reactivate(User $user): JsonResponse
    {
        if (!in_array($user->role, User::MANAGED_ROLES)) {
            return response()->json(['message' => 'User is not a managed account.'], 404);
        }
        $user->update(['is_active' => true]);
        return response()->json([
            'message' => 'Staff account reactivated.',
            'user' => $this->formatStaffUser($user->fresh()),
        ]);
    }

    /**
     * Get permissions config (for form).
     */
    public function permissionsConfig(): JsonResponse
    {
        return response()->json([
            'permissions' => config('permissions.available', []),
            'role_defaults' => config('permissions.role_defaults', []),
            'staff_roles' => User::MANAGED_ROLES,
        ]);
    }

    private function formatStaffUser(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'display_role' => $user->display_role,
            'custom_role_name' => $user->custom_role_name,
            'organization' => $user->organization,
            'phone' => $user->phone,
            'is_active' => $user->is_active,
            'is_verified' => $user->is_verified,
            'permissions' => $user->permissions ?? [],
            'created_at' => $user->created_at?->toIso8601String(),
            'updated_at' => $user->updated_at?->toIso8601String(),
        ];
    }
}
