<?php

namespace App\Policies;

use App\Models\Logistic;
use App\Models\User;

class LogisticPolicy
{
    public function view(User $user, Logistic $logistic): bool
    {
        if ($user->isAdmin() || $user->isDistributor() || $user->isSupplier()) {
            return true;
        }
        $route = $logistic->deliveryRoute;
        return $route && ($route->driver_id === $user->id
            || ($route->allocation && $route->allocation->request && $route->allocation->request->user_id === $user->id));
    }
}
