<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DonationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'aid_request_id' => $this->aid_request_id,
            'user' => new UserResource($this->whenLoaded('user')),
            'type' => $this->type,
            'item' => $this->item,
            'quantity' => (float) $this->quantity,
            'remaining_quantity' => $this->remaining_quantity ? (float) $this->remaining_quantity : (float) $this->quantity,
            'unit' => $this->unit,
            'description' => $this->description,
            'status' => $this->status,
            'date_received' => $this->date_received,
            'warehouse_id' => $this->warehouse_id,
            'warehouse' => new WarehouseResource($this->whenLoaded('warehouse')),
            'colocation_facility' => $this->colocation_facility,
            'colocation_sub_location' => $this->colocation_sub_location,
            'value' => $this->value ? (float) $this->value : null,
            'value_formatted' => \App\Helpers\FormatHelper::ghs($this->value),
            'market_price' => $this->market_price ? (float) $this->market_price : null,
            'market_price_formatted' => \App\Helpers\FormatHelper::ghs($this->market_price),
            'price_status' => $this->price_status,
            'audited_price' => $this->audited_price ? (float) $this->audited_price : null,
            'audited_price_formatted' => \App\Helpers\FormatHelper::ghs($this->audited_price),
            'auditor_notes' => $this->auditor_notes,
            'audited_by' => $this->audited_by,
            'auditor' => new UserResource($this->whenLoaded('auditor')),
            'locked_at' => $this->locked_at,
            'expiry_date' => $this->expiry_date,
            'is_expired' => $this->isExpired(),
            'is_available' => $this->isAvailable(),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
