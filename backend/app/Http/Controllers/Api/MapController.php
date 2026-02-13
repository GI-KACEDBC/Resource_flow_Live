<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Request;
use App\Models\Allocation;
use App\Models\Contribution;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request as HttpRequest;

/**
 * Map Controller - Regional Heat Map Data
 * Serves verified, active request data for heat map visualization.
 * Enforces: verification filter, activity filter, expiry, net need calculation, self-dealing exclusion.
 */
class MapController extends Controller
{
    /**
     * Get map data for heat map visualization.
     * Only Admin, Auditor, and Field Agent can view high-granularity PII (recipient names, etc.).
     * Other roles get aggregated stats only.
     */
    public function getMapData(HttpRequest $httpRequest): JsonResponse
    {
        $user = $httpRequest->user();
        $includeHighGranularityPii = $user->isAdmin() || $user->isAuditor() || $user->isFieldAgent();

        $requests = $this->getScopedRequests();

        // Group by region and compute net need, urgency-weighted heat
        $regionMap = [];
        foreach ($requests as $request) {
            $region = $request->region ?? 'Unknown';
            if (!isset($regionMap[$region])) {
                $regionMap[$region] = [
                    'region' => $region,
                    'total_requested_quantity' => 0,
                    'total_allocated_quantity' => 0,
                    'net_need' => 0,
                    'total_requests' => 0,
                    'critical_requests' => 0,
                    'high_urgency_requests' => 0,
                    'medium_urgency_requests' => 0,
                    'low_urgency_requests' => 0,
                    'urgency_weighted_heat' => 0,
                    'urgency_score' => 0,
                    'requests' => [],
                ];
            }

            $reqQuantity = (float) ($request->quantity_required ?? 0);
            $allocated = (float) $request->allocations()->sum('quantity_allocated');
            $netNeed = max(0, $reqQuantity - $allocated);

            $regionMap[$region]['total_requested_quantity'] += $reqQuantity;
            $regionMap[$region]['total_allocated_quantity'] += $allocated;
            $regionMap[$region]['net_need'] += $netNeed;
            $regionMap[$region]['total_requests']++;

            $urgencyLevel = strtolower($request->urgency_level ?? 'low');
            if ($urgencyLevel === 'critical') {
                $regionMap[$region]['critical_requests']++;
            } elseif ($urgencyLevel === 'high') {
                $regionMap[$region]['high_urgency_requests']++;
            } elseif ($urgencyLevel === 'medium') {
                $regionMap[$region]['medium_urgency_requests']++;
            } else {
                $regionMap[$region]['low_urgency_requests']++;
            }

            $weight = match ($urgencyLevel) {
                'critical' => 2.0,
                'high' => 1.5,
                'medium' => 1.0,
                default => 0.5,
            };
            $regionMap[$region]['urgency_weighted_heat'] += $netNeed * $weight;

            $requestData = [
                'id' => $request->id,
                'title' => $request->title,
                'aid_type' => $request->aid_type,
                'urgency_level' => $request->urgency_level,
                'urgency_score' => $request->urgency_score,
                'quantity_required' => $request->quantity_required,
                'unit' => $request->unit ?? 'units',
                'quantity_allocated' => $allocated,
                'net_need' => $netNeed,
                'estimated_value' => null,
                'is_flagged_for_review' => (bool) $request->is_flagged_for_review,
                'flagged_at' => $request->flagged_at?->toIso8601String(),
            ];
            if ($includeHighGranularityPii) {
                $requestData['recipient'] = $request->user?->name ?? 'Unknown';
                $requestData['recipient_organization'] = $request->user?->organization ?? null;
            }
            $regionMap[$region]['requests'][] = $requestData;
        }

        $allRegions = [
            'Greater Accra', 'Ashanti', 'Central', 'Eastern', 'Western',
            'Northern', 'Upper East', 'Upper West', 'Volta', 'Bono',
            'Bono East', 'Ahafo', 'Savannah', 'North East', 'Oti', 'Western North',
        ];

        $regions = [];
        foreach ($allRegions as $r) {
            $data = $regionMap[$r] ?? [
                'region' => $r,
                'total_requested_quantity' => 0,
                'total_allocated_quantity' => 0,
                'net_need' => 0,
                'total_requests' => 0,
                'critical_requests' => 0,
                'high_urgency_requests' => 0,
                'medium_urgency_requests' => 0,
                'low_urgency_requests' => 0,
                'urgency_weighted_heat' => 0,
                'urgency_score' => 0,
                'requests' => [],
            ];
            $totalReq = $data['total_requests'];
            $data['urgency_score'] = $totalReq > 0
                ? (int) round(
                    ($data['critical_requests'] * 100 + $data['high_urgency_requests'] * 70 +
                     $data['medium_urgency_requests'] * 40 + $data['low_urgency_requests'] * 10)
                    / $totalReq
                )
                : 0;
            $data['flagged_requests'] = collect($data['requests'] ?? [])->where('is_flagged_for_review', true)->count();
            $data['has_stale_data'] = ($data['flagged_requests'] ?? 0) > 0;
            $regions[] = $data;
        }

        return response()->json([
            'regions' => $regions,
            'meta' => [
                'include_pii' => $includeHighGranularityPii,
                'user_role' => $user->role,
                'total_flagged' => collect($regions)->sum('flagged_requests'),
            ],
        ]);
    }

    /**
     * Get requests scoped for heat map:
     * - User is_verified
     * - Exclude completed, cancelled, closed_no_match
     * - Exclude self-dealing (request where contributor/claimant is same as recipient)
     */
    protected function getScopedRequests()
    {
        return Request::with(['user', 'allocations', 'contributions', 'assignedSupplier'])
            ->whereHas('user', fn ($q) => $q->where('is_verified', true))
            ->whereNotIn('status', ['completed', 'cancelled', 'closed_no_match'])
            ->where(function ($q) {
                $q->whereNull('expires_at')->orWhere('expires_at', '>', now());
            })
            ->get()
            ->filter(function ($request) {
                return !$this->isSelfDealing($request);
            })
            ->values();
    }

    /**
     * Check if request is part of a self-dealing chain (supplier = recipient).
     */
    protected function isSelfDealing(Request $request): bool
    {
        $recipientId = $request->user_id;

        if ($request->assigned_supplier_id === $recipientId) {
            return true;
        }

        $contributorIds = Contribution::where('request_id', $request->id)
            ->where('status', 'committed')
            ->pluck('supplier_id');

        return $contributorIds->contains($recipientId);
    }
}
