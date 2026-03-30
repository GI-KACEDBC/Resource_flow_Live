<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreProjectRequest;
use App\Models\Organization;
use App\Models\Project;
use App\Models\ProjectBudget;
use App\Models\ProjectItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

class ProjectController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = Auth::user();
        $query = Project::with(['ngo', 'organization', 'verifier', 'projectBudgets']);

        if ($user->isNGO()) {
            $query->where(function ($q) use ($user) {
                $q->where('ngo_id', $user->id);
                if ($user->organization) {
                    $q->orWhere('organization_id', $user->organization->id);
                }
                $q->orWhere(function ($q2) {
                    $q2->where('is_verified', true)->whereIn('status', ['active', 'fully_funded']);
                });
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('sdg_goals')) {
            $sdgGoals = is_array($request->sdg_goals) ? $request->sdg_goals : [$request->sdg_goals];
            $query->whereJsonContains('sdg_goals', $sdgGoals);
        }

        $projects = $query->orderBy('created_at', 'desc')->paginate($request->input('per_page', 15));
        return response()->json($projects);
    }

    public function store(StoreProjectRequest $request): JsonResponse
    {
        $user = Auth::user();
        $validated = $request->validated();

        $org = $user->organization;
        $targetAmount = 0;
        foreach ($validated['budgets'] as $b) {
            $targetAmount += (float) ($b['quantity'] ?? 0) * (float) ($b['unit_cost'] ?? 0);
        }

        $slug = Str::slug($validated['title']) . '-' . substr(uniqid(), -6);

        $project = Project::create([
            'ngo_id' => $user->id,
            'organization_id' => $org?->id,
            'title' => $validated['title'],
            'slug' => $slug,
            'description' => $validated['description'],
            'need_type' => $validated['need_type'] ?? 'funding',
            'sdg_goals' => $validated['sdg_goals'] ?? [],
            'budget' => $targetAmount,
            'target_amount' => $targetAmount,
            'estimated_total_value' => $targetAmount,
            'location' => $validated['location'] ?? null,
            'location_gps' => $validated['location_gps'] ?? null,
            'cover_photo_path' => $validated['cover_photo_path'] ?? null,
            'proof_documents' => $validated['proof_documents'] ?? null,
            'start_date' => $validated['start_date'] ?? null,
            'end_date' => $validated['end_date'] ?? null,
            'status' => 'draft',
        ]);

        foreach ($validated['budgets'] as $b) {
            ProjectBudget::create([
                'project_id' => $project->id,
                'category' => $b['category'],
                'item_name' => $b['item_name'],
                'quantity' => $b['quantity'],
                'unit_cost' => $b['unit_cost'],
                'total_cost' => (float) $b['quantity'] * (float) $b['unit_cost'],
            ]);
        }

        return response()->json([
            'message' => 'Project created successfully',
            'project' => $project->load(['ngo', 'organization', 'projectBudgets']),
        ], 201);
    }

    public function show($id): JsonResponse
    {
        $project = Project::with([
            'ngo',
            'organization',
            'verifier',
            'projectBudgets',
            'projectItems',
            'csrPartnerships.corporate',
            'adminValueVerifier',
            'auditorValueVerifier',
        ])
            ->findOrFail($id);
        return response()->json($project);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $user = Auth::user();
        $project = Project::findOrFail($id);

        if (!$user->canCreateProjects() || ($project->ngo_id !== $user->id && $project->organization_id !== $user->organization?->id)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'title' => 'sometimes|string|max:255',
            'description' => 'sometimes|string',
            'status' => 'sometimes|in:draft,pending_approval,active,fully_funded,completed,paused,cancelled',
            'budget' => 'sometimes|numeric|min:0',
            'cover_photo_path' => 'nullable|string|max:500',
            'proof_documents' => 'nullable|array',
        ]);

        $project->update(array_merge($validated, [
            'proof_documents' => $validated['proof_documents'] ?? $project->proof_documents,
        ]));

        return response()->json([
            'message' => 'Project updated successfully',
            'project' => $project->fresh(['ngo', 'organization', 'projectBudgets', 'projectItems']),
        ]);
    }

    /**
     * Submit project for approval (draft -> pending_approval)
     */
    public function submit(Request $request, Project $project): JsonResponse
    {
        $user = Auth::user();
        $project->load('projectBudgets');

        if (!$user->canCreateProjects() || $project->ngo_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if ($project->status !== 'draft') {
            return response()->json(['message' => 'Only draft projects can be submitted.'], 422);
        }

        $targetAmount = (float) $project->projectBudgets->sum('total_cost');
        $org = $user->organization;

        if ($targetAmount > 5000 && (!$org || !$org->canPublishLargeProject($targetAmount))) {
            return response()->json([
                'message' => 'Projects over GH₵5,000 require Tier 2 or Tier 3 verification.',
            ], 422);
        }

        $project->update([
            'status' => 'pending_approval',
            'estimated_total_value' => $targetAmount,
            'target_amount' => $targetAmount,
            'budget' => $targetAmount,
        ]);
        return response()->json([
            'message' => 'Project submitted for approval',
            'project' => $project->fresh(['ngo', 'projectBudgets']),
        ]);
    }

    /**
     * Admin: after reviewing project documents, set the verified funding ceiling (GHS).
     */
    public function verifyFundingCeilingAdmin(Request $request, Project $project): JsonResponse
    {
        $this->authorize('verifyFundingCeilingAdmin', $project);

        $validated = $request->validate([
            'verified_ceiling_ghs' => 'required|numeric|min:0.01',
            'notes' => 'nullable|string|max:2000',
        ]);

        $project->update([
            'verified_ceiling_ghs' => $validated['verified_ceiling_ghs'],
            'admin_verified_value_at' => now(),
            'admin_verified_value_by' => $request->user()->id,
            'admin_value_notes' => $validated['notes'] ?? null,
        ]);

        return response()->json([
            'message' => 'Funding ceiling recorded. An auditor must confirm before project funding is enabled.',
            'project' => $project->fresh(['ngo', 'organization', 'projectBudgets', 'adminValueVerifier', 'auditorValueVerifier']),
        ]);
    }

    /**
     * Auditor: confirm the funding ceiling (optionally adjust verified_ceiling_ghs).
     */
    public function verifyFundingCeilingAuditor(Request $request, Project $project): JsonResponse
    {
        $this->authorize('verifyFundingCeilingAuditor', $project);

        if (! $project->admin_verified_value_at) {
            return response()->json([
                'message' => 'An administrator must verify the funding ceiling before the auditor can confirm.',
            ], 422);
        }

        $validated = $request->validate([
            'verified_ceiling_ghs' => 'nullable|numeric|min:0.01',
            'notes' => 'nullable|string|max:2000',
        ]);

        $ceiling = isset($validated['verified_ceiling_ghs'])
            ? (float) $validated['verified_ceiling_ghs']
            : (float) $project->verified_ceiling_ghs;

        if ($ceiling <= 0) {
            return response()->json(['message' => 'verified_ceiling_ghs must be positive.'], 422);
        }

        $project->update([
            'verified_ceiling_ghs' => $ceiling,
            'auditor_verified_value_at' => now(),
            'auditor_verified_value_by' => $request->user()->id,
            'auditor_value_notes' => $validated['notes'] ?? null,
        ]);

        return response()->json([
            'message' => 'Funding ceiling confirmed. Project funding is capped at the verified amount.',
            'project' => $project->fresh(['ngo', 'organization', 'projectBudgets', 'adminValueVerifier', 'auditorValueVerifier']),
        ]);
    }
}
