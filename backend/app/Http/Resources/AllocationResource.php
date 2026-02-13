<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AllocationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'request_id' => $this->request_id,
            'request' => new RequestResource($this->whenLoaded('request')),
            'donation_id' => $this->donation_id,
            'donation' => new DonationResource($this->whenLoaded('donation')),
            'allocated_by' => $this->allocated_by,
            'allocator' => new UserResource($this->whenLoaded('allocator')),
            'quantity_allocated' => (float) $this->quantity_allocated,
            'status' => $this->status,
            'notes' => $this->notes,
            'allocated_date' => $this->allocated_date,
            'expected_delivery_date' => $this->expected_delivery_date,
            'actual_delivery_date' => $this->actual_delivery_date,
            'logistics' => new LogisticResource($this->whenLoaded('logistics')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
