<?php

use App\Models\Donation;
use App\Models\Financial;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;

beforeEach(function () {
    config(['services.paystack.secret_key' => 'sk_test_e2e_dummy_key']);
});

function paymentTestUser(array $overrides = []): User
{
    return User::create(array_merge([
        'name' => 'Pay User',
        'email' => 'pay-'.uniqid('', true).'@example.com',
        'password' => Hash::make('Password123!'),
        'role' => 'donor_individual',
        'password_changed_at' => now(),
        'is_active' => true,
        'is_verified' => true,
    ], $overrides));
}

it('persists financial amount and currency from Paystack verify response not client hint', function () {
    Http::fake([
        'api.paystack.co/transaction/verify/*' => Http::response([
            'status' => true,
            'data' => [
                'status' => 'success',
                'amount' => 19_950,
                'currency' => 'GHS',
            ],
        ], 200),
    ]);

    $user = paymentTestUser();
    $this->actingAs($user);

    $donation = Donation::create([
        'user_id' => $user->id,
        'type' => 'Monetary',
        'item' => 'Cash',
        'quantity' => 199.50,
        'remaining_quantity' => 199.50,
        'unit' => 'GHS',
        'status' => 'Pending',
    ]);

    $response = $this->postJson('/api/payments/verify', [
        'reference' => 'ref-verify-'.uniqid(),
        'amount' => 50,
        'type' => 'Donation',
        'donation_id' => $donation->id,
    ]);

    $response->assertOk();
    expect((float) $response->json('financial.amount'))->toBe(199.50);
    expect($response->json('financial.currency'))->toBe('GHS');
});

it('resolves donation by paystack_reference and marks monetary donation verified on verify endpoint', function () {
    Http::fake([
        'api.paystack.co/transaction/verify/*' => Http::response([
            'status' => true,
            'data' => [
                'status' => 'success',
                'amount' => 499_900,
                'currency' => 'GHS',
            ],
        ], 200),
    ]);

    $user = paymentTestUser();
    $this->actingAs($user);

    $donation = Donation::create([
        'user_id' => $user->id,
        'type' => 'Monetary',
        'item' => 'Fund',
        'quantity' => 4999,
        'remaining_quantity' => 4999,
        'unit' => 'GHS',
        'status' => 'Pending',
        'paystack_reference' => 'ref-verify-by-ref-'.uniqid(),
    ]);

    $response = $this->postJson('/api/payments/verify', [
        'reference' => $donation->paystack_reference,
        'type' => 'Donation',
    ]);

    $response->assertOk();
    $donation->refresh();
    expect($donation->status)->toBe('Verified');
});

it('rejects verify when donation_id belongs to another user', function () {
    Http::fake([
        'api.paystack.co/transaction/verify/*' => Http::response([
            'status' => true,
            'data' => [
                'status' => 'success',
                'amount' => 10_000,
                'currency' => 'GHS',
            ],
        ], 200),
    ]);

    $owner = paymentTestUser();
    $other = paymentTestUser();

    $donation = Donation::create([
        'user_id' => $owner->id,
        'type' => 'Monetary',
        'item' => 'Cash',
        'quantity' => 100,
        'remaining_quantity' => 100,
        'unit' => 'GHS',
        'status' => 'Pending',
    ]);

    $this->actingAs($other);

    $this->postJson('/api/payments/verify', [
        'reference' => 'ref-bad-'.uniqid(),
        'type' => 'Donation',
        'donation_id' => $donation->id,
    ])->assertStatus(403);
});

it('creates financial from webhook using Paystack payload amounts in USD', function () {
    $user = paymentTestUser();

    $donation = Donation::create([
        'user_id' => $user->id,
        'type' => 'Monetary',
        'item' => 'Cash',
        'quantity' => 100,
        'remaining_quantity' => 100,
        'unit' => 'GHS',
        'status' => 'Pending',
    ]);

    $payload = [
        'event' => 'charge.success',
        'data' => [
            'reference' => 'wh-usd-'.uniqid(),
            'amount' => 50_000,
            'currency' => 'USD',
            'metadata' => [
                'donation_id' => $donation->id,
                'type' => 'Donation',
            ],
        ],
    ];

    $raw = json_encode($payload);
    $sig = hash_hmac('sha512', $raw, config('services.paystack.secret_key'));

    $response = $this->call('POST', '/api/payments/paystack-webhook', [], [], [], [
        'HTTP_X_PAYSTACK_SIGNATURE' => $sig,
        'CONTENT_TYPE' => 'application/json',
        'HTTP_ACCEPT' => 'application/json',
    ], $raw);

    $response->assertOk();

    $row = Financial::where('payment_reference', $payload['data']['reference'])->first();
    expect($row)->not->toBeNull();
    expect((float) $row->amount)->toBe(500.0);
    expect($row->currency)->toBe('USD');

    $donation->refresh();
    expect($donation->status)->toBe('Verified');
});

it('allows admin to verify pending monetary donation with Paystack reference', function () {
    Http::fake([
        'api.paystack.co/transaction/verify/*' => Http::response([
            'status' => true,
            'data' => [
                'status' => 'success',
                'amount' => 10_000_000,
                'currency' => 'GHS',
            ],
        ], 200),
    ]);

    $donor = paymentTestUser();
    $admin = User::create([
        'name' => 'Admin',
        'email' => 'admin-pay-'.uniqid('', true).'@example.com',
        'password' => Hash::make('Password123!'),
        'role' => 'admin',
        'password_changed_at' => now(),
        'is_active' => true,
        'is_verified' => true,
    ]);

    $donation = Donation::create([
        'user_id' => $donor->id,
        'type' => 'Monetary',
        'item' => 'Cash',
        'quantity' => 100_000,
        'remaining_quantity' => 100_000,
        'unit' => 'GHS',
        'status' => 'Pending',
    ]);

    $this->actingAs($admin);

    $response = $this->postJson("/api/donations/{$donation->id}/verify-monetary-payment", [
        'reference' => 'ref-admin-verify-'.uniqid(),
    ]);

    $response->assertOk();
    $donation->refresh();
    expect($donation->status)->toBe('Verified');
});

it('matches webhook to donation by paystack_reference when metadata donation_id is missing', function () {
    $user = paymentTestUser();

    $donation = Donation::create([
        'user_id' => $user->id,
        'type' => 'Monetary',
        'item' => 'Cash',
        'quantity' => 100,
        'remaining_quantity' => 100,
        'unit' => 'GHS',
        'status' => 'Pending',
        'paystack_reference' => 'ref-meta-missing-'.uniqid(),
    ]);

    $payload = [
        'event' => 'charge.success',
        'data' => [
            'reference' => $donation->paystack_reference,
            'amount' => 10_000_000,
            'currency' => 'GHS',
            'metadata' => [],
        ],
    ];

    $raw = json_encode($payload);
    $sig = hash_hmac('sha512', $raw, config('services.paystack.secret_key'));

    $this->call('POST', '/api/payments/paystack-webhook', [], [], [], [
        'HTTP_X_PAYSTACK_SIGNATURE' => $sig,
        'CONTENT_TYPE' => 'application/json',
        'HTTP_ACCEPT' => 'application/json',
    ], $raw)->assertOk();

    $donation->refresh();
    expect($donation->status)->toBe('Verified');
});
