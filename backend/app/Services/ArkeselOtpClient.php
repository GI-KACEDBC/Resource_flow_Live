<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Arkesel Phone Verification OTP — generate sends SMS; verify checks the code.
 *
 * @see https://developers.arkesel.com/#tag/One-Time-Password-(OTP)
 */
class ArkeselOtpClient
{
    public function send(string $e164): void
    {
        $key = $this->requireApiKey();
        $url = $this->baseUrl().'/otp/generate';
        $number = ltrim($e164, '+');

        $expiry = min(10, max(1, RegistrationOtpService::TTL_MINUTES));
        $message = config('services.arkesel.otp_message');
        if (! is_string($message) || ! str_contains($message, '%otp_code%')) {
            throw new \RuntimeException('ARKESEL_OTP_MESSAGE must include %otp_code%.');
        }

        $senderId = $this->truncateSenderId((string) config('services.arkesel.sender_id', 'Resource'));

        $payload = [
            'expiry' => $expiry,
            'length' => 6,
            'medium' => 'sms',
            'message' => $message,
            'number' => $number,
            'sender_id' => $senderId,
            'type' => 'numeric',
        ];

        $response = Http::timeout(30)
            ->acceptJson()
            ->withHeaders(['api-key' => $key])
            ->post($url, $payload);

        if (! $response->successful()) {
            Log::error('Arkesel OTP generate HTTP error', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);
            throw new \RuntimeException('SMS verification service unavailable. Please try again later.');
        }

        $json = $response->json();
        $code = isset($json['code']) ? (string) $json['code'] : '';

        if ($code !== '1000') {
            Log::warning('Arkesel OTP generate rejected', ['response' => $json]);
            $msg = is_array($json) && isset($json['message']) ? (string) $json['message'] : 'Could not send verification SMS.';
            throw new \RuntimeException($msg);
        }
    }

    public function verify(string $otp, string $e164): bool
    {
        $key = $this->requireApiKey();
        $url = $this->baseUrl().'/otp/verify';
        $number = ltrim($e164, '+');

        $response = Http::timeout(30)
            ->acceptJson()
            ->withHeaders(['api-key' => $key])
            ->post($url, [
                'code' => $otp,
                'number' => $number,
            ]);

        if (! $response->successful()) {
            Log::info('Arkesel OTP verify HTTP non-success', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            return false;
        }

        $json = $response->json();
        $code = isset($json['code']) ? (string) $json['code'] : '';

        return $code === '1100';
    }

    private function requireApiKey(): string
    {
        $key = config('services.arkesel.api_key');
        if (! is_string($key) || $key === '') {
            throw new \RuntimeException('ARKESEL_API_KEY is not configured.');
        }

        return $key;
    }

    private function baseUrl(): string
    {
        return rtrim((string) config('services.arkesel.base_url', 'https://sms.arkesel.com/api'), '/');
    }

    /** Sender ID max 11 characters per Arkesel. */
    private function truncateSenderId(string $senderId): string
    {
        return mb_substr($senderId, 0, 11);
    }
}
