<?php

namespace App\Policies;

use App\Models\Financial;
use App\Models\User;

class FinancialPolicy
{
    /**
     * Listing is allowed for authenticated users; the controller scopes rows (own vs super admin).
     */
    public function viewAny(User $user): bool
    {
        return true;
    }

    /**
     * Only the ledger row owner or Super Admin may view a single record.
     */
    public function view(User $user, Financial $financial): bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }

        return $financial->user_id !== null && (int) $financial->user_id === (int) $user->id;
    }

    /**
     * Manual ledger entries: platform admins or Super Admin only.
     */
    public function create(User $user): bool
    {
        return $user->isAdmin() || $user->isSuperAdmin();
    }

    public function update(User $user, Financial $financial): bool
    {
        return $this->view($user, $financial);
    }

    public function delete(User $user, Financial $financial): bool
    {
        return $this->view($user, $financial);
    }

    /**
     * Aggregated org metrics: admins or Super Admin (not plain donors/recipients).
     */
    public function viewStatistics(User $user): bool
    {
        return $user->isAdmin() || $user->isSuperAdmin();
    }
}
