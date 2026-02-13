<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Ghana Card verification via QoreID API.
 * Compliant with Ghana Data Protection Act - only verification status and request_id are logged.
 *
 * @see https://docs.qoreid.com/docs/ghana-card
 */
class GhanaCardVerificationService
{
    private const FORMAT_REGEX = '/^GHA-\d{9}-\d$/';

    private const BASE_URL = 'https://api.qoreid.com/v1/gh/identities/ghana-id';

    /**
     * Normalize Ghana Card input: uppercase, ensure GHA- prefix and dashes.
     * Handles inputs like "gha7000000000" or "700000000-0".
     */
    public static function normalizeIdNumber(string $idNumber): string
    {
        $cleaned = strtoupper(trim(preg_replace('/\s+/', '', $idNumber)));

        // Remove "GHA" prefix if present to extract digits
        $digits = preg_replace('/^GHA-?/', '', $cleaned);
        $digits = preg_replace('/[^0-9]/', '', $digits);

        if (strlen($digits) === 10) {
            return 'GHA-' . substr($digits, 0, 9) . '-' . substr($digits, 9, 1);
        }

        return $cleaned;
    }

    /**
     * Validate Ghana Card format before API call.
     */
    public static function isValidFormat(string $idNumber): bool
    {
        $normalized = self::normalizeIdNumber($idNumber);
        return (bool) preg_match(self::FORMAT_REGEX, $normalized);
    }

    /**
     * Verify Ghana Card against NIA via QoreID.
     *
     * @return array{verified: bool, name_mismatch: bool, photo?: string, request_id?: string, nia_first_name?: string, nia_last_name?: string, error?: string, error_code?: string}
     */
    public static function verifyGhanaCard(
        string $idNumber,
        string $firstname,
        string $lastname,
        ?int $userId = null,
        bool $consentGiven = false
    ): array {
        $normalized = self::normalizeIdNumber($idNumber);

        if (!self::isValidFormat($normalized)) {
            return [
                'verified' => false,
                'name_mismatch' => false,
                'error' => 'Invalid Ghana Card format. Expected format: GHA-XXXXXXXXX-X',
                'error_code' => 'INVALID_FORMAT',
            ];
        }

        $secretKey = config('services.qoreid.secret_key') ?? env('QOREID_SECRET_KEY');
        if (empty($secretKey)) {
            Log::warning('Ghana Card verification skipped: QOREID_SECRET_KEY not configured');
            return [
                'verified' => false,
                'name_mismatch' => false,
                'error' => 'Verification service not configured.',
                'error_code' => 'SERVICE_UNAVAILABLE',
            ];
        }

        // Log consent for Ghana Data Protection Act (only status, no PII in logs)
        if ($userId && $consentGiven) {
            Log::channel('single')->info('Ghana Card verification consent logged', [
                'user_id' => $userId,
                'action' => 'ghana_card_verification_consent',
                'consent_given' => true,
            ]);
        }

        try {
            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $secretKey,
                'Content-Type' => 'application/json',
            ])->post(self::BASE_URL . '/' . $normalized, [
                'firstname' => trim($firstname),
                'lastname' => trim($lastname),
            ]);

            $statusCode = $response->status();
            $body = $response->json();

            // Handle error responses
            if ($statusCode === 401) {
                Log::warning('QoreID API unauthorized', ['request_id' => $body['id'] ?? null]);
                return [
                    'verified' => false,
                    'name_mismatch' => false,
                    'error' => 'Verification service authentication failed.',
                    'error_code' => 'UNAUTHORIZED',
                ];
            }

            if ($statusCode === 404) {
                return [
                    'verified' => false,
                    'name_mismatch' => false,
                    'error' => 'Ghana Card not found in NIA database.',
                    'error_code' => 'NOT_FOUND',
                ];
            }

            if ($statusCode >= 500) {
                Log::warning('QoreID API server error', [
                    'status' => $statusCode,
                    'request_id' => $body['id'] ?? null,
                ]);
                return [
                    'verified' => false,
                    'name_mismatch' => false,
                    'error' => 'Verification service temporarily unavailable. Please try again later.',
                    'error_code' => 'SERVER_ERROR',
                ];
            }

            if (!$response->successful()) {
                $message = $body['message'] ?? $body['error'] ?? 'Verification failed.';
                return [
                    'verified' => false,
                    'name_mismatch' => false,
                    'error' => is_string($message) ? $message : 'Verification failed.',
                    'error_code' => 'VERIFICATION_FAILED',
                ];
            }

            // Map QoreID response
            $status = $body['status'] ?? [];
            $state = $status['state'] ?? '';
            $verifiedStatus = $status['status'] ?? '';
            $isVerified = ($state === 'complete' && $verifiedStatus === 'verified');

            $ghanaId = $body['ghana_id'] ?? [];
            $niaFirstName = $ghanaId['firstName'] ?? '';
            $niaLastName = $ghanaId['lastName'] ?? '';
            $photo = $ghanaId['photo'] ?? null;
            $requestId = $body['id'] ?? null;

            // Name mismatch check (case-insensitive, trimmed)
            $userFirst = strtolower(trim($firstname));
            $userLast = strtolower(trim($lastname));
            $niaFirst = strtolower(trim($niaFirstName));
            $niaLast = strtolower(trim($niaLastName));
            $nameMismatch = !$isVerified || ($userFirst !== $niaFirst || $userLast !== $niaLast);

            // Only log verification status and request_id (no PII)
            Log::channel('single')->info('Ghana Card verification result', [
                'verification_status' => $isVerified ? 'verified' : 'not_verified',
                'request_id' => $requestId,
            ]);

            $result = [
                'verified' => $isVerified && !$nameMismatch,
                'name_mismatch' => $isVerified && $nameMismatch,
                'request_id' => $requestId,
                'nia_first_name' => $niaFirstName,
                'nia_last_name' => $niaLastName,
            ];

            if ($photo) {
                $result['photo'] = $photo;
            }

            if ($nameMismatch && $isVerified) {
                $result['error'] = 'The name on your Ghana Card does not match the name you provided.';
                $result['error_code'] = 'NAME_MISMATCH';
            }

            return $result;
        } catch (\Throwable $e) {
            Log::error('Ghana Card verification exception', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return [
                'verified' => false,
                'name_mismatch' => false,
                'error' => 'Verification service temporarily unavailable. Please try again later.',
                'error_code' => 'EXCEPTION',
            ];
        }
    }
}
