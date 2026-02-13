<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DeliveryRouteResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'route_name' => $this->route_name,
            'warehouse_id' => $this->warehouse_id,
            'warehouse' => new WarehouseResource($this->whenLoaded('warehouse')),
            'destination_region' => $this->destination_region,
            'destination_city' => $this->destination_city,
            'destination_address' => $this->destination_address,
            'distance_km' => $this->distance_km ? (float) $this->distance_km : null,
            'estimated_duration_minutes' => $this->estimated_duration_minutes,
            'status' => $this->status,
            'scheduled_date' => $this->scheduled_date,
            'actual_departure_date' => $this->actual_departure_date,
            'actual_arrival_date' => $this->actual_arrival_date,
            'driver_id' => $this->driver_id,
            'driver' => new UserResource($this->whenLoaded('driver')),
            'vehicle_id' => $this->vehicle_id,
            'route_notes' => $this->route_notes,
            'recipient_confirmed_at' => $this->recipient_confirmed_at,
            'logistics' => LogisticResource::collection($this->whenLoaded('logistics')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
