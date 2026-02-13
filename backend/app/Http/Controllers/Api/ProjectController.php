<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\ProjectItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class ProjectController extends Controller
{
    /**
     * Get all projects (filtered by role)
     */
    public function index(Request $request): JsonResponse
    {
        $user = Auth::user();
        $query = Project::with(['ngo', 'verifier']);

        // NGOs see only their projects
        if ($user->isNGO()) {
            $query->where('ngo_id', $user->id);
        }

        // Corporates see verified projects
        if ($user->isCorporate()) {
            $query->where('is_verified', true)
                  ->where('status', 'active');
        }

        // Apply filters
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('sdg_goals')) {
            $sdgGoals = is_array($request->sdg_goals) ? $request->sdg_goals : [$request->sdg_goals];
            $query->whereJsonContains('sdg_goals', $sdgGoals);
        }

        $projects = $query->paginate($request->input('per_page', 15));

        return response()->json($projects);
    }

    /**
     * Create a new project (NGO only)
     */
    public function store(Request $request): JsonResponse
    {
        $user = Auth::user();

        if (!$user->isNGO()) {
            return response()->json([
                'message' => 'Only NGOs can create projects',
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:255',
            'description' => 'required|string',
            'need_type' => 'required|in:funding,items,both',
            'sdg_goals' => 'required|array',
            'sdg_goals.*' => 'integer|min:1|max:17',
            'budget' => 'nullable|numeric|min:0',
            'location' => 'nullable|string|max:255',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after:start_date',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $project = Project::create([
            'ngo_id' => $user->id,
            'title' => $request->title,
            'description' => $request->description,
            'need_type' => $request->need_type,
            'sdg_goals' => $request->sdg_goals,
            'budget' => $request->budget,
            'location' => $request->location,
            'start_date' => $request->start_date,
            'end_date' => $request->end_date,
            'status' => 'active',
        ]);

        // Create project items if provided
        if ($request->has('items') && is_array($request->items)) {
            foreach ($request->items as $item) {
                ProjectItem::create([
                    'project_id' => $project->id,
                    'item_name' => $item['item_name'],
                    'description' => $item['description'] ?? null,
                    'quantity_needed' => $item['quantity_needed'],
                    'unit' => $item['unit'] ?? 'pieces',
                    'estimated_value' => $item['estimated_value'] ?? null,
                ]);
            }
        }

        return response()->json([
            'message' => 'Project created successfully',
            'project' => $project->load(['ngo', 'projectItems']),
        ], 201);
    }

    /**
     * Get a specific project
     */
    public function show($id): JsonResponse
    {
        $project = Project::with(['ngo', 'verifier', 'projectItems', 'csrPartnerships.corporate'])
            ->findOrFail($id);

        return response()->json($project);
    }

    /**
     * Update a project (NGO only, their own projects)
     */
    public function update(Request $request, $id): JsonResponse
    {
        $user = Auth::user();
        $project = Project::findOrFail($id);

        if (!$user->isNGO() || $project->ngo_id !== $user->id) {
            return response()->json([
                'message' => 'Unauthorized',
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'title' => 'sometimes|string|max:255',
            'description' => 'sometimes|string',
            'status' => 'sometimes|in:active,completed,paused,cancelled',
            'budget' => 'sometimes|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $project->update($request->only([
            'title', 'description', 'status', 'budget', 'location',
            'start_date', 'end_date',
        ]));

        return response()->json([
            'message' => 'Project updated successfully',
            'project' => $project->fresh(['ngo', 'projectItems']),
        ]);
    }
}
