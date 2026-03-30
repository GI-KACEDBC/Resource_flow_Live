<?php

use App\Models\User;
use Illuminate\Support\Facades\Http;

beforeEach(function () {
    $this->withCredentials();
});

it('uses arkesel generate and verify for sms signup', function () {
    config(['services.sms.driver' => 'arkesel']);
    config(['services.arkesel.api_key' => 'test_main_api_key']);

    Http::fake(function (\Illuminate\Http\Client\Request $request) {
        if (str_contains($request->url(), '/otp/generate')) {
            return Http::response([
                'code' => '1000',
                'message' => 'Successful, OTP is being processed for delivery',
            ], 200);
        }
        if (str_contains($request->url(), '/otp/verify')) {
            return Http::response([
                'code' => '1100',
                'message' => 'Successful',
            ], 200);
        }

        return Http::response(['message' => 'unexpected'], 404);
    });

    $email = 'arkesel-'.uniqid('', true).'@example.com';
    $phone = '0241234567';

    $this->postJson('/api/auth/register/send-otp', [
        'email' => $email,
        'otp_channel' => 'sms',
        'phone' => $phone,
    ])->assertOk();

    $this->postJson('/api/auth/register', [
        'name' => 'Arkesel User',
        'email' => $email,
        'password' => 'Password123!',
        'password_confirmation' => 'Password123!',
        'role' => 'angel_donor',
        'organization' => '',
        'phone' => $phone,
        'otp_channel' => 'sms',
        'otp' => '123456',
    ])->assertCreated();

    expect(User::where('email', $email)->exists())->toBeTrue();

    Http::assertSent(fn (\Illuminate\Http\Client\Request $r) => str_contains($r->url(), '/otp/generate'));
    Http::assertSent(fn (\Illuminate\Http\Client\Request $r) => str_contains($r->url(), '/otp/verify'));
});
