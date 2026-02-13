<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class MatchmakingController extends Controller
{
    /**
     * Get matched NGOs for a Corporate user based on SDG goals and location
     */
    public function getMatches(Request $request): JsonResponse
    {
        $user = Auth::user();

        if (!$user->isCorporate()) {
            return response()->json([
                'message' => 'Only corporate users can access matchmaking',
            ], 403);
        }

        $corporateSDGs = $request->input('sdg_goals', []); // Array of SDG numbers
        $location = $request->input('location'); // Optional location filter
        $limit = $request->input('limit', 10);

        // Get verified NGOs with projects
        $query = User::where('role', 'ngo')
            ->where('verification_status', 'verified')
            ->where('is_active', true)
            ->with(['projects' => function ($q) {
                $q->where('status', 'active')
                  ->where('is_verified', true);
            }]);

        // Filter by location if provided
        if ($location) {
            $query->where('address', 'like', "%{$location}%");
        }

        $ngos = $query->get();

        // Score and rank NGOs based on SDG match
        $scoredNGOs = $ngos->map(function ($ngo) use ($corporateSDGs) {
            $score = 0;
            $matchedSDGs = [];

            foreach ($ngo->projects as $project) {
                if ($project->sdg_goals && is_array($project->sdg_goals)) {
                    $commonSDGs = array_intersect($corporateSDGs, $project->sdg_goals);
                    $score += count($commonSDGs) * 10; // 10 points per matching SDG
                    $matchedSDGs = array_merge($matchedSDGs, $commonSDGs);
                }
            }

            // Bonus points for reputation
            $score += $ngo->reputation_score ?? 0;

            return [
                'ngo' => $ngo,
                'match_score' => $score,
                'matched_sdg_goals' => array_unique($matchedSDGs),
                'active_projects_count' => $ngo->projects->count(),
            ];
        })
        ->sortByDesc('match_score')
        ->take($limit)
        ->values();

        return response()->json([
            'matches' => $scoredNGOs->map(function ($item) {
                return [
                    'id' => $item['ngo']->id,
                    'name' => $item['ngo']->name,
                    'organization' => $item['ngo']->organization,
                    'location' => $item['ngo']->address,
                    'reputation_score' => $item['ngo']->reputation_score ?? 0,
                    'match_score' => $item['match_score'],
                    'matched_sdg_goals' => $item['matched_sdg_goals'],
                    'active_projects_count' => $item['active_projects_count'],
                    'projects' => $item['ngo']->projects->map(function ($project) {
                        return [
                            'id' => $project->id,
                            'title' => $project->title,
                            'sdg_goals' => $project->sdg_goals,
                            'budget' => $project->budget,
                            'funded_amount' => $project->funded_amount,
                            'funding_progress' => $project->funding_progress,
                        ];
                    }),
                ];
            }),
        ]);
    }

    /**
     * Get match suggestions for a specific project
     */
    public function getProjectMatches(Request $request, $projectId): JsonResponse
    {
        $project = Project::with('ngo')->findOrFail($projectId);
        $user = Auth::user();

        if (!$user->isCorporate()) {
            return response()->json([
                'message' => 'Only corporate users can access matchmaking',
            ], 403);
        }

        // Get corporates that match this project's SDG goals
        $projectSDGs = $project->sdg_goals ?? [];
        
        // For now, return all active corporates (can be enhanced with corporate SDG preferences)
        $corporates = User::where('role', 'corporate')
            ->where('is_active', true)
            ->get();

        return response()->json([
            'project' => [
                'id' => $project->id,
                'title' => $project->title,
                'sdg_goals' => $projectSDGs,
            ],
            'suggested_corporates' => $corporates->map(function ($corporate) {
                return [
                    'id' => $corporate->id,
                    'name' => $corporate->name,
                    'organization' => $corporate->organization,
                ];
            }),
        ]);
    }
}
