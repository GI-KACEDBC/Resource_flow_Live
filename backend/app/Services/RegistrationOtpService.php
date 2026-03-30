<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Mail;

class RegistrationOtpService
{
    public const TTL_MINUTES = 10;

    public function generateAndStore(string $channel, string $email, ?string $phone): string
    {
        if ($channel === 'sms' && $this->usesArkeselSms()) {
            // Arkesel generates and sends the code; verification uses their /otp/verify API.
            return '';
        }

        $otp = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $key = $this->cacheKey($channel, $email, $phone);
        Cache::put($key, $this->hashOtp($otp), now()->addMinutes(self::TTL_MINUTES));

        return $otp;
    }

    public function verify(string $channel, string $email, ?string $phone, string $otp): bool
    {
        $key = $this->cacheKey($channel, $email, $phone);

        $e2e = config('services.registration.e2e_otp');
        if ($e2e !== null && $e2e !== '' && app()->environment('local') && hash_equals($e2e, $otp)) {
            if ($channel === 'email') {
                Cache::forget($key);
            }

            return true;
        }

        if ($channel === 'sms' && $this->usesArkeselSms()) {
            $normalized = $this->normalizeGhanaPhone($phone ?? '');
            if (! $normalized) {
                return false;
            }

            return app(ArkeselOtpClient::class)->verify($otp, $normalized);
        }

        $stored = Cache::get($key);
        if (! $stored || ! hash_equals($stored, $this->hashOtp($otp))) {
            return false;
        }
        Cache::forget($key);

        return true;
    }

    public function hashOtp(string $otp): string
    {
        return hash('sha256', $otp.config('app.key'));
    }

    public function cacheKey(string $channel, string $email, ?string $phone): string
    {
        if ($channel === 'email') {
            return 'reg_otp:email:'.strtolower(trim($email));
        }
        $normalized = $this->normalizeGhanaPhone($phone ?? '');
        if (! $normalized) {
            throw new \InvalidArgumentException('Invalid phone for SMS channel.');
        }

        return 'reg_otp:sms:'.$normalized;
    }

    /**
     * Normalize to E.164 for Ghana (+233…). Returns null if invalid.
     */
    public function normalizeGhanaPhone(string $phone): ?string
    {
        $trimmed = trim($phone);
        if ($trimmed === '') {
            return null;
        }
        $digits = preg_replace('/\D/', '', $trimmed);
        if ($digits === '') {
            return null;
        }
        if (strlen($digits) === 10 && str_starts_with($digits, '0')) {
            return '+233'.substr($digits, 1);
        }
        if (strlen($digits) === 12 && str_starts_with($digits, '233')) {
            return '+'.$digits;
        }
        if (strlen($digits) === 9) {
            return '+233'.$digits;
        }
        if (str_starts_with($trimmed, '+')) {
            $d = preg_replace('/\D/', '', $trimmed);
            if (strlen($d) >= 10 && strlen($d) <= 15) {
                return '+'.$d;
            }
        }

        return null;
    }

    public function sendEmailOtp(string $email, string $otp): void
    {
        $app = config('app.name', 'ResourceFlow');
        Mail::raw(
            "Your {$app} verification code is: {$otp}\n\nThis code expires in ".self::TTL_MINUTES.' minutes. If you did not request this, you can ignore this message.',
            function ($message) use ($email, $app) {
                $message->to($email)->subject("{$app} — your verification code");
            }
        );
    }

    public function sendSmsOtp(string $e164, string $otp): void
    {
        if ($this->usesArkeselSms()) {
            app(ArkeselOtpClient::class)->send($e164);

            return;
        }

        $app = config('app.name', 'ResourceFlow');
        $body = "{$app} code: {$otp}. Valid ".self::TTL_MINUTES.' min.';
        app(SmsSender::class)->send($e164, $body);
    }

    public function usesArkeselSms(): bool
    {
        return config('services.sms.driver') === 'arkesel';
    }
}
