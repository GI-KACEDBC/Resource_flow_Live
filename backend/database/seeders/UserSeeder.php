<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Seeds Super Admin and Auditor users for fresh deployment.
 */
class UserSeeder extends Seeder
{
    private const PASSWORD = 'svc_r3f70w-J3TM3ga';

    public function run(): void
    {
        User::updateOrCreate(
            ['email' => 'superadmin@resourceflow.com'],
            [
                'name' => 'Super Admin',
                'email' => 'superadmin@resourceflow.com',
                'password' => Hash::make(self::PASSWORD),
                'password_changed_at' => now(),
                'role' => 'admin',
                'organization' => 'ResourceFlow',
                'phone' => null,
                'is_active' => true,
                'is_verified' => true,
                'verified_at' => now(),
            ]
        );

        User::updateOrCreate(
            ['email' => 'auditor@resourceflow.com'],
            [
                'name' => 'Auditor',
                'email' => 'auditor@resourceflow.com',
                'password' => Hash::make(self::PASSWORD),
                'password_changed_at' => now(),
                'role' => 'auditor',
                'organization' => 'ResourceFlow',
                'phone' => null,
                'is_active' => true,
                'is_verified' => true,
                'verified_at' => now(),
            ]
        );
    }
}
