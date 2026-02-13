<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Contribution;
use App\Models\Request;
use App\Models\AuditTrail;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request as HttpRequest;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ContributionController extends Controller
{
    /**
     * Get all contributions for a request
     */
    public function index(HttpRequest $httpRequest): JsonResponse
    {
        $requestId = $httpRequest->query('request_id');
        
        $query = Contribution::with(['supplier', 'request']);
        
        if ($requestId) {
            $query->where('request_id', $requestId);
        }
        
        // Suppliers see only their own contributions
        if ($httpRequest->user()->isSupplier()) {
            $query->where('supplier_id', $httpRequest->user()->id);
        }
        
        $contributions = $query->orderBy('created_at', 'desc')->get();
        
        return response()->json($contributions);
    }

    /**
     * Get a single contribution
     */
    public function show(Contribution $contribution): JsonResponse
    {
        $contribution->load(['supplier', 'request']);
        return response()->json($contribution);
    }

    /**
     * Create a new contribution (Supplier partners/funds a request)
     * 
     * This method:
     * 1. Validates the percentage doesn't exceed 100% total
     * 2. Uses database transaction to prevent race conditions
     * 3. Updates request funding_status when appropriate
     * 4. Sets request status to 'claimed' when 100% is reached
     */
    public function store(HttpRequest $httpRequest): JsonResponse
    {
        $user = $httpRequest->user();
        
        // Only suppliers can contribute
        if (!$user->isSupplier()) {
            return response()->json([
                'message' => 'Only suppliers can contribute to requests.'
            ], 403);
        }

        $validated = $httpRequest->validate([
            'request_id' => 'required|exists:requests,id',
            'percentage' => 'required|integer|min:1|max:100',
            'amount_value' => 'nullable|numeric|min:0',
        ]);

        return DB::transaction(function () use ($validated, $user) {
            // Lock the request row to prevent concurrent modifications
            $request = Request::lockForUpdate()->findOrFail($validated['request_id']);
            
            // Validate request is in correct status
            if ($request->status !== 'approved') {
                return response()->json([
                    'message' => "Cannot contribute to request with status: {$request->status}. Request must be 'approved'."
                ], 422);
            }

            // Check if request is already fully funded
            if ($request->funding_status === 'fully_funded') {
                return response()->json([
                    'message' => 'This request is already fully funded.'
                ], 422);
            }

            // Check if supplier already contributed to this request
            $existingContribution = Contribution::where('request_id', $validated['request_id'])
                ->where('supplier_id', $user->id)
                ->first();

            if ($existingContribution) {
                return response()->json([
                    'message' => 'You have already contributed to this request. Use update to modify your contribution.'
                ], 422);
            }

            // Calculate total committed percentage
            $totalCommitted = Contribution::where('request_id', $validated['request_id'])
                ->where('status', 'committed')
                ->sum('percentage');

            // Calculate remaining percentage
            $remainingPercentage = 100 - $totalCommitted;

            // Validate the new contribution doesn't exceed remaining percentage
            if ($validated['percentage'] > $remainingPercentage) {
                return response()->json([
                    'message' => "Cannot contribute {$validated['percentage']}%. Only {$remainingPercentage}% remaining. Please adjust your contribution percentage."
                ], 422);
            }

            // Create the contribution
            $contribution = Contribution::create([
                'request_id' => $validated['request_id'],
                'supplier_id' => $user->id,
                'percentage' => $validated['percentage'],
                'amount_value' => $validated['amount_value'] ?? null,
                'status' => 'committed', // Auto-commit when created
            ]);

            // Calculate new total
            $newTotal = $totalCommitted + $validated['percentage'];

            // Update request funding status
            if ($newTotal >= 100) {
                $request->update([
                    'funding_status' => 'fully_funded',
                    'status' => 'claimed',
                    // Note: We don't set assigned_supplier_id here since multiple suppliers can contribute
                ]);
            } elseif ($newTotal > 0) {
                $request->update([
                    'funding_status' => 'partially_funded',
                ]);
            }

            // Log audit trail
            AuditTrail::log(
                'created',
                Contribution::class,
                $contribution->id,
                $user->id,
                [],
                $contribution->toArray(),
                "Supplier {$user->name} contributed {$validated['percentage']}% to request {$validated['request_id']}"
            );

            $contribution->load(['supplier', 'request']);
            return response()->json($contribution, 201);
        });
    }

    /**
     * Update a contribution (e.g., change percentage)
     */
    public function update(HttpRequest $httpRequest, Contribution $contribution): JsonResponse
    {
        $user = $httpRequest->user();
        
        // Only the supplier who made the contribution or admin can update
        if ($contribution->supplier_id !== $user->id && !$user->isAdmin()) {
            return response()->json([
                'message' => 'Unauthorized. You can only update your own contributions.'
            ], 403);
        }

        $validated = $httpRequest->validate([
            'percentage' => 'sometimes|integer|min:1|max:100',
            'amount_value' => 'nullable|numeric|min:0',
        ]);

        return DB::transaction(function () use ($contribution, $validated, $user) {
            $oldValues = $contribution->toArray();
            $request = Request::lockForUpdate()->findOrFail($contribution->request_id);

            // If percentage is being updated, validate it doesn't exceed 100%
            if (isset($validated['percentage'])) {
                // Calculate total committed percentage excluding this contribution
                $totalCommitted = Contribution::where('request_id', $contribution->request_id)
                    ->where('id', '!=', $contribution->id)
                    ->where('status', 'committed')
                    ->sum('percentage');

                $remainingPercentage = 100 - $totalCommitted;

                if ($validated['percentage'] > $remainingPercentage) {
                    return response()->json([
                        'message' => "Cannot update to {$validated['percentage']}%. Only {$remainingPercentage}% remaining."
                    ], 422);
                }
            }

            // Update contribution
            $contribution->update($validated);

            // Recalculate funding status
            $totalCommitted = Contribution::where('request_id', $contribution->request_id)
                ->where('status', 'committed')
                ->sum('percentage');

            if ($totalCommitted >= 100) {
                $request->update([
                    'funding_status' => 'fully_funded',
                    'status' => 'claimed',
                ]);
            } elseif ($totalCommitted > 0) {
                $request->update([
                    'funding_status' => 'partially_funded',
                ]);
            } else {
                $request->update([
                    'funding_status' => 'unfunded',
                ]);
            }

            // Log audit trail
            AuditTrail::log(
                'updated',
                Contribution::class,
                $contribution->id,
                $user->id,
                $oldValues,
                $contribution->toArray(),
                "Contribution {$contribution->id} updated"
            );

            $contribution->load(['supplier', 'request']);
            return response()->json($contribution);
        });
    }

    /**
     * Delete a contribution (Supplier recedes from request)
     * This releases the percentage back to the available pool
     */
    public function destroy(HttpRequest $httpRequest, Contribution $contribution): JsonResponse
    {
        $user = $httpRequest->user();
        
        // Only the supplier who made the contribution or admin can delete
        if ($contribution->supplier_id !== $user->id && !$user->isAdmin()) {
            return response()->json([
                'message' => 'Unauthorized. You can only delete your own contributions.'
            ], 403);
        }

        return DB::transaction(function () use ($contribution, $user) {
            $request = Request::lockForUpdate()->findOrFail($contribution->request_id);
            
            // Log before deletion
            AuditTrail::log(
                'deleted',
                Contribution::class,
                $contribution->id,
                $user->id,
                $contribution->toArray(),
                [],
                "Supplier {$user->name} receded from request {$contribution->request_id} (released {$contribution->percentage}%)"
            );

            // Delete the contribution
            $contribution->delete();

            // Recalculate funding status
            $totalCommitted = Contribution::where('request_id', $request->id)
                ->where('status', 'committed')
                ->sum('percentage');

            if ($totalCommitted >= 100) {
                $request->update([
                    'funding_status' => 'fully_funded',
                    'status' => 'claimed',
                ]);
            } elseif ($totalCommitted > 0) {
                $request->update([
                    'funding_status' => 'partially_funded',
                ]);
            } else {
                $request->update([
                    'funding_status' => 'unfunded',
                    'status' => 'approved', // Reset to approved if no contributions
                ]);
            }

            return response()->json([
                'message' => 'Contribution deleted successfully. Percentage released back to available pool.'
            ]);
        });
    }

    /**
     * Get contribution statistics for a request
     */
    public function getRequestStats(HttpRequest $httpRequest, $requestId): JsonResponse
    {
        $request = Request::findOrFail($requestId);
        
        $contributions = Contribution::where('request_id', $requestId)
            ->where('status', 'committed')
            ->with('supplier')
            ->get();

        $totalPercentage = $contributions->sum('percentage');
        $remainingPercentage = 100 - $totalPercentage;
        $contributionCount = $contributions->count();

        return response()->json([
            'request_id' => $requestId,
            'total_percentage' => $totalPercentage,
            'remaining_percentage' => $remainingPercentage,
            'contribution_count' => $contributionCount,
            'funding_status' => $request->funding_status,
            'contributions' => $contributions,
        ]);
    }
}
