<?php

use App\Models\User;
use App\Services\RegistrationOtpService;
use Illuminate\Support\Facades\Hash;

beforeEach(function () {
    config(['services.paystack.secret_key' => env('PAYSTACK_SECRET_KEY')]);
    // JSON requests omit cookies unless this is set; session auth requires the laravel_session cookie chain.
    $this->withCredentials();
});

function makeUser(array $overrides = []): User
{
    return User::create(array_merge([
        'name' => 'Test User',
        'email' => 'session-test@example.com',
        'password' => Hash::make('Password123!'),
        'role' => 'donor_individual',
        'password_changed_at' => now(),
        'is_active' => true,
        'is_verified' => true,
    ], $overrides));
}

it('registers a user and returns authenticated user payload', function () {
    $email = 'newreg-'.uniqid('', true).'@example.com';
    $otpService = app(RegistrationOtpService::class);
    $otp = $otpService->generateAndStore('email', $email, null);

    $response = $this->postJson('/api/auth/register', [
        'name' => 'New Reg',
        'email' => $email,
        'password' => 'Password123!',
        'password_confirmation' => 'Password123!',
        'role' => 'angel_donor',
        'organization' => '',
        'phone' => '',
        'otp_channel' => 'email',
        'otp' => $otp,
    ]);

    $response->assertCreated();
    expect($response->json('user.email'))->toContain('@example.com');
    expect($response->json('user.role'))->toBe('angel_donor');
});

it('logs in with session and can access auth me', function () {
    $user = makeUser(['email' => 'login-'.uniqid('', true).'@example.com']);

    $this->postJson('/api/auth/login', [
        'email' => $user->email,
        'password' => 'Password123!',
    ])->assertOk();

    $this->getJson('/api/auth/me')->assertOk()->assertJsonFragment(['email' => $user->email]);
});

it('logs out and subsequent me is unauthenticated', function () {
    $user = makeUser(['email' => 'logout-'.uniqid('', true).'@example.com']);

    $this->postJson('/api/auth/login', [
        'email' => $user->email,
        'password' => 'Password123!',
    ])->assertOk();

    $this->getJson('/api/auth/me')->assertOk();

    $this->postJson('/api/auth/logout')->assertOk();

    // Sanctum's RequestGuard caches the user on the guard singleton; a new HTTP call does not
    // clear it in-process. Real PHP-FPM workers reset between requests; forgetGuards mirrors that.
    $this->app['auth']->forgetGuards();

    $this->getJson('/api/auth/me')->assertStatus(401);
});
