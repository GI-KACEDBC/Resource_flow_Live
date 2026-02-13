<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\GhanaCardVerificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GhanaCardVerificationController extends Controller
{
    /**
     * Verify Ghana Card via QoreID API.
     * Can be called before document upload (Verify button) or during upload flow.
     */
    public function verify(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'id_number' => 'required|string|max:50',
            'firstname' => 'required|string|max:100',
            'lastname' => 'required|string|max:100',
            'consent_given' => 'boolean',
        ]);

        $userId = $request->user()?->id;
        $consentGiven = (bool) ($validated['consent_given'] ?? false);

        $result = GhanaCardVerificationService::verifyGhanaCard(
            $validated['id_number'],
            $validated['firstname'],
            $validated['lastname'],
            $userId,
            $consentGiven
        );

        $statusCode = 200;
        if (!empty($result['error_code']) && in_array($result['error_code'], ['UNAUTHORIZED', 'SERVER_ERROR', 'EXCEPTION'], true)) {
            $statusCode = 503;
        } elseif ($result['error_code'] === 'NOT_FOUND') {
            $statusCode = 404;
        }

        return response()->json($result, $statusCode);
    }
}
