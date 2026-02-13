<?php

namespace App\Policies;

use App\Models\Allocation;
use App\Models\User;

class AllocationPolicy
{
    /**
     * Allocation creation restricted to admin, auditor, or authorized allocators
     */
    public function viewAny(User $user): bool
    {
        return true; // Scoped by role in controller
    }

    public function view(User $user, Allocation $allocation): bool
    {
        return $user->isAdmin() || $user->isAuditor() || $user->isSupplier()
            || $allocation->allocated_by === $user->id
            || ($allocation->request && $allocation->request->user_id === $user->id);
    }

    public function create(User $user): bool
    {
        return $user->isAdmin() || $user->isAuditor();
    }

    public function update(User $user, Allocation $allocation): bool
    {
        return $user->isAdmin() || $user->isAuditor() || $allocation->allocated_by === $user->id;
    }

    public function delete(User $user, Allocation $allocation): bool
    {
        return $user->isAdmin();
    }
}
