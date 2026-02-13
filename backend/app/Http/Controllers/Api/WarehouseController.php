<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\WarehouseResource;
use App\Models\Warehouse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WarehouseController extends Controller
{
    public function index(): JsonResponse
    {
        $warehouses = Warehouse::all();
        return response()->json(WarehouseResource::collection($warehouses));
    }

    public function show(Warehouse $warehouse): JsonResponse
    {
        return response()->json(new WarehouseResource($warehouse));
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'city' => 'required|string|max:255',
            'region' => 'required|string|max:255',
            'address' => 'required|string',
            'capacity' => 'required|numeric|min:0',
            'capacity_unit' => 'nullable|string|max:50',
            'manager' => 'required|string|max:255',
            'contact_phone' => 'required|string|max:50',
            'contact_email' => 'required|email|max:255',
            'status' => 'nullable|in:Active,Full,Maintenance,Inactive',
        ]);

        $warehouse = Warehouse::create($validated);
        return response()->json(new WarehouseResource($warehouse), 201);
    }

    public function update(Request $request, Warehouse $warehouse): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'city' => 'sometimes|string|max:255',
            'region' => 'sometimes|string|max:255',
            'address' => 'sometimes|string',
            'capacity' => 'sometimes|numeric|min:0',
            'capacity_unit' => 'nullable|string|max:50',
            'manager' => 'sometimes|string|max:255',
            'contact_phone' => 'sometimes|string|max:50',
            'contact_email' => 'sometimes|email|max:255',
            'status' => 'nullable|in:Active,Full,Maintenance,Inactive',
            'current_occupancy' => 'sometimes|numeric|min:0',
        ]);

        $warehouse->update($validated);
        return response()->json(new WarehouseResource($warehouse));
    }

    public function destroy(Warehouse $warehouse): JsonResponse
    {
        $warehouse->delete();
        return response()->json(['message' => 'Warehouse deleted successfully']);
    }
}
