<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'role' => $this->role,
            'organization' => $this->organization,
            'address' => $this->address,
            'phone' => $this->phone,
            'is_active' => $this->is_active,
            'vulnerability_score' => new VulnerabilityScoreResource($this->whenLoaded('vulnerabilityScore')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
