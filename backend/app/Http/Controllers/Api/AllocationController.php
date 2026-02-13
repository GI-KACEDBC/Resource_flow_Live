<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\AllocationResource;
use App\Models\Allocation;
use App\Models\AuditTrail;
use App\Models\VulnerabilityScore;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AllocationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Allocation::query()->forUser($request->user())
            ->with(['request.user', 'donation', 'allocator', 'logistics']);

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('request_id')) {
            $query->where('request_id', $request->request_id);
        }

        $allocations = $query->orderBy('created_at', 'desc')->get();
        return response()->json(AllocationResource::collection($allocations));
    }

    public function show(Allocation $allocation): JsonResponse
    {
        $this->authorize('view', $allocation);
        $allocation->load(['request.user', 'donation', 'allocator', 'logistics']);
        return response()->json(new AllocationResource($allocation));
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', Allocation::class);
        $validated = $request->validate([
            'request_id' => 'required|exists:requests,id',
            'donation_id' => 'required|exists:donations,id',
            'quantity_allocated' => 'required|numeric|min:0.01',
            'notes' => 'nullable|string',
            'expected_delivery_date' => 'nullable|date',
        ]);

        return DB::transaction(function () use ($validated, $request) {
            // Fix #9: Verify recipient is verified
            $requestModel = \App\Models\Request::lockForUpdate()->findOrFail($validated['request_id']);
            $recipient = $requestModel->user;

            if (!$recipient || !$recipient->is_verified) {
                return response()->json([
                    'message' => 'Cannot allocate to unverified recipient. Please verify the recipient first.'
                ], 422);
            }

            // Fix #8: Validate quantity doesn't exceed available
            $donation = \App\Models\Donation::lockForUpdate()->findOrFail($validated['donation_id']);

            // Calculate total already allocated
            $totalAllocated = Allocation::where('donation_id', $validated['donation_id'])
                ->where('id', '!=', $request->input('existing_allocation_id', 0)) // Exclude current if updating
                ->sum('quantity_allocated');

            $available = $donation->quantity - $totalAllocated;

            if ($validated['quantity_allocated'] > $available) {
                return response()->json([
                    'message' => "Cannot allocate {$validated['quantity_allocated']} {$donation->unit}. Only {$available} {$donation->unit} available."
                ], 422);
            }

            // Check if donation is available
            if (!$donation->isAvailable()) {
                return response()->json([
                    'message' => "Cannot allocate donation. Status: {$donation->status}" . ($donation->isExpired() ? ' (Expired)' : '')
                ], 422);
            }

            $validated['allocated_by'] = $request->user()->id;
            $validated['allocated_date'] = now();
            $validated['status'] = 'Pending';

            // Fix #7: Create allocation in transaction
            $allocation = Allocation::create($validated);

            // Update donation status to 'Allocated' and decrement remaining quantity
            $donation->update(['status' => 'Allocated']);
            
            // Update remaining_quantity if field exists
            if ($donation->getConnection()->getSchemaBuilder()->hasColumn('donations', 'remaining_quantity')) {
                $donation->decrement('remaining_quantity', $validated['quantity_allocated']);
            }

            // Log audit trail
            AuditTrail::log(
                'created',
                Allocation::class,
                $allocation->id,
                $request->user()->id,
                [],
                $allocation->toArray(),
                "Allocation created for request {$validated['request_id']}"
            );

            $allocation->load(['request.user', 'donation', 'allocator']);
            return response()->json(new AllocationResource($allocation), 201);
        });
    }

    public function update(Request $request, Allocation $allocation): JsonResponse
    {
        $this->authorize('update', $allocation);
        $oldValues = $allocation->toArray();
        
        $validated = $request->validate([
            'quantity_allocated' => 'sometimes|numeric|min:0.01',
            'status' => 'sometimes|in:Pending,Approved,In Transit,Delivered,Cancelled',
            'notes' => 'nullable|string',
            'expected_delivery_date' => 'nullable|date',
            'actual_delivery_date' => 'nullable|date',
        ]);

        $allocation->update($validated);

        // Log audit trail
        AuditTrail::log(
            'updated',
            Allocation::class,
            $allocation->id,
            $request->user()->id,
            $oldValues,
            $allocation->toArray(),
            "Allocation {$allocation->id} updated"
        );

        $allocation->load(['request.user', 'donation', 'allocator']);
        return response()->json(new AllocationResource($allocation));
    }

    public function getPrioritizedRequests(): JsonResponse
    {
        // Approved requests eligible for allocation (exclude pending, completed, claimed)
        $requests = \App\Models\Request::with(['user.vulnerabilityScore'])
            ->where('status', 'approved')
            ->get()
            ->map(function ($request) {
                $vulnerabilityScore = $request->user?->vulnerabilityScore;
                return [
                    'request' => $request,
                    'vulnerability_score' => $vulnerabilityScore ? (float) $vulnerabilityScore->overall_score : 0,
                    'priority_level' => $vulnerabilityScore?->priority_level ?? $request->urgency_level ?? 'Low',
                ];
            })
            ->sortByDesc(function ($item) {
                return ($item['vulnerability_score'] * 100) + ($item['request']->urgency_score ?? 0);
            })
            ->values();

        return response()->json($requests);
    }
}
