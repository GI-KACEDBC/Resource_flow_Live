<?php

use App\Models\User;
use App\Services\RegistrationOtpService;
use Illuminate\Support\Facades\Hash;

beforeEach(function () {
    $this->withCredentials();
});

it('rejects register when otp is wrong', function () {
    $email = 'bad-otp-'.uniqid('', true).'@example.com';
    $otpService = app(RegistrationOtpService::class);
    $otpService->generateAndStore('email', $email, null);

    $response = $this->postJson('/api/auth/register', [
        'name' => 'Test User',
        'email' => $email,
        'password' => 'Password123!',
        'password_confirmation' => 'Password123!',
        'role' => 'angel_donor',
        'organization' => '',
        'phone' => '',
        'otp_channel' => 'email',
        'otp' => '000000',
    ]);

    $response->assertStatus(422);
    expect(User::where('email', $email)->exists())->toBeFalse();
});

it('registers when email otp matches', function () {
    $email = 'good-otp-'.uniqid('', true).'@example.com';
    $otpService = app(RegistrationOtpService::class);
    $otp = $otpService->generateAndStore('email', $email, null);

    $response = $this->postJson('/api/auth/register', [
        'name' => 'Test User',
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
    expect(User::where('email', $email)->exists())->toBeTrue();
});

it('registers when sms otp matches', function () {
    $email = 'sms-otp-'.uniqid('', true).'@example.com';
    $phone = '0241234567';
    $otpService = app(RegistrationOtpService::class);
    $otp = $otpService->generateAndStore('sms', $email, $phone);

    $response = $this->postJson('/api/auth/register', [
        'name' => 'SMS User',
        'email' => $email,
        'password' => 'Password123!',
        'password_confirmation' => 'Password123!',
        'role' => 'angel_donor',
        'organization' => '',
        'phone' => $phone,
        'otp_channel' => 'sms',
        'otp' => $otp,
    ]);

    $response->assertCreated();
    $user = User::where('email', $email)->first();
    expect($user)->not->toBeNull();
    expect($user->phone)->toBe($phone);
});

it('send-otp requires unique email', function () {
    $email = 'taken-'.uniqid('', true).'@example.com';
    User::create([
        'name' => 'Taken',
        'email' => $email,
        'password' => Hash::make('Password123!'),
        'role' => 'donor_individual',
        'password_changed_at' => now(),
        'is_active' => true,
        'is_verified' => true,
    ]);

    $this->postJson('/api/auth/register/send-otp', [
        'email' => $email,
        'otp_channel' => 'email',
    ])->assertStatus(422);
});
