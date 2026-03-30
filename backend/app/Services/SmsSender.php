<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SmsSender
{
    public function send(string $e164, string $messageBody): void
    {
        $driver = config('services.sms.driver', 'log');

        if ($driver === 'log') {
            Log::info('SMS OTP', ['to' => $e164, 'message' => $messageBody]);

            return;
        }

        if ($driver === 'http') {
            $url = config('services.sms.http_url');
            if (! $url) {
                Log::warning('SMS http driver selected but services.sms.http_url is empty.');

                return;
            }
            $payload = array_merge(
                config('services.sms.http_body', []),
                ['to' => $e164, 'message' => $messageBody, 'body' => $messageBody]
            );
            $req = Http::timeout(20);
            $headers = config('services.sms.http_headers', []);
            if ($headers !== []) {
                $req = $req->withHeaders($headers);
            }
            $token = config('services.sms.http_bearer_token');
            if ($token) {
                $req = $req->withToken($token);
            }
            $req->post($url, $payload);

            return;
        }

        if ($driver === 'twilio') {
            $sid = config('services.sms.twilio_sid');
            $token = config('services.sms.twilio_token');
            $from = config('services.sms.twilio_from');
            if (! $sid || ! $token || ! $from) {
                Log::warning('Twilio SMS not fully configured.');

                return;
            }
            Http::withBasicAuth($sid, $token)
                ->asForm()
                ->post("https://api.twilio.com/2010-04-01/Accounts/{$sid}/Messages.json", [
                    'To' => $e164,
                    'From' => $from,
                    'Body' => $messageBody,
                ]);

            return;
        }

        Log::warning('Unknown SMS driver', ['driver' => $driver]);
    }
}
