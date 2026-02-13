<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class VerificationDocumentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'user' => new UserResource($this->whenLoaded('user')),
            'document_type' => $this->document_type,
            'document_number' => $this->document_number,
            'file_path' => $this->file_path,
            'file_name' => $this->file_name,
            'mime_type' => $this->mime_type,
            'file_size' => $this->file_size,
            'verification_status' => $this->verification_status,
            'verified_by' => $this->verified_by,
            'verifier' => new UserResource($this->whenLoaded('verifier')),
            'verified_at' => $this->verified_at,
            'rejection_reason' => $this->rejection_reason,
            'notes' => $this->notes,
            'qoreid_request_id' => $this->qoreid_request_id,
            'qoreid_verified_at' => $this->qoreid_verified_at,
            'qoreid_photo' => $this->qoreid_photo,
            'requester_submitted_at' => $this->requester_submitted_at,
            'field_agent_verified_at' => $this->field_agent_verified_at,
            'admin_reviewed_at' => $this->admin_reviewed_at,
            'supplier_uploaded_at' => $this->supplier_uploaded_at,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
