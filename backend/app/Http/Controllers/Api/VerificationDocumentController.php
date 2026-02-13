<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\VerificationDocumentResource;
use App\Models\VerificationDocument;
use App\Services\GhanaCardVerificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class VerificationDocumentController extends Controller
{
    public function index(Request $request): JsonResponse
{   
    $user = $request->user();
    $query = VerificationDocument::with(['user', 'verifier']);

    /** * PII PROTECTION: 
     * If the user is NOT an Admin, Super Admin, or Auditor, force the query to only 
     * return their own documents. Otherwise, allow them to filter by user_id.
     */
    if (!$user->isAdmin() && !$user->isSuperAdmin() && !$user->isAuditor()) {
        $query->where('user_id', $user->id);
    } elseif ($request->has('user_id')) {
        $query->where('user_id', (int) $request->user_id);
    }

    if ($request->has('verification_status')) {
        $query->where('verification_status', $request->verification_status);
    }

    $documents = $query->orderBy('created_at', 'desc')->get();
    
    return response()->json(VerificationDocumentResource::collection($documents));
}

    public function show(VerificationDocument $verificationDocument): JsonResponse
    {
        // Fix: Check if user owns the document or is an Admin/Super Admin/Auditor
        $user = auth()->user();
        if ($verificationDocument->user_id !== $user->id && !$user->isAdmin() && !$user->isSuperAdmin() && !$user->isAuditor()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
    
        $verificationDocument->load(['user', 'verifier']);
        return response()->json(new VerificationDocumentResource($verificationDocument));
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'document_type' => 'required|in:Ghana Card,Business Registration,Tax Certificate,Other',
            'document_number' => 'nullable|string|max:255',
            'firstname' => 'nullable|string|max:100',
            'lastname' => 'nullable|string|max:100',
            'consent_given' => 'boolean',
            'file' => 'required|file|mimes:pdf,jpg,jpeg,png|max:10240', // 10MB max
        ]);

        $user = $request->user();
        $documentType = $validated['document_type'];
        $documentNumber = $validated['document_number'] ?? null;

        $qoreidRequestId = null;
        $qoreidPhoto = null;

        // Ghana Card: verify via QoreID before saving (when configured)
        if ($documentType === 'Ghana Card' && $documentNumber) {
            $nameParts = $this->parseUserName($user->name, $validated['firstname'] ?? null, $validated['lastname'] ?? null);
            if (!$nameParts) {
                return response()->json([
                    'message' => 'First name and last name are required for Ghana Card verification.',
                    'error_code' => 'NAME_REQUIRED',
                ], 422);
            }

            $result = GhanaCardVerificationService::verifyGhanaCard(
                $documentNumber,
                $nameParts['firstname'],
                $nameParts['lastname'],
                $user->id,
                (bool) ($validated['consent_given'] ?? false)
            );

            // When QoreID is not configured (SERVICE_UNAVAILABLE), save document for manual review
            $skipVerification = ($result['error_code'] ?? '') === 'SERVICE_UNAVAILABLE';

            if (!$skipVerification && !empty($result['error'])) {
                $statusCode = match ($result['error_code'] ?? '') {
                    'NAME_MISMATCH' => 422,
                    'NOT_FOUND', 'INVALID_FORMAT' => 422,
                    default => 503,
                };
                return response()->json([
                    'message' => $result['error'],
                    'error_code' => $result['error_code'] ?? 'VERIFICATION_FAILED',
                ], $statusCode);
            }

            if (!$skipVerification && !$result['verified']) {
                return response()->json([
                    'message' => $result['error'] ?? 'Ghana Card verification failed. Please ensure your details match the NIA records.',
                    'error_code' => $result['error_code'] ?? 'VERIFICATION_FAILED',
                ], 422);
            }

            $qoreidRequestId = $result['request_id'] ?? null;
            $qoreidPhoto = $result['photo'] ?? null;
        }

        $file = $request->file('file');
        $path = $file->store('verification-documents', 'public');
        $roleTimestamp = $this->getRoleTimestampForUpload($user->role);

        $documentData = array_merge([
            'user_id' => $user->id,
            'document_type' => $documentType,
            'document_number' => $documentNumber,
            'file_path' => $path,
            'file_name' => $file->getClientOriginalName(),
            'mime_type' => $file->getMimeType(),
            'file_size' => $file->getSize(),
            'verification_status' => 'Pending',
        ], $roleTimestamp ? [$roleTimestamp => now()] : []);

        if ($qoreidRequestId) {
            $documentData['qoreid_request_id'] = $qoreidRequestId;
            $documentData['qoreid_verified_at'] = now();
        }
        if ($qoreidPhoto) {
            $documentData['qoreid_photo'] = $qoreidPhoto;
        }

        $document = VerificationDocument::create($documentData);
        $document->load(['user']);
        return response()->json(new VerificationDocumentResource($document), 201);
    }

    /**
     * Parse first/last name from user or request. Returns null if insufficient.
     */
    private function parseUserName(?string $userName, ?string $firstname, ?string $lastname): ?array
    {
        if ($firstname && $lastname) {
            return ['firstname' => $firstname, 'lastname' => $lastname];
        }
        if ($userName) {
            $parts = preg_split('/\s+/', trim($userName), 2);
            if (count($parts) >= 2) {
                return ['firstname' => $parts[0], 'lastname' => $parts[1]];
            }
            if (count($parts) === 1 && $parts[0]) {
                return ['firstname' => $parts[0], 'lastname' => $parts[0]];
            }
        }
        return null;
    }

    public function verify(Request $request, VerificationDocument $verificationDocument): JsonResponse
    {
        // Access the authenticated user
        $user = $request->user();

        // Check if the user has the required privileges
        if (!$user->isAdmin() && !$user->isAuditor()) {
        return response()->json([
            'message' => 'Unauthorized. Only Admins or Auditors can verify documents.'
        ], 403);
        }
        $validated = $request->validate([
            'verification_status' => 'required|in:Verified,Rejected',
            'rejection_reason' => 'required_if:verification_status,Rejected|nullable|string',
            'notes' => 'nullable|string',
        ]);

        $verifier = $request->user();
        $roleTimestamp = match ($verifier->role) {
            'admin' => ['admin_reviewed_at' => now()],
            'field_agent' => ['field_agent_verified_at' => now()],
            default => [],
        };

        $verificationDocument->update(array_merge([
            'verification_status' => $validated['verification_status'],
            'verified_by' => $verifier->id,
            'verified_at' => now(),
            'rejection_reason' => $validated['rejection_reason'] ?? null,
            'notes' => $validated['notes'] ?? null,
        ], $roleTimestamp));

        // Update user verification status if document is verified
        if ($validated['verification_status'] === 'Verified') {
            $user = $verificationDocument->user;
            
            // Check if user has all required documents verified
            $requiredDocs = ['Ghana Card'];
            if ($user->role === 'supplier') {
                $requiredDocs[] = 'Business Registration';
            }

            $verifiedDocs = VerificationDocument::where('user_id', $user->id)
                ->where('verification_status', 'Verified')
                ->whereIn('document_type', $requiredDocs)
                ->count();

            // If all required documents are verified, mark user as verified
            if ($verifiedDocs >= count($requiredDocs)) {
                $user->update([
                    'is_verified' => true,
                    'verified_at' => now(),
                ]);
            }
        }

        $verificationDocument->load(['user', 'verifier']);
        return response()->json(new VerificationDocumentResource($verificationDocument));
    }

    public function download(VerificationDocument $verificationDocument)
    {
        $user = auth()->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }
        // Allow document owner, admin, or auditor
        if ($verificationDocument->user_id !== $user->id && !$user->isAdmin() && !$user->isAuditor()) {
            return response()->json(['message' => 'Unauthorized access to document'], 403);
        }

        $path = ltrim($verificationDocument->file_path ?? '', '/');
        $disk = Storage::disk('public');

        // Try stored path, then common alternatives (legacy paths, FileUploadController uses 'verifications')
        $pathsToTry = array_filter([
            $path,
            $verificationDocument->file_path,
            'verification-documents/' . basename($path),
            'verifications/' . basename($path),
        ]);

        $resolvedPath = null;
        foreach ($pathsToTry as $p) {
            if ($p && $disk->exists($p)) {
                $resolvedPath = $p;
                break;
            }
        }

        if (!$resolvedPath) {
            \Log::warning('Verification document file not found', [
                'document_id' => $verificationDocument->id,
                'file_path' => $verificationDocument->file_path,
                'paths_tried' => $pathsToTry,
            ]);
            return response()->json(['message' => 'File not found on server. The document may have been moved or deleted.'], 404);
        }

        return $disk->download($resolvedPath, $verificationDocument->file_name ?? basename($resolvedPath));
    }

    /**
     * Map user role to the corresponding timestamp column for document upload.
     */
    private function getRoleTimestampForUpload(string $role): ?string
    {
        return match ($role) {
            'requestor', 'recipient' => 'requester_submitted_at',
            'supplier' => 'supplier_uploaded_at',
            'field_agent' => 'field_agent_verified_at',
            'admin' => 'admin_reviewed_at',
            default => null,
        };
    }
}
