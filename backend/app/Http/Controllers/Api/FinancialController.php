<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Financial;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FinancialController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Financial::class);

        $query = Financial::with(['user', 'donation', 'allocation']);

        if ($request->user()->canListAllFinancialRecords()) {
            if ($request->has('user_id')) {
                $query->where('user_id', $request->user_id);
            }
        } else {
            $query->where('user_id', $request->user()->id);
        }

        if ($request->has('transaction_type')) {
            $query->where('transaction_type', $request->transaction_type);
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        $financials = $query->orderBy('transaction_date', 'desc')->get();

        return response()->json($financials);
    }

    public function show(Request $request, Financial $financial): JsonResponse
    {
        $this->authorize('view', $financial);

        $financial->load(['user', 'donation', 'allocation']);

        return response()->json($financial);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', Financial::class);

        $validated = $request->validate([
            'transaction_type' => 'required|in:Donation,Allocation,Expense,Refund,Project Funding,General Support',
            'user_id' => 'nullable|exists:users,id',
            'donation_id' => 'nullable|exists:donations,id',
            'allocation_id' => 'nullable|exists:allocations,id',
            'amount' => 'required|numeric|min:0',
            'currency' => 'nullable|string|max:3',
            'payment_reference' => 'nullable|string|max:255',
            'payment_method' => 'nullable|in:card,mobile_money,bank_transfer,cash,paystack',
            'status' => 'nullable|in:Pending,Completed,Failed,Refunded',
            'description' => 'nullable|string',
            'transaction_date' => 'required|date',
        ]);

        // Prevent IDOR: only Super Admin may attribute a manual ledger row to another user.
        if (! $request->user()->isSuperAdmin()) {
            $validated['user_id'] = $request->user()->id;
        }

        $financial = Financial::create($validated);
        $financial->load(['user', 'donation', 'allocation']);

        return response()->json($financial, 201);
    }

    public function update(Request $request, Financial $financial): JsonResponse
    {
        $this->authorize('update', $financial);

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

    public function destroy(Request $request, Financial $financial): JsonResponse
    {
        $this->authorize('delete', $financial);
        $financial->delete();

        return response()->json(['message' => 'Financial record deleted.']);
    }

    /**
     * Aggregated totals and optional time-series for dashboards.
     * Query: period=day|week|month|year (rolling window into the past from today).
     */
    public function getStatistics(Request $request): JsonResponse
    {
        $this->authorize('viewStatistics', Financial::class);

        $period = $request->query('period', 'month');
        if (! in_array($period, ['day', 'week', 'month', 'year'], true)) {
            $period = 'month';
        }

        [$start, $end] = $this->resolvePeriodWindow($period);

        $defaults = [
            'total_donations' => 0.0,
            'total_allocations' => 0.0,
            'total_expenses' => 0.0,
            'total_value' => 0.0,
            'period' => $period,
            'range' => [
                'start' => $start->toIso8601String(),
                'end' => $end->toIso8601String(),
            ],
            'series' => [],
        ];

        try {
            $base = Financial::query()
                ->where('status', 'Completed')
                ->whereBetween('transaction_date', [$start->toDateString(), $end->toDateString()]);

            // Include project / general support inflows (e.g. solar earmarks) — same as "cash received" KPIs.
            $totalDonations = (float) (clone $base)->whereIn('transaction_type', [
                'Donation',
                'Project Funding',
                'General Support',
            ])->sum('amount');
            $totalAllocations = (float) (clone $base)->where('transaction_type', 'Allocation')->sum('amount');
            $totalExpenses = (float) (clone $base)->where('transaction_type', 'Expense')->sum('amount');
            $totalValue = (float) (clone $base)->sum('amount');

            $series = $this->buildSeriesForPeriod($period, $start, $end);

            return response()->json([
                'total_donations' => $totalDonations,
                'total_allocations' => $totalAllocations,
                'total_expenses' => $totalExpenses,
                'total_value' => $totalValue,
                'period' => $period,
                'range' => [
                    'start' => $start->toIso8601String(),
                    'end' => $end->toIso8601String(),
                ],
                'series' => $series,
            ]);
        } catch (\Throwable $e) {
            \Log::error('Error calculating financial statistics', [
                'message' => $e->getMessage(),
                'user_id' => $request->user()?->id,
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json($defaults);
        }
    }

    /**
     * @return array{0: Carbon, 1: Carbon}
     */
    private function resolvePeriodWindow(string $period): array
    {
        $end = now()->endOfDay();

        return match ($period) {
            'day' => [now()->copy()->startOfDay(), $end],
            'week' => [now()->copy()->subDays(6)->startOfDay(), $end],
            'month' => [now()->copy()->subDays(29)->startOfDay(), $end],
            'year' => [now()->copy()->subDays(364)->startOfDay(), $end],
            default => [now()->copy()->subDays(29)->startOfDay(), $end],
        };
    }

    /**
     * Bucket completed transactions for charts.
     *
     * @return array<int, array{label: string, Donation: float, Allocation: float, Expense: float}>
     */
    private function buildSeriesForPeriod(string $period, Carbon $start, Carbon $end): array
    {
        $rows = Financial::query()
            ->where('status', 'Completed')
            ->whereBetween('transaction_date', [$start->toDateString(), $end->toDateString()])
            ->orderBy('transaction_date')
            ->get(['transaction_date', 'transaction_type', 'amount']);

        $bucketKey = function (Carbon $d) use ($period): string {
            return match ($period) {
                'day', 'week', 'month' => $d->format('Y-m-d'),
                'year' => $d->format('Y-m'),
                default => $d->format('Y-m-d'),
            };
        };

        $labelFmt = function (string $key) use ($period): string {
            if ($period === 'year') {
                return Carbon::createFromFormat('Y-m', $key)->format('M Y');
            }

            try {
                return Carbon::parse($key)->format('d M');
            } catch (\Throwable) {
                return $key;
            }
        };

        /** @var array<string, array{Donation: float, Allocation: float, Expense: float}> $buckets */
        $buckets = [];

        foreach ($rows as $row) {
            $d = Carbon::parse($row->transaction_date);
            $key = $bucketKey($d);
            if (! isset($buckets[$key])) {
                $buckets[$key] = ['Donation' => 0.0, 'Allocation' => 0.0, 'Expense' => 0.0];
            }
            $type = $row->transaction_type;
            if ($type === 'Project Funding' || $type === 'General Support') {
                $type = 'Donation';
            }
            if ($type === 'Donation' || $type === 'Allocation' || $type === 'Expense') {
                $buckets[$key][$type] += (float) $row->amount;
            }
        }

        ksort($buckets);

        $out = [];
        foreach ($buckets as $key => $vals) {
            $out[] = [
                'label' => $labelFmt($key),
                'date_key' => $key,
                'Donation' => $vals['Donation'],
                'Allocation' => $vals['Allocation'],
                'Expense' => $vals['Expense'],
            ];
        }

        return $out;
    }
}
