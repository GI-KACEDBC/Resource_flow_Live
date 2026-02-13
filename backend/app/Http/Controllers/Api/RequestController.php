<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Request;
use App\Models\Contribution;
use App\Models\AuditTrail;
use App\Models\User;
use App\Services\UrgencyCalculationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request as HttpRequest;

class RequestController extends Controller
{
    protected UrgencyCalculationService $urgencyService;

    public function __construct(UrgencyCalculationService $urgencyService)
    {
        $this->urgencyService = $urgencyService;
    }

    /**
     * Get all requests
     * For heat map: Only returns requests where status = 'approved' and assigned_supplier_id is NULL
     */
    public function index(HttpRequest $httpRequest): JsonResponse
    {
        $user = $httpRequest->user();
        
        $query = Request::query()->notExpired()->with(['user', 'assignedSupplier']);

        // Filter by role - Admin Review Gate: Suppliers/Donors only see approved requests
        if ($user->isRequestor() || $user->role === 'recipient') {
            // Requestors/Recipients see only their own requests
            $query->where('user_id', $user->id);
        } elseif ($user->isDonor() || $user->isSupplier()) {
            // Suppliers/Donors see ONLY approved requests (mandatory Admin Review gate)
            $query->where('status', 'approved')
                  ->whereIn('funding_status', ['unfunded', 'partially_funded']);
        }
        // Admins see all requests (no filter)
        
        $requests = $query->orderBy('urgency_score', 'desc')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($requests);
    }

    /**
     * Get a single request
     */
    public function show(HttpRequest $httpRequest, $id): JsonResponse
    {
        $user = $httpRequest->user();
        $request = Request::with('user')->findOrFail($id);
        
        // Requestors/Recipients can only see their own requests (unless admin)
        if (($user->isRequestor() || $user->role === 'recipient') && $request->user_id !== $user->id && !$user->isAdmin()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        
        return response()->json($request);
    }

    /**
     * Create a new request
     */
    public function store(HttpRequest $httpRequest): JsonResponse
    {
        $user = $httpRequest->user();
        
        // Only requestors, recipients, and admins can create requests
        if (!$user->isRequestor() && $user->role !== 'recipient' && !$user->isAdmin()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $httpRequest->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'aid_type' => 'required|in:Education,Health,Infrastructure,Other',
            'custom_aid_type' => 'required_if:aid_type,Other|nullable|string|max:255',
            'supporting_documents' => 'nullable|array',
            'supporting_documents.*' => 'nullable|string',
            'need_type' => 'required|string',
            'time_sensitivity' => 'required|string',
            'recipient_type' => 'required|string',
            'region' => 'nullable|string|max:100',
            'quantity_required' => 'nullable|numeric|min:0',
            'unit' => 'nullable|string|max:50',
            'availability_gap' => 'required|integer|min:0|max:100',
            'admin_override' => 'nullable|integer|min:-3|max:3',
        ]);

        // Calculate urgency
        $urgencyData = $this->urgencyService->calculateWithBreakdown([
            'need_type' => $validated['need_type'],
            'time_sensitivity' => $validated['time_sensitivity'],
            'recipient_type' => $validated['recipient_type'],
            'availability_gap' => $validated['availability_gap'],
            'admin_override' => $validated['admin_override'] ?? 0,
        ]);

        $responseTime = $this->urgencyService->getResponseTime($urgencyData['level']);

        $expiresAt = now()->addDays(30);

        // Create request
        $request = Request::create([
            'user_id' => $user->id,
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'aid_type' => $validated['aid_type'],
            'custom_aid_type' => $validated['custom_aid_type'] ?? null,
            'status' => 'pending',
            'funding_status' => 'unfunded',
            'supporting_documents' => $validated['supporting_documents'] ?? [],
            'need_type' => $validated['need_type'],
            'time_sensitivity' => $validated['time_sensitivity'],
            'recipient_type' => $validated['recipient_type'],
            'region' => $validated['region'] ?? null,
            'quantity_required' => $validated['quantity_required'] ?? null,
            'unit' => $validated['unit'] ?? null,
            'availability_gap' => $validated['availability_gap'],
            'admin_override' => $validated['admin_override'] ?? 0,
            'expires_at' => $expiresAt,
            'urgency_score' => $urgencyData['score'],
            'urgency_level' => $urgencyData['level'],
            'urgency_calculation_log' => [
                'raw_scores' => $urgencyData['raw_scores'],
                'weighted_scores' => $urgencyData['weighted_scores'],
                'weights' => $urgencyData['weights'],
                'response_time' => $responseTime,
            ],
        ]);
        
        $request->load('user');

        // Auto-calculate vulnerability score for recipient
        if ($user->isRequestor()) {
            \App\Jobs\CalculateVulnerabilityScoreJob::dispatch($user->id);
        }

        return response()->json($request, 201);
    }

    /**
     * Update a request
     */
    public function update(HttpRequest $httpRequest, $id): JsonResponse
    {
        $user = $httpRequest->user();
        $request = Request::findOrFail($id);
        
        // Only the creator or admin can update
        if ($request->user_id !== $user->id && !$user->isAdmin()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $httpRequest->validate([
            'title' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'need_type' => 'sometimes|string',
            'time_sensitivity' => 'sometimes|string',
            'recipient_type' => 'sometimes|string',
            'region' => 'nullable|string|max:100',
            'quantity_required' => 'nullable|numeric|min:0',
            'unit' => 'nullable|string|max:50',
            'availability_gap' => 'sometimes|integer|min:0|max:100',
            'admin_override' => 'nullable|integer|min:-3|max:3',
        ]);

        // Recalculate urgency if factors changed
        if (isset($validated['need_type']) || isset($validated['time_sensitivity']) || 
            isset($validated['recipient_type']) || isset($validated['availability_gap']) || 
            isset($validated['admin_override'])) {
            
            $urgencyData = $this->urgencyService->calculateWithBreakdown([
                'need_type' => $validated['need_type'] ?? $request->need_type,
                'time_sensitivity' => $validated['time_sensitivity'] ?? $request->time_sensitivity,
                'recipient_type' => $validated['recipient_type'] ?? $request->recipient_type,
                'availability_gap' => $validated['availability_gap'] ?? $request->availability_gap,
                'admin_override' => $validated['admin_override'] ?? $request->admin_override ?? 0,
            ]);

            $responseTime = $this->urgencyService->getResponseTime($urgencyData['level']);

            $validated['urgency_score'] = $urgencyData['score'];
            $validated['urgency_level'] = $urgencyData['level'];
            $validated['urgency_calculation_log'] = [
                'raw_scores' => $urgencyData['raw_scores'],
                'weighted_scores' => $urgencyData['weighted_scores'],
                'weights' => $urgencyData['weights'],
                'response_time' => $responseTime,
            ];
        }

        $request->update($validated);

        return response()->json($request);
    }

    /**
     * Delete a request
     */
    public function destroy(HttpRequest $httpRequest, $id): JsonResponse
    {
        $user = $httpRequest->user();
        $request = Request::findOrFail($id);
        
        // Only the creator or admin can delete
        if ($request->user_id !== $user->id && !$user->isAdmin()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        
        $request->delete();

        return response()->json(['message' => 'Request deleted successfully']);
    }

    /**
     * Get available requests for suppliers (approved and unclaimed)
     */
    public function getAvailableRequests(HttpRequest $httpRequest): JsonResponse
    {
        try {
            $requests = Request::query()->notExpired()
                ->with(['user', 'assignedSupplier', 'contributions.supplier'])
                ->where('status', 'approved')
                ->where(function ($query) {
                    $query->whereNull('assigned_supplier_id')
                          ->orWhereIn('funding_status', ['unfunded', 'partially_funded']);
                })
                ->orderBy('urgency_score', 'desc')
                ->orderBy('created_at', 'desc')
                ->get();

            // Add calculated fields for frontend
            $requests->each(function ($request) {
                // Calculate total funded percentage from committed contributions
                // Use the model directly to avoid accessor recursion issues
                $committedContributions = Contribution::where('request_id', $request->id)
                    ->where('status', 'committed')
                    ->sum('percentage');
                
                $totalPercentage = (int) \App\Helpers\FormatHelper::capPercent($committedContributions ?? 0);
                $request->setAttribute('total_funded_percentage', $totalPercentage);
                $request->setAttribute('remaining_percentage', max(0, 100 - $totalPercentage));
            });

            return response()->json($requests);
        } catch (\Exception $e) {
            \Log::error('Error in getAvailableRequests: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'message' => 'Error fetching available requests',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    /**
     * Admin2 approval: Change status from pending to approved
     */
    public function approve(HttpRequest $httpRequest, $id): JsonResponse
    {
        $user = $httpRequest->user();
        
        // Only admins can approve
        if (!$user->isAdmin()) {
            return response()->json(['message' => 'Unauthorized. Only admins can approve requests.'], 403);
        }

        $request = Request::findOrFail($id);

        if ($request->status !== 'pending') {
            return response()->json([
                'message' => "Request cannot be approved. Current status: {$request->status}",
            ], 422);
        }

        $request->update(['status' => 'approved']);

        // Log audit trail
        \App\Models\AuditTrail::log(
            'approved',
            Request::class,
            $request->id,
            $user->id,
            ['status' => 'pending'],
            ['status' => 'approved'],
            "Request {$request->id} approved by admin"
        );

        $request->load(['user', 'assignedSupplier']);
        return response()->json($request);
    }

    /**
     * Admin Audit: Verify attached documents and transition status to approved.
     * Mandatory gate before Supplier visibility. Restricted to isAdmin() or isAuditor().
     */
    public function audit(HttpRequest $httpRequest, $id): JsonResponse
    {
        $user = $httpRequest->user();
        if (!$user->isAdmin() && !$user->isAuditor()) {
            return response()->json(['message' => 'Unauthorized. Only admins or auditors can audit requests.'], 403);
        }

        $aidRequest = Request::with(['user', 'user.verificationDocuments'])->findOrFail($id);

        if ($aidRequest->status !== 'pending') {
            return response()->json([
                'message' => "Request cannot be audited. Current status: {$aidRequest->status}",
            ], 422);
        }

        $recipient = $aidRequest->user;
        $documents = $recipient ? $recipient->verificationDocuments : collect();

        // Optional: enforce minimum documents (e.g. Ghana Card) - uncomment if required
        // $ghanaCard = $documents->firstWhere('document_type', 'Ghana Card');
        // if (!$ghanaCard || $ghanaCard->verification_status !== 'Verified') {
        //     return response()->json(['message' => 'Recipient must have verified Ghana Card before approval.'], 422);
        // }

        $oldValues = ['status' => $aidRequest->status];
        $aidRequest->update([
            'status' => 'approved',
            'last_audited_at' => now(),
            'audited_by' => $user->id,
        ]);

        AuditTrail::log(
            'audited',
            Request::class,
            $aidRequest->id,
            $user->id,
            $oldValues,
            ['status' => 'approved', 'last_audited_at' => now(), 'audited_by' => $user->id],
            "Request {$aidRequest->id} audited and approved by admin (documents verified)"
        );

        $aidRequest->load(['user', 'assignedSupplier', 'auditor']);
        return response()->json($aidRequest);
    }

    /**
     * Supplier claim: Set status to claimed and assign supplier
     */
    public function claim(HttpRequest $httpRequest, $id): JsonResponse
    {
        $supplier = $httpRequest->user();
        $aidRequest = Request::findOrFail($id);
        $recipient = $aidRequest->user;

        if (!$supplier->isSupplier()) {
            return response()->json(['message' => 'Unauthorized. Only suppliers can claim requests.'], 403);
        }

        // 1. Direct Account Check
        if ($aidRequest->user_id === $supplier->id) {
            return response()->json(['message' => 'Conflict of Interest: You cannot claim your own request.'], 403);
        }

        // 2. Personal Identity Check (Phone & Ghana Card - prevent self-dealing across accounts)
        if ($recipient && $this->identityMatches($supplier, $recipient)) {
            return response()->json(['message' => 'Unauthorized: Conflict of Interest. Identity match detected (phone or Ghana Card). You cannot claim your own request.'], 403);
        }

        // Check if request is fully funded via contributions
        if ($aidRequest->funding_status === 'fully_funded') {
            return response()->json([
                'message' => 'This request is already fully funded through contributions. Use the contribution system to partner with other suppliers.',
            ], 422);
        }

        // For backward compatibility: allow single supplier claim if no contributions exist
        if ($aidRequest->assigned_supplier_id !== null) {
            return response()->json([
                'message' => 'Request is already claimed by another supplier. Use the contribution system to partner on requests.',
            ], 422);
        }

        if ($aidRequest->status !== 'approved') {
            return response()->json([
                'message' => 'Only approved requests can be claimed.',
            ], 422);
        }

        $aidRequest->update([
            'status' => 'claimed',
            'assigned_supplier_id' => $supplier->id,
            'funding_status' => 'fully_funded',
        ]);

        \App\Models\AuditTrail::log(
            'claimed',
            Request::class,
            $aidRequest->id,
            $supplier->id,
            ['status' => 'approved', 'assigned_supplier_id' => null],
            ['status' => 'claimed', 'assigned_supplier_id' => $supplier->id],
            "Request {$aidRequest->id} claimed by supplier {$supplier->name}"
        );

        $aidRequest->load(['user', 'assignedSupplier']);
        return response()->json($aidRequest);
    }

    /**
     * Supplier recede: Set status to recede_requested
     */
    public function requestRecede(HttpRequest $httpRequest, $id): JsonResponse
    {
        $user = $httpRequest->user();
        
        // Only suppliers can request recede
        if (!$user->isSupplier()) {
            return response()->json(['message' => 'Unauthorized. Only suppliers can request recede.'], 403);
        }

        $request = Request::findOrFail($id);

        if ($request->status !== 'claimed') {
            return response()->json([
                'message' => "Request cannot be receded. Current status: {$request->status}",
            ], 422);
        }

        if ($request->assigned_supplier_id !== $user->id) {
            return response()->json([
                'message' => 'You can only recede requests that you have claimed.',
            ], 403);
        }

        $request->update(['status' => 'recede_requested']);

        // Log audit trail
        \App\Models\AuditTrail::log(
            'recede_requested',
            Request::class,
            $request->id,
            $user->id,
            ['status' => 'claimed'],
            ['status' => 'recede_requested'],
            "Supplier {$user->name} requested to recede request {$request->id}"
        );

        $request->load(['user', 'assignedSupplier']);
        return response()->json($request);
    }

    /**
     * Admin2 recede approval: Reset status to approved and clear assigned_supplier_id
     */
    public function approveRecede(HttpRequest $httpRequest, $id): JsonResponse
    {
        $user = $httpRequest->user();
        
        // Only admins can approve recede
        if (!$user->isAdmin()) {
            return response()->json(['message' => 'Unauthorized. Only admins can approve recede requests.'], 403);
        }

        $request = Request::findOrFail($id);

        if ($request->status !== 'recede_requested') {
            return response()->json([
                'message' => "Recede cannot be approved. Current status: {$request->status}",
            ], 422);
        }

        $oldSupplierId = $request->assigned_supplier_id;

        $request->update([
            'status' => 'approved',
            'assigned_supplier_id' => null,
        ]);

        // Log audit trail
        \App\Models\AuditTrail::log(
            'recede_approved',
            Request::class,
            $request->id,
            $user->id,
            ['status' => 'recede_requested', 'assigned_supplier_id' => $oldSupplierId],
            ['status' => 'approved', 'assigned_supplier_id' => null],
            "Admin approved recede for request {$request->id}, supplier unassigned"
        );

        $request->load(['user', 'assignedSupplier']);
        return response()->json($request);
    }

    /**
     * Mark request as completed
     */
    public function complete(HttpRequest $httpRequest, $id): JsonResponse
    {
        $user = $httpRequest->user();
        $request = Request::with('allocations.deliveryRoute')->findOrFail($id);

        // Only assigned supplier or admin can complete
        if ($request->assigned_supplier_id !== $user->id && !$user->isAdmin()) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        if ($request->status !== 'claimed') {
            return response()->json([
                'message' => "Request cannot be completed. Current status: {$request->status}",
            ], 422);
        }

        // Fix #6: Validate that delivery was completed before allowing request completion
        if ($request->allocations()->exists()) {
            $hasDeliveredAllocation = $request->allocations()
                ->whereHas('deliveryRoute', function ($query) {
                    $query->where('status', 'Delivered');
                })
                ->exists();

            if (!$hasDeliveredAllocation) {
                return response()->json([
                    'message' => 'Cannot complete request. Delivery must be completed first. Please ensure all allocations have been delivered.',
                ], 422);
            }
        }

        $request->update(['status' => 'completed']);

        // Log audit trail
        \App\Models\AuditTrail::log(
            'completed',
            Request::class,
            $request->id,
            $user->id,
            ['status' => 'claimed'],
            ['status' => 'completed'],
            "Request {$request->id} marked as completed"
        );

        $request->load(['user', 'assignedSupplier']);
        return response()->json($request);
    }

    /**
     * Get flagged requests for monthly review (Admin only).
     * Returns any requests over 30 days old (excluding completed/closed).
     */
    public function getFlagged(HttpRequest $httpRequest): JsonResponse
    {
        if (!$httpRequest->user()->isAdmin()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $cutoff = now()->subDays(30);
        $closedStatuses = ['completed', 'closed_no_match', 'cancelled'];

        $requests = Request::with(['user', 'assignedSupplier'])
            ->where('created_at', '<', $cutoff)
            ->whereNotIn('status', $closedStatuses)
            ->orderBy('created_at', 'asc') // Oldest first
            ->orderBy('urgency_score', 'desc')
            ->get();

        return response()->json($requests);
    }

    /**
     * Batch update status of flagged requests (Admin only).
     * Actions: closed_no_match | boosted_urgency
     */
    public function batchUpdateStatus(HttpRequest $httpRequest): JsonResponse
    {
        if (!$httpRequest->user()->isAdmin()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $httpRequest->validate([
            'request_ids' => 'required|array',
            'request_ids.*' => 'integer|exists:requests,id',
            'action' => 'required|in:closed_no_match,boosted_urgency',
        ]);

        $cutoff = now()->subDays(30);
        $requests = Request::whereIn('id', $validated['request_ids'])
            ->where('created_at', '<', $cutoff)
            ->whereNotIn('status', ['completed', 'closed_no_match'])
            ->get();

        if ($requests->isEmpty()) {
            return response()->json([
                'message' => 'No eligible requests found. Only requests over 30 days old (excluding completed/closed) can be updated.',
                'updated_count' => 0,
            ]);
        }

        $user = $httpRequest->user();

        if ($validated['action'] === 'closed_no_match') {
            foreach ($requests as $req) {
                $oldStatus = $req->status;
                $req->update([
                    'status' => 'closed_no_match',
                    'is_flagged_for_review' => false,
                    'flagged_at' => null,
                ]);
                \App\Models\AuditTrail::log(
                    'batch_closed',
                    Request::class,
                    $req->id,
                    $user->id,
                    ['status' => $oldStatus, 'is_flagged_for_review' => true],
                    ['status' => 'closed_no_match', 'is_flagged_for_review' => false],
                    "Request {$req->id} closed via batch admin review"
                );
            }
        } else {
            foreach ($requests as $req) {
                $oldOverride = $req->admin_override ?? 0;
                $urgencyData = $this->urgencyService->calculateWithBreakdown([
                    'need_type' => $req->need_type,
                    'time_sensitivity' => $req->time_sensitivity,
                    'recipient_type' => $req->recipient_type,
                    'availability_gap' => $req->availability_gap,
                    'admin_override' => 3,
                ]);
                $req->update([
                    'admin_override' => 3,
                    'urgency_score' => $urgencyData['score'],
                    'urgency_level' => $urgencyData['level'],
                    'urgency_calculation_log' => [
                        'raw_scores' => $urgencyData['raw_scores'],
                        'weighted_scores' => $urgencyData['weighted_scores'],
                        'weights' => $urgencyData['weights'],
                        'response_time' => $this->urgencyService->getResponseTime($urgencyData['level']),
                    ],
                    'is_flagged_for_review' => false,
                    'flagged_at' => null,
                ]);
                \App\Models\AuditTrail::log(
                    'batch_boosted',
                    Request::class,
                    $req->id,
                    $user->id,
                    ['admin_override' => $oldOverride, 'is_flagged_for_review' => true],
                    ['admin_override' => 3, 'is_flagged_for_review' => false],
                    "Request {$req->id} urgency boosted via batch admin review"
                );
            }
        }

        return response()->json([
            'message' => count($requests) . ' request(s) ' . ($validated['action'] === 'closed_no_match' ? 'closed' : 'boosted') . ' successfully.',
            'updated_count' => $requests->count(),
            'action' => $validated['action'],
        ]);
    }

    /**
     * Identity match check: Phone and/or Ghana Card match indicates same person (self-dealing).
     */
    private function identityMatches(User $supplier, User $recipient): bool
    {
        $phoneMatch = !empty($supplier->phone) && !empty($recipient->phone)
            && preg_replace('/\D/', '', $supplier->phone) === preg_replace('/\D/', '', $recipient->phone);
        $ghanaCardMatch = !empty($supplier->ghana_card) && !empty($recipient->ghana_card)
            && trim($supplier->ghana_card) === trim($recipient->ghana_card);
        return $phoneMatch || $ghanaCardMatch;
    }
}

