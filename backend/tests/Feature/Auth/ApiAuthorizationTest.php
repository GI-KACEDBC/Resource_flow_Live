<?php

use App\Models\User;
use Illuminate\Support\Facades\Hash;

beforeEach(function () {
    $this->withCredentials();
});

function makeUserWithRole(string $role, array $overrides = []): User
{
    return User::create(array_merge([
        'name' => 'Test User',
        'email' => $role.'-'.uniqid('', true).'@example.com',
        'password' => Hash::make('Password123!'),
        'role' => $role,
        'password_changed_at' => now(),
        'is_active' => true,
        'is_verified' => true,
    ], $overrides));
}

it('returns 403 when non-admin lists users', function () {
    $donor = makeUserWithRole('donor_individual');
    $this->actingAs($donor);

    $this->getJson('/api/users')->assertForbidden();
});

it('allows admin to list users', function () {
    $admin = makeUserWithRole('admin');
    $this->actingAs($admin);

    $this->getJson('/api/users')->assertOk();
});

it('sets allow_unverified_dashboard_access via acknowledge endpoint', function () {
    $ngo = User::create([
        'name' => 'Pending NGO',
        'email' => 'ngo-pend-'.uniqid('', true).'@example.com',
        'password' => Hash::make('Password123!'),
        'role' => 'ngo',
        'password_changed_at' => now(),
        'is_active' => true,
        'is_verified' => false,
    ]);

    $this->actingAs($ngo);

    $this->postJson('/api/auth/acknowledge-unverified-dashboard')->assertOk();

    $this->getJson('/api/auth/me')
        ->assertOk()
        ->assertJsonFragment(['allow_unverified_dashboard_access' => true]);
});
