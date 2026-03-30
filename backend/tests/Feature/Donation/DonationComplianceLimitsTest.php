<?php

use App\Http\Requests\StoreDonationRequest;
use App\Models\Donation;
use App\Models\Financial;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

beforeEach(function () {
    config(['services.paystack.secret_key' => 'sk_test_e2e_dummy_key']);
});

function donorUser(string $role, array $extra = []): User
{
    return User::create(array_merge([
        'name' => 'Donor',
        'email' => $role.'-'.uniqid('', true).'@example.com',
        'password' => Hash::make('Password123!'),
        'role' => $role,
        'password_changed_at' => now(),
        'is_active' => true,
        'is_verified' => true,
    ], $extra));
}

it('blocks angel donor goods donation when value exceeds GHS cap', function () {
    $angel = donorUser('angel_donor');
    $this->actingAs($angel);

    $response = $this->postJson('/api/donations', [
        'type' => 'Goods',
        'item' => 'Supplies',
        'quantity' => 1,
        'unit' => 'lot',
        'value' => StoreDonationRequest::ANGEL_DONOR_CAP + 1,
        'description' => 'over cap',
    ]);

    $response->assertStatus(422);
    expect(implode(' ', $response->json('errors.quantity') ?? []))->toContain('Angel donors are capped');
});

it('rejects quantity above database decimal limit with 422', function () {
    $corp = donorUser('donor_institution');
    $this->actingAs($corp);

    $response = $this->postJson('/api/donations', [
        'type' => 'Monetary',
        'item' => 'School Library',
        'quantity' => 499_999_999.98,
        'unit' => 'bags',
        'compliance_agreed' => true,
        'description' => 'limit test',
    ]);

    $response->assertStatus(422);
    expect(implode(' ', $response->json('errors.quantity') ?? []))->toContain('maximum allowed');
});

it('blocks corporate monetary donation when it exceeds 10 percent tax deductible cap in GHS', function () {
    $corp = donorUser('donor_institution', [
        'assessable_annual_income' => 100_000.00,
    ]);
    $this->actingAs($corp);

    $response = $this->postJson('/api/donations', [
        'type' => 'Monetary',
        'item' => 'Grant',
        'quantity' => 50_000,
        'unit' => 'GHS',
        'compliance_agreed' => true,
        'description' => 'over annual cap',
    ]);

    $response->assertStatus(422);
    expect(implode(' ', $response->json('errors.quantity') ?? []))->toContain('tax deductible limit');
});

it('treats Paystack USD webhook amount as authoritative for financial record (cross-check vs client-side GHS limits)', function () {
    $angel = donorUser('angel_donor');

    $donation = Donation::create([
        'user_id' => $angel->id,
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
            'reference' => 'wh-angel-usd-'.uniqid(),
            'amount' => 1_000_000,
            'currency' => 'USD',
            'metadata' => [
                'donation_id' => $donation->id,
                'type' => 'Donation',
            ],
        ],
    ];

    $raw = json_encode($payload);
    $sig = hash_hmac('sha512', $raw, config('services.paystack.secret_key'));

    $this->call('POST', '/api/payments/paystack-webhook', [], [], [], [
        'HTTP_X_PAYSTACK_SIGNATURE' => $sig,
        'CONTENT_TYPE' => 'application/json',
    ], $raw)->assertOk();

    $financial = Financial::where('payment_reference', $payload['data']['reference'])->first();
    expect($financial)->not->toBeNull();
    expect($financial->currency)->toBe('USD');
    expect((float) $financial->amount)->toBe(10_000.0);
});
