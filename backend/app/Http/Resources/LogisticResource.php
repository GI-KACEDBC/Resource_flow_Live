<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LogisticResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'allocation_id' => $this->allocation_id,
            'allocation' => new AllocationResource($this->whenLoaded('allocation')),
            'delivery_route_id' => $this->delivery_route_id,
            'delivery_route' => new DeliveryRouteResource($this->whenLoaded('deliveryRoute')),
            'status' => $this->status,
            'tracking_number' => $this->tracking_number,
            'estimated_value' => $this->estimated_value ? (float) $this->estimated_value : null,
            'estimated_value_formatted' => \App\Helpers\FormatHelper::ghs($this->estimated_value),
            'delivery_notes' => $this->delivery_notes,
            'location_updates' => $this->location_updates,
            'last_location_update' => $this->last_location_update,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
