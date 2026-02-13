<?php

return [
    'paystack' => [
        'public_key' => env('PAYSTACK_PUBLIC_KEY'),
        'secret_key' => env('PAYSTACK_SECRET_KEY'),
    ],

    'qoreid' => [
        'secret_key' => env('QOREID_SECRET_KEY'),
    ],
];
