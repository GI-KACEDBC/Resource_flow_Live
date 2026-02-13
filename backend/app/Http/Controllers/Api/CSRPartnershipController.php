<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CSRPartnership;
use App\Models\Project;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class CSRPartnershipController extends Controller
{
    /**
     * Get all partnerships (filtered by role)
     */
    public function index(Request $request): JsonResponse
    {
        $user = Auth::user();
        $query = CSRPartnership::with(['corporate', 'ngo', 'project']);

        if ($user->isCorporate()) {
            $query->where('corporate_id', $user->id);
        } elseif ($user->isNGO()) {
            $query->where('ngo_id', $user->id);
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        $partnerships = $query->paginate($request->input('per_page', 15));

        return response()->json($partnerships);
    }

    /**
     * Create a new CSR partnership (Corporate only)
     */
    public function store(Request $request): JsonResponse
    {
        $user = Auth::user();

        if (!$user->isCorporate()) {
            return response()->json([
                'message' => 'Only corporate users can create partnerships',
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'ngo_id' => 'required|exists:users,id',
            'project_id' => 'required|exists:projects,id',
            'funding_amount' => 'required|numeric|min:0',
            'funding_type' => 'required|in:one_time,recurring,milestone_based',
            'milestones' => 'nullable|array',
            'agreement_terms' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        // Verify project belongs to the specified NGO
        $project = Project::findOrFail($request->project_id);
        if ($project->ngo_id != $request->ngo_id) {
            return response()->json([
                'message' => 'Project does not belong to the specified NGO',
            ], 422);
        }

        // Check if project is verified
        if (!$project->is_verified) {
            return response()->json([
                'message' => 'Project must be verified by an auditor before funding',
            ], 422);
        }

        DB::beginTransaction();
        try {
            $partnership = CSRPartnership::create([
                'corporate_id' => $user->id,
                'ngo_id' => $request->ngo_id,
                'project_id' => $request->project_id,
                'funding_amount' => $request->funding_amount,
                'funding_type' => $request->funding_type,
                'milestones' => $request->milestones,
                'agreement_terms' => $request->agreement_terms,
                'status' => 'pending',
            ]);

            // Update project funded amount
            $project->increment('funded_amount', $request->funding_amount);

            // If fully funded, update status
            if ($project->funded_amount >= $project->budget) {
                $project->update(['status' => 'completed']);
            }

            DB::commit();

            return response()->json([
                'message' => 'Partnership created successfully',
                'partnership' => $partnership->load(['corporate', 'ngo', 'project']),
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Failed to create partnership',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get a specific partnership
     */
    public function show($id): JsonResponse
    {
        $partnership = CSRPartnership::with(['corporate', 'ngo', 'project'])
            ->findOrFail($id);

        $user = Auth::user();
        if ($user->isCorporate() && $partnership->corporate_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        if ($user->isNGO() && $partnership->ngo_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json($partnership);
    }

    /**
     * Update partnership status (NGO can approve/reject)
     */
    public function update(Request $request, $id): JsonResponse
    {
        $user = Auth::user();
        $partnership = CSRPartnership::findOrFail($id);

        if ($user->isNGO() && $partnership->ngo_id === $user->id) {
            // NGO can approve/reject
            $validator = Validator::make($request->all(), [
                'status' => 'required|in:active,rejected',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'message' => 'Validation failed',
                    'errors' => $validator->errors(),
                ], 422);
            }

            $partnership->update([
                'status' => $request->status,
                'funding_date' => $request->status === 'active' ? now() : null,
            ]);

            return response()->json([
                'message' => 'Partnership updated successfully',
                'partnership' => $partnership->fresh(['corporate', 'ngo', 'project']),
            ]);
        }

        return response()->json(['message' => 'Unauthorized'], 403);
    }
}
