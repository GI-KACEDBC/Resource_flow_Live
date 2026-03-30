<?php

return [
    'paystack' => [
        'public_key' => env('PAYSTACK_PUBLIC_KEY'),
        'secret_key' => env('PAYSTACK_SECRET_KEY'),
    ],

    'qoreid' => [
        'client_id' => env('QOREID_CLIENT_ID'),
        'secret' => env('QOREID_SECRET'),
        'secret_key' => env('QOREID_SECRET_KEY'), // Legacy: direct Bearer token
        'workflow_id' => env('QOREID_WORKFLOW_ID'), // For image-based verification
        'verify_ssl' => filter_var(env('QOREID_VERIFY_SSL', true), FILTER_VALIDATE_BOOLEAN), // Set false only for local dev if CA bundle missing
        'cainfo' => env('QOREID_CAINFO', null), // Explicit CA bundle path; falls back to php.ini curl.cainfo
    ],

    /*
    | SMS for registration OTP. driver: log (default), http, twilio, arkesel
    | arkesel: OTP generated & verified via Arkesel (uses Main API key; see Arkesel docs).
    */
    'arkesel' => [
        'api_key' => env('ARKESEL_API_KEY'),
        'base_url' => rtrim(env('ARKESEL_BASE_URL', 'https://sms.arkesel.com/api'), '/'),
        'sender_id' => env('ARKESEL_SENDER_ID', 'Resource'),
        'otp_message' => env(
            'ARKESEL_OTP_MESSAGE',
            'Your ResourceFlow verification code is %otp_code%. Expires in %expiry% minutes.'
        ),
    ],
    /*
    | Optional fixed OTP for local E2E / manual QA only (APP_ENV=local). Never set in production.
    */
    'registration' => [
        'e2e_otp' => env('REGISTRATION_E2E_OTP'),
    ],

    'sms' => [
        'driver' => env('SMS_DRIVER', 'log'), // log | http | twilio | arkesel
        'http_url' => env('SMS_HTTP_URL'),
        'http_bearer_token' => env('SMS_HTTP_BEARER_TOKEN'),
        'http_headers' => [],
        'http_body' => [],
        'twilio_sid' => env('TWILIO_SID'),
        'twilio_token' => env('TWILIO_TOKEN'),
        'twilio_from' => env('TWILIO_FROM'),
    ],
];
