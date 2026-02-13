<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CSRPartnership;
use App\Models\Project;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class ImpactDashboardController extends Controller
{
    /**
     * Get impact dashboard data for Corporate users
     */
    public function getImpactData(Request $request): JsonResponse
    {
        $user = Auth::user();

        if (!$user->isCorporate()) {
            return response()->json([
                'message' => 'Only corporate users can access impact dashboard',
            ], 403);
        }

        // Get all partnerships for this corporate
        $partnerships = CSRPartnership::where('corporate_id', $user->id)
            ->with(['ngo', 'project'])
            ->get();

        // Calculate totals
        $totalFundsDeployed = $partnerships->sum('funding_amount');
        $activePartnerships = $partnerships->where('status', 'active')->count();
        $completedPartnerships = $partnerships->where('status', 'completed')->count();

        // Aggregate impact metrics
        $totalLivesImpacted = 0;
        $sdgBreakdown = [];
        $ngoBreakdown = [];

        foreach ($partnerships as $partnership) {
            if ($partnership->impact_report) {
                $totalLivesImpacted += $partnership->impact_report['lives_impacted'] ?? 0;
            }

            if ($partnership->project && $partnership->project->sdg_goals) {
                foreach ($partnership->project->sdg_goals as $sdg) {
                    if (!isset($sdgBreakdown[$sdg])) {
                        $sdgBreakdown[$sdg] = [
                            'goal' => $sdg,
                            'projects_count' => 0,
                            'funding_amount' => 0,
                        ];
                    }
                    $sdgBreakdown[$sdg]['projects_count']++;
                    $sdgBreakdown[$sdg]['funding_amount'] += $partnership->funding_amount;
                }
            }

            if ($partnership->ngo) {
                $ngoId = $partnership->ngo_id;
                if (!isset($ngoBreakdown[$ngoId])) {
                    $ngoBreakdown[$ngoId] = [
                        'ngo_id' => $ngoId,
                        'ngo_name' => $partnership->ngo->name,
                        'partnerships_count' => 0,
                        'total_funding' => 0,
                    ];
                }
                $ngoBreakdown[$ngoId]['partnerships_count']++;
                $ngoBreakdown[$ngoId]['total_funding'] += $partnership->funding_amount;
            }
        }

        // Get recent partnerships
        $recentPartnerships = $partnerships->sortByDesc('created_at')->take(5)->values();

        return response()->json([
            'summary' => [
                'total_funds_deployed' => $totalFundsDeployed,
                'total_lives_impacted' => $totalLivesImpacted,
                'active_partnerships' => $activePartnerships,
                'completed_partnerships' => $completedPartnerships,
                'total_partnerships' => $partnerships->count(),
            ],
            'sdg_breakdown' => array_values($sdgBreakdown),
            'ngo_breakdown' => array_values($ngoBreakdown),
            'recent_partnerships' => $recentPartnerships->map(function ($partnership) {
                return [
                    'id' => $partnership->id,
                    'ngo_name' => $partnership->ngo->name ?? 'Unknown',
                    'project_title' => $partnership->project->title ?? 'Unknown',
                    'funding_amount' => $partnership->funding_amount,
                    'status' => $partnership->status,
                    'funding_date' => $partnership->funding_date,
                ];
            }),
        ]);
    }
}
