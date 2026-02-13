<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class NGOVerificationController extends Controller
{
    /**
     * Get all NGOs pending verification (AUDITOR only)
     */
    public function index(Request $request): JsonResponse
    {
        $user = Auth::user();

        if (!$user->isAuditor()) {
            return response()->json([
                'message' => 'Only auditors can access verification dashboard',
            ], 403);
        }

        $status = $request->input('status', 'pending'); // pending, verified, flagged

        $ngos = User::where('role', 'ngo')
            ->where('verification_status', $status)
            ->with(['verificationDocuments', 'verifier'])
            ->orderBy('created_at', 'desc')
            ->paginate($request->input('per_page', 15));

        return response()->json($ngos);
    }

    /**
     * Verify an NGO (AUDITOR only)
     */
    public function verify(Request $request, $ngoId): JsonResponse
    {
        $user = Auth::user();

        if (!$user->isAuditor()) {
            return response()->json([
                'message' => 'Only auditors can verify NGOs',
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'status' => 'required|in:verified,flagged',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $ngo = User::where('role', 'ngo')->findOrFail($ngoId);

        $ngo->update([
            'verification_status' => $request->status,
            'is_verified' => $request->status === 'verified',
            'verified_by' => $user->id,
            'verified_at' => now(),
        ]);

        return response()->json([
            'message' => "NGO {$request->status} successfully",
            'ngo' => $ngo->load(['verifier', 'verificationDocuments']),
        ]);
    }

    /**
     * Get verification details for a specific NGO
     */
    public function show($ngoId): JsonResponse
    {
        $user = Auth::user();
        $ngo = User::where('role', 'ngo')
            ->with(['verificationDocuments', 'verifier', 'projects'])
            ->findOrFail($ngoId);

        // Only auditors and the NGO itself can view
        if (!$user->isAuditor() && $ngo->id !== $user->id) {
            return response()->json([
                'message' => 'Unauthorized',
            ], 403);
        }

        return response()->json($ngo);
    }
}
