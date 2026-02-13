<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use App\Http\Resources\ContributionResource;

class RequestResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'user' => new UserResource($this->whenLoaded('user')),
            'title' => $this->title,
            'description' => $this->description,
            'aid_type' => $this->aid_type,
            'custom_aid_type' => $this->custom_aid_type,
            'status' => $this->status,
            'funding_status' => $this->funding_status ?? 'unfunded',
            'total_funded_percentage' => $this->when(isset($this->total_funded_percentage), $this->total_funded_percentage),
            'remaining_percentage' => $this->when(isset($this->remaining_percentage), $this->remaining_percentage),
            'assigned_supplier_id' => $this->assigned_supplier_id,
            'assigned_supplier' => new UserResource($this->whenLoaded('assignedSupplier')),
            'contributions' => ContributionResource::collection($this->whenLoaded('contributions')),
            'supporting_documents' => $this->supporting_documents,
            'need_type' => $this->need_type,
            'time_sensitivity' => $this->time_sensitivity,
            'recipient_type' => $this->recipient_type,
            'availability_gap' => $this->availability_gap,
            'admin_override' => $this->admin_override,
            'urgency_score' => $this->urgency_score,
            'urgency_level' => $this->urgency_level,
            'urgency_calculation_log' => $this->urgency_calculation_log,
            'response_time' => $this->response_time,
            'allocations' => AllocationResource::collection($this->whenLoaded('allocations')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
