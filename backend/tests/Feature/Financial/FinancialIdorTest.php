<?php

use App\Models\Financial;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

function financialUser(array $overrides = []): User
{
    return User::create(array_merge([
        'name' => 'Fin User',
        'email' => 'fin-'.uniqid('', true).'@example.com',
        'password' => Hash::make('Password123!'),
        'role' => 'donor_individual',
        'password_changed_at' => now(),
        'is_active' => true,
        'is_verified' => true,
    ], $overrides));
}

it('returns 403 when accessing another users financial record', function () {
    $owner = financialUser();
    $intruder = financialUser();

    $row = Financial::create([
        'user_id' => $owner->id,
        'transaction_type' => 'Donation',
        'amount' => 10,
        'currency' => 'GHS',
        'payment_method' => 'cash',
        'status' => 'Completed',
        'description' => 'test',
        'transaction_date' => now()->toDateString(),
    ]);

    $this->actingAs($intruder);

    $this->getJson('/api/financials/'.$row->id)->assertForbidden();
});

it('allows owner to view their financial record', function () {
    $owner = financialUser();

    $row = Financial::create([
        'user_id' => $owner->id,
        'transaction_type' => 'Donation',
        'amount' => 25,
        'currency' => 'GHS',
        'payment_method' => 'cash',
        'status' => 'Completed',
        'description' => 'mine',
        'transaction_date' => now()->toDateString(),
    ]);

    $this->actingAs($owner);

    $this->getJson('/api/financials/'.$row->id)
        ->assertOk()
        ->assertJsonFragment(['id' => $row->id]);
});
