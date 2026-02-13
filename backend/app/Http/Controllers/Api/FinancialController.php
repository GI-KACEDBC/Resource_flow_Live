<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Financial;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FinancialController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Financial::with(['user', 'donation', 'allocation']);

        if ($request->has('transaction_type')) {
            $query->where('transaction_type', $request->transaction_type);
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        $financials = $query->orderBy('transaction_date', 'desc')->get();
        return response()->json($financials);
    }

    public function show(Financial $financial): JsonResponse
    {
        $financial->load(['user', 'donation', 'allocation']);
        return response()->json($financial);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'transaction_type' => 'required|in:Donation,Allocation,Expense,Refund',
            'user_id' => 'nullable|exists:users,id',
            'donation_id' => 'nullable|exists:donations,id',
            'allocation_id' => 'nullable|exists:allocations,id',
            'amount' => 'required|numeric|min:0',
            'currency' => 'nullable|string|max:3',
            'payment_reference' => 'nullable|string|max:255',
            'payment_method' => 'nullable|in:card,mobile_money,bank_transfer,cash',
            'status' => 'nullable|in:Pending,Completed,Failed,Refunded',
            'description' => 'nullable|string',
            'transaction_date' => 'required|date',
        ]);

        $financial = Financial::create($validated);
        $financial->load(['user', 'donation', 'allocation']);
        return response()->json($financial, 201);
    }

    public function update(Request $request, Financial $financial): JsonResponse
    {
        $validated = $request->validate([
            'amount' => 'sometimes|numeric|min:0',
            'status' => 'sometimes|in:Pending,Completed,Failed,Refunded',
            'description' => 'nullable|string',
            'transaction_date' => 'sometimes|date',
        ]);

        $financial->update($validated);
        $financial->load(['user', 'donation', 'allocation']);
        return response()->json($financial);
    }

    public function getStatistics(): JsonResponse
    {
        $defaults = [
            'total_donations' => 0.0,
            'total_allocations' => 0.0,
            'total_expenses' => 0.0,
            'total_value' => 0.0,
        ];

        try {
            $totalDonations = Financial::where('transaction_type', 'Donation')
                ->where('status', 'Completed')
                ->sum('amount');
            $totalAllocations = Financial::where('transaction_type', 'Allocation')
                ->where('status', 'Completed')
                ->sum('amount');
            $totalExpenses = Financial::where('transaction_type', 'Expense')
                ->where('status', 'Completed')
                ->sum('amount');
            $totalValue = Financial::where('status', 'Completed')->sum('amount');

            return response()->json([
                'total_donations' => (float) ($totalDonations ?? 0),
                'total_allocations' => (float) ($totalAllocations ?? 0),
                'total_expenses' => (float) ($totalExpenses ?? 0),
                'total_value' => (float) ($totalValue ?? 0),
            ]);
        } catch (\Throwable $e) {
            \Log::error('Error calculating financial statistics: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);

            return response()->json($defaults);
        }
    }
}
