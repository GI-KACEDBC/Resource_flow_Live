<?php

namespace App\Policies;

use App\Models\DeliveryRoute;
use App\Models\User;

class DeliveryRoutePolicy
{
    /**
     * Deliveries require Distributor role (or admin). Recipient confirmation required for completion.
     */
    public function viewAny(User $user): bool
    {
        return $user->isAdmin() || $user->isDistributor() || $user->isSupplier();
    }

    public function view(User $user, DeliveryRoute $deliveryRoute): bool
    {
        return $user->isAdmin() || $user->isDistributor() || $user->isSupplier();
    }

    public function create(User $user): bool
    {
        return $user->isAdmin() || $user->isDistributor();
    }

    public function update(User $user, DeliveryRoute $deliveryRoute): bool
    {
        return $user->isAdmin() || $user->isDistributor();
    }

    public function delete(User $user, DeliveryRoute $deliveryRoute): bool
    {
        return $user->isAdmin();
    }

    /**
     * Complete delivery: requires Distributor and optionally recipient confirmation
     */
    public function complete(User $user, DeliveryRoute $deliveryRoute): bool
    {
        return ($user->isAdmin() || $user->isDistributor());
    }
}
