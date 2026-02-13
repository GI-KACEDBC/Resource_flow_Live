<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class WarehouseResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'city' => $this->city,
            'region' => $this->region,
            'address' => $this->address,
            'capacity' => (float) $this->capacity,
            'capacity_unit' => $this->capacity_unit,
            'manager' => $this->manager,
            'contact_phone' => $this->contact_phone,
            'contact_email' => $this->contact_email,
            'status' => $this->status,
            'current_occupancy' => (float) $this->current_occupancy,
            'occupancy_percentage' => (float) \App\Helpers\FormatHelper::capPercent($this->occupancy_percentage ?? 0),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
