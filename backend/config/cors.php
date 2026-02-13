<?php

$frontendUrl = env('FRONTEND_URL');
$corsOrigins = env('CORS_ORIGINS'); // Optional: comma-separated for multiple, e.g. "https://yourdomain.com,https://www.yourdomain.com"
$extraOrigins = $corsOrigins
    ? array_map('trim', array_filter(explode(',', $corsOrigins)))
    : ($frontendUrl ? [rtrim($frontendUrl, '/')] : []);
$allowedOrigins = array_filter(array_merge(
    ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:5174', 'http://127.0.0.1:5174', 'http://localhost:3000'],
    $extraOrigins
));

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],
    'allowed_methods' => ['*'],
    'allowed_origins' => $allowedOrigins,
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => true,
];

