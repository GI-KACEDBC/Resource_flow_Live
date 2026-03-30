<?php

namespace App\Policies;

use App\Models\Project;
use App\Models\User;

class ProjectPolicy
{
    public function verifyFundingCeilingAdmin(User $user, Project $project): bool
    {
        return $user->isAdmin();
    }

    public function verifyFundingCeilingAuditor(User $user, Project $project): bool
    {
        return $user->isAuditor();
    }
}
