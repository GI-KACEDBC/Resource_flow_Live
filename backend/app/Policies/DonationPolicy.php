<?php

namespace App\Policies;

use App\Models\Donation;
use App\Models\User;

class DonationPolicy
{
    public function viewAny(User $user): bool
    {
        return true; // Scoped by role in controller
    }

    public function view(User $user, Donation $donation): bool
    {
        return $user->isAdmin() || $user->isAuditor() || $user->isSupplier()
            || $donation->user_id === $user->id;
    }

    public function create(User $user): bool
    {
        return $user->isSupplier() || $user->isDonor() || $user->isAdmin();
    }

    public function update(User $user, Donation $donation): bool
    {
        return $user->isAdmin() || $donation->user_id === $user->id;
    }

    /**
     * Price locking requires Auditor approval
     */
    public function lockPrice(User $user, Donation $donation): bool
    {
        return $user->isAuditor() || $user->isAdmin();
    }

    /**
     * Warehouse assignment requires Admin approval
     */
    public function assignWarehouse(User $user, Donation $donation): bool
    {
        return $user->isAdmin();
    }

    public function delete(User $user, Donation $donation): bool
    {
        return $user->isAdmin();
    }
}
