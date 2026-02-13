<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\LogisticResource;
use App\Models\Logistic;
use App\Services\DeliveryCompletionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LogisticController extends Controller
{
    protected $completionService;

    public function __construct(DeliveryCompletionService $completionService)
    {
        $this->completionService = $completionService;
    }
    public function index(Request $request): JsonResponse
    {
        $query = Logistic::query()->forUser($request->user())
            ->with(['allocation.request', 'deliveryRoute']);

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('tracking_number')) {
            $query->where('tracking_number', $request->tracking_number);
        }

        $logistics = $query->orderBy('created_at', 'desc')->get();
        return response()->json(LogisticResource::collection($logistics));
    }

    public function show(Logistic $logistic): JsonResponse
    {
        $this->authorize('view', $logistic);
        $logistic->load(['allocation.request', 'deliveryRoute']);
        return response()->json(new LogisticResource($logistic));
    }

    public function track($trackingNumber): JsonResponse
    {
        $logistic = Logistic::where('tracking_number', $trackingNumber)
            ->with(['allocation.request', 'deliveryRoute'])
            ->first();

        if (!$logistic) {
            return response()->json(['message' => 'Tracking number not found'], 404);
        }

        return response()->json(new LogisticResource($logistic));
    }

    public function updateLocation(Request $request, Logistic $logistic): JsonResponse
    {
        $validated = $request->validate([
            'latitude' => 'required|numeric',
            'longitude' => 'required|numeric',
            'timestamp' => 'required|date',
        ]);

        $locationUpdate = [
            'latitude' => $validated['latitude'],
            'longitude' => $validated['longitude'],
            'timestamp' => $validated['timestamp'],
        ];

        $updates = $logistic->location_updates ?? [];
        $updates[] = $locationUpdate;

        $logistic->update([
            'location_updates' => $updates,
            'last_location_update' => now(),
        ]);

        return response()->json(new LogisticResource($logistic));
    }

    /**
     * Complete delivery - cascades status updates to all related records. Requires Distributor role.
     */
    public function completeDelivery(Request $request, Logistic $logistic): JsonResponse
    {
        $deliveryRoute = $logistic->deliveryRoute;
        $this->authorize('complete', $deliveryRoute);
        
        if (!$deliveryRoute) {
            return response()->json([
                'message' => 'Delivery route not found for this logistic record.',
            ], 404);
        }

        $this->completionService->completeDelivery($deliveryRoute);

        $logistic->refresh();
        $logistic->load(['allocation.request', 'deliveryRoute']);
        return response()->json(new LogisticResource($logistic));
    }
}
