<?php

namespace App\Observers;

use App\Models\DeliveryRoute;
use App\Models\Logistic;
use Illuminate\Support\Str;

class DeliveryRouteObserver
{
    /**
     * Handle the DeliveryRoute "created" event.
     */
    public function created(DeliveryRoute $deliveryRoute): void
    {
        // Auto-create Logistic record when DeliveryRoute is created
        if ($deliveryRoute->allocation_id) {
            $trackingNumber = 'RF-' . strtoupper(Str::random(8)) . '-' . $deliveryRoute->id;

            Logistic::create([
                'allocation_id' => $deliveryRoute->allocation_id,
                'delivery_route_id' => $deliveryRoute->id,
                'status' => 'Scheduled',
                'tracking_number' => $trackingNumber,
                'location_updates' => [],
            ]);
        }
    }

    /**
     * Handle the DeliveryRoute "updated" event.
     */
    public function updated(DeliveryRoute $deliveryRoute): void
    {
        // Update logistic status when route status changes
        if ($deliveryRoute->isDirty('status')) {
            $logistic = Logistic::where('delivery_route_id', $deliveryRoute->id)->first();
            if ($logistic) {
                $logistic->update(['status' => $deliveryRoute->status]);
            }
        }
    }
}
