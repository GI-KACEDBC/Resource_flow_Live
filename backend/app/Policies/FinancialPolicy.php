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
     * Ledger row owner, Super Admin, or Auditor (read-only) may view a single record.
     */
    public function view(User $user, Financial $financial): bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }

        if ($user->isAuditor()) {
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
        if ($user->isAuditor()) {
            return false;
        }

        return $this->view($user, $financial);
    }

    public function delete(User $user, Financial $financial): bool
    {
        if ($user->isAuditor()) {
            return false;
        }

        return $this->view($user, $financial);
    }

    /**
     * Aggregated org metrics: admins, Super Admin, or auditor (same cash KPIs as admin dashboards).
     */
    public function viewStatistics(User $user): bool
    {
        return $user->isAdmin() || $user->isSuperAdmin() || $user->isAuditor();
    }
}
