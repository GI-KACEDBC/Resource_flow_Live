<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ImpactProof;
use App\Models\Project;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class ImpactProofController extends Controller
{
    /**
     * Get all impact proofs
     * Field agents see only their own, admins/auditors see all
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = ImpactProof::with(['project', 'fieldAgent', 'verifier']);

        // Field agents see only their own proofs
        if ($user->isFieldAgent()) {
            $query->where('field_agent_id', $user->id);
        }

        // Filter by project
        if ($request->has('project_id')) {
            $query->where('project_id', $request->project_id);
        }

        // Filter by verification status
        if ($request->has('is_verified')) {
            $query->where('is_verified', $request->boolean('is_verified'));
        }

        // Filter by proof type
        if ($request->has('proof_type')) {
            $query->where('proof_type', $request->proof_type);
        }

        $proofs = $query->orderBy('created_at', 'desc')->get();
        return response()->json($proofs);
    }

    /**
     * Get a single impact proof
     */
    public function show(Request $request, ImpactProof $impactProof): JsonResponse
    {
        $user = $request->user();

        // Field agents can only see their own proofs
        if ($user->isFieldAgent() && $impactProof->field_agent_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $impactProof->load(['project', 'fieldAgent', 'verifier']);
        return response()->json($impactProof);
    }

    /**
     * Create a new impact proof (Field Agent only)
     */
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        // Only field agents can create impact proofs
        if (!$user->isFieldAgent()) {
            return response()->json(['message' => 'Only field agents can upload impact proofs'], 403);
        }

        $validator = Validator::make($request->all(), [
            'project_id' => 'required|exists:projects,id',
            'proof_type' => 'required|in:photo,video,document,note',
            'file' => 'required_if:proof_type,photo,video,document|file|mimes:jpg,jpeg,png,pdf,mp4,mov,avi|max:10240', // 10MB max
            'description' => 'nullable|string|max:1000',
            'latitude' => 'nullable|numeric|between:-90,90',
            'longitude' => 'nullable|numeric|between:-180,180',
            'location_name' => 'nullable|string|max:255',
            'metadata' => 'nullable|array',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Verify project exists and is active
        $project = Project::findOrFail($request->project_id);
        if ($project->status !== 'active') {
            return response()->json(['message' => 'Can only upload proofs for active projects'], 422);
        }

        $filePath = null;
        if ($request->hasFile('file')) {
            $file = $request->file('file');
            $fileName = time() . '_' . $file->getClientOriginalName();
            $filePath = $file->storeAs('impact_proofs', $fileName, 'public');
        }

        $impactProof = ImpactProof::create([
            'project_id' => $request->project_id,
            'field_agent_id' => $user->id,
            'proof_type' => $request->proof_type,
            'file_path' => $filePath,
            'description' => $request->description,
            'latitude' => $request->latitude,
            'longitude' => $request->longitude,
            'location_name' => $request->location_name,
            'metadata' => $request->metadata ?? [],
            'is_verified' => false,
        ]);

        $impactProof->load(['project', 'fieldAgent']);
        return response()->json($impactProof, 201);
    }

    /**
     * Update an impact proof (Field Agent can update their own)
     */
    public function update(Request $request, ImpactProof $impactProof): JsonResponse
    {
        $user = $request->user();

        // Field agents can only update their own proofs
        if ($user->isFieldAgent() && $impactProof->field_agent_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Cannot update verified proofs
        if ($impactProof->is_verified) {
            return response()->json(['message' => 'Cannot update verified proofs'], 422);
        }

        $validator = Validator::make($request->all(), [
            'description' => 'sometimes|string|max:1000',
            'location_name' => 'nullable|string|max:255',
            'metadata' => 'nullable|array',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $impactProof->update($validator->validated());
        $impactProof->load(['project', 'fieldAgent', 'verifier']);
        return response()->json($impactProof);
    }

    /**
     * Delete an impact proof (Field Agent can delete their own unverified proofs)
     */
    public function destroy(Request $request, ImpactProof $impactProof): JsonResponse
    {
        $user = $request->user();

        // Field agents can only delete their own proofs
        if ($user->isFieldAgent() && $impactProof->field_agent_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Cannot delete verified proofs
        if ($impactProof->is_verified) {
            return response()->json(['message' => 'Cannot delete verified proofs'], 422);
        }

        // Delete file if exists
        if ($impactProof->file_path && Storage::disk('public')->exists($impactProof->file_path)) {
            Storage::disk('public')->delete($impactProof->file_path);
        }

        $impactProof->delete();
        return response()->json(null, 204);
    }

    /**
     * Verify an impact proof (Auditor only)
     */
    public function verify(Request $request, ImpactProof $impactProof): JsonResponse
    {
        $user = $request->user();

        // Only auditors can verify
        if (!$user->isAuditor()) {
            return response()->json(['message' => 'Only auditors can verify impact proofs'], 403);
        }

        $impactProof->update([
            'is_verified' => true,
            'verified_by' => $user->id,
            'verified_at' => now(),
        ]);

        $impactProof->load(['project', 'fieldAgent', 'verifier']);
        return response()->json($impactProof);
    }

    /**
     * Get active projects for field agent to upload proofs to
     */
    public function getActiveProjects(Request $request): JsonResponse
    {
        $projects = Project::where('status', 'active')
            ->where('is_verified', true)
            ->with(['ngo', 'impactProofs' => function ($query) use ($request) {
                $query->where('field_agent_id', $request->user()->id);
            }])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($projects);
    }

    /**
     * Download proof file
     */
    public function download(Request $request, ImpactProof $impactProof): \Symfony\Component\HttpFoundation\BinaryFileResponse|\Illuminate\Http\JsonResponse
    {
        $user = $request->user();

        // Field agents can only download their own proofs
        if ($user->isFieldAgent() && $impactProof->field_agent_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if (!$impactProof->file_path || !Storage::disk('public')->exists($impactProof->file_path)) {
            return response()->json(['message' => 'File not found'], 404);
        }

        return Storage::disk('public')->download($impactProof->file_path);
    }
}
