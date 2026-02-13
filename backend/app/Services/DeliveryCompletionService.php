<?php

namespace App\Services;

use App\Models\DeliveryRoute;
use App\Models\Logistic;
use App\Models\Allocation;
use App\Models\Donation;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class DeliveryCompletionService
{
    /**
     * Complete delivery and cascade status updates to all related records
     *
     * @param DeliveryRoute $deliveryRoute
     * @return bool
     */
    public function completeDelivery(DeliveryRoute $deliveryRoute): bool
    {
        return DB::transaction(function () use ($deliveryRoute) {
            try {
                // Update DeliveryRoute
                $deliveryRoute->update([
                    'status' => 'Delivered',
                    'actual_arrival_date' => now(),
                ]);

                // Update Logistic
                $logistic = Logistic::where('delivery_route_id', $deliveryRoute->id)->first();
                if ($logistic) {
                    $logistic->update([
                        'status' => 'Delivered',
                    ]);
                }

                // Update Allocation
                if ($deliveryRoute->allocation_id) {
                    $allocation = Allocation::find($deliveryRoute->allocation_id);
                    if ($allocation) {
                        $allocation->update([
                            'status' => 'Delivered',
                            'actual_delivery_date' => now(),
                        ]);

                        // Update Donation
                        if ($allocation->donation_id) {
                            $donation = Donation::find($allocation->donation_id);
                            if ($donation) {
                                $donation->update([
                                    'status' => 'Delivered',
                                ]);
                            }
                        }
                    }
                } else {
                    // If no allocation_id, try to find via logistic
                    $logistic = Logistic::where('delivery_route_id', $deliveryRoute->id)->first();
                    if ($logistic && $logistic->allocation_id) {
                        $allocation = Allocation::find($logistic->allocation_id);
                        if ($allocation) {
                            $allocation->update([
                                'status' => 'Delivered',
                                'actual_delivery_date' => now(),
                            ]);

                            if ($allocation->donation_id) {
                                $donation = Donation::find($allocation->donation_id);
                                if ($donation) {
                                    $donation->update([
                                        'status' => 'Delivered',
                                    ]);
                                }
                            }
                        }
                    }
                }

                return true;
            } catch (\Exception $e) {
                Log::error('Delivery completion failed', [
                    'delivery_route_id' => $deliveryRoute->id,
                    'error' => $e->getMessage(),
                ]);
                throw $e;
            }
        });
    }
}
