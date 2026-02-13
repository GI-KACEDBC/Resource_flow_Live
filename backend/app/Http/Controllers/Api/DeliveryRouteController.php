<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\DeliveryRouteResource;
use App\Models\DeliveryRoute;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DeliveryRouteController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', DeliveryRoute::class);

        $query = DeliveryRoute::query()->forUser($request->user())
            ->with(['warehouse', 'driver', 'logistics']);

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('warehouse_id')) {
            $query->where('warehouse_id', $request->warehouse_id);
        }

        $routes = $query->orderBy('scheduled_date', 'asc')->get();
        return response()->json(DeliveryRouteResource::collection($routes));
    }

    public function show(DeliveryRoute $deliveryRoute): JsonResponse
    {
        $this->authorize('view', $deliveryRoute);
        $deliveryRoute->load(['warehouse', 'driver', 'logistics']);
        return response()->json(new DeliveryRouteResource($deliveryRoute));
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', DeliveryRoute::class);
        $validated = $request->validate([
            'route_name' => 'required|string|max:255',
            'warehouse_id' => 'required|exists:warehouses,id',
            'allocation_id' => 'required|exists:allocations,id', // Fix #11: Make required
            'destination_region' => 'required|string|max:255',
            'destination_city' => 'required|string|max:255',
            'destination_address' => 'required|string',
            'distance_km' => 'nullable|numeric|min:0',
            'estimated_duration_minutes' => 'nullable|integer|min:0',
            'status' => 'nullable|in:Scheduled,In Transit,Delivered,Cancelled',
            'scheduled_date' => 'required|date',
            'driver_id' => 'nullable|exists:users,id',
            'vehicle_id' => 'nullable|string|max:255',
            'route_notes' => 'nullable|string',
        ]);

        return DB::transaction(function () use ($validated) {
            // Fix #13: Validate allocation status
            $allocation = \App\Models\Allocation::lockForUpdate()->findOrFail($validated['allocation_id']);

            if (!in_array($allocation->status, ['Pending', 'Approved'])) {
                return response()->json([
                    'message' => "Cannot create delivery route for allocation with status: {$allocation->status}. Allocation must be 'Pending' or 'Approved'."
                ], 422);
            }

            // Fix #12: Prevent duplicate routes for same allocation
            $existingRoute = DeliveryRoute::where('allocation_id', $validated['allocation_id'])
                ->whereIn('status', ['Scheduled', 'In Transit'])
                ->first();

            if ($existingRoute) {
                return response()->json([
                    'message' => 'A delivery route already exists for this allocation. Please use the existing route or cancel it first.'
                ], 422);
            }

            // Auto-approve allocation when route is created (Fix #16)
            if ($allocation->status === 'Pending') {
                $allocation->update(['status' => 'Approved']);
            }

            $deliveryRoute = DeliveryRoute::create($validated);
            $deliveryRoute->load(['warehouse', 'driver', 'allocation']);
            return response()->json(new DeliveryRouteResource($deliveryRoute), 201);
        });
    }

    public function update(Request $request, DeliveryRoute $deliveryRoute): JsonResponse
    {
        $this->authorize('update', $deliveryRoute);
        $validated = $request->validate([
            'route_name' => 'sometimes|string|max:255',
            'warehouse_id' => 'sometimes|exists:warehouses,id',
            'destination_region' => 'sometimes|string|max:255',
            'destination_city' => 'sometimes|string|max:255',
            'destination_address' => 'sometimes|string',
            'distance_km' => 'nullable|numeric|min:0',
            'estimated_duration_minutes' => 'nullable|integer|min:0',
            'status' => 'sometimes|in:Scheduled,In Transit,Delivered,Cancelled',
            'scheduled_date' => 'sometimes|date',
            'actual_departure_date' => 'nullable|date',
            'actual_arrival_date' => 'nullable|date',
            'driver_id' => 'nullable|exists:users,id',
            'vehicle_id' => 'nullable|string|max:255',
            'route_notes' => 'nullable|string',
        ]);

        $deliveryRoute->update($validated);
        $deliveryRoute->load(['warehouse', 'driver']);
        return response()->json(new DeliveryRouteResource($deliveryRoute));
    }
}
