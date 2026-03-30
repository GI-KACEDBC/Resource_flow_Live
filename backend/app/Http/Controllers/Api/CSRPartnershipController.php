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

        if ($user->isDonorInstitution()) {
            $query->where(function ($q) use ($user) {
                $q->where('corporate_id', $user->id)->orWhere('ngo_id', $user->id);
            });
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

        if (!$user->isDonorInstitution()) {
            return response()->json([
                'message' => 'Only donor institutions can create partnerships',
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

        // Check if project is verified (legacy NGO project audit)
        if (! $project->is_verified) {
            return response()->json([
                'message' => 'Project must be verified by an auditor before funding',
            ], 422);
        }

        if (! $project->hasDualVerifiedFundingCeiling()) {
            return response()->json([
                'message' => 'Funding commitments require an administrator and an auditor to verify the project funding ceiling (total estimated value) after reviewing documents.',
            ], 422);
        }

        $commitAmount = (float) $request->funding_amount;
        if ($project->totalRaisedGhs() + $commitAmount > (float) $project->verified_ceiling_ghs + 0.02) {
            return response()->json([
                'message' => 'This commitment would exceed the verified project funding ceiling (GH₵'.number_format((float) $project->verified_ceiling_ghs, 2).').',
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

            $project->refresh();
            $ceiling = (float) $project->verified_ceiling_ghs;
            if ($ceiling > 0 && $project->totalRaisedGhs() >= $ceiling - 0.02) {
                $project->update(['status' => 'fully_funded']);
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
        if ($user->isDonorInstitution() && $partnership->corporate_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        if ($user->isDonorInstitution() && $partnership->ngo_id !== $user->id) {
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

        if ($user->isDonorInstitution() && $partnership->ngo_id === $user->id) {
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
