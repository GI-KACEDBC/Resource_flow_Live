<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Logistic extends Model
{
    use HasFactory;

    protected $fillable = [
        'allocation_id',
        'delivery_route_id',
        'status',
        'tracking_number',
        'estimated_value',
        'delivery_notes',
        'location_updates',
        'last_location_update',
    ];

    protected $casts = [
        'estimated_value' => 'decimal:2',
        'location_updates' => 'array',
        'last_location_update' => 'datetime',
    ];

    public function allocation()
    {
        return $this->belongsTo(Allocation::class);
    }

    public function deliveryRoute()
    {
        return $this->belongsTo(DeliveryRoute::class);
    }

    /**
     * Scope queries by authenticated user role (via delivery route)
     */
    public function scopeForUser($query, $user)
    {
        if (!$user) {
            return $query->whereRaw('1 = 0');
        }
        if ($user->isAdmin() || $user->isDistributor()) {
            return $query;
        }
        return $query->whereHas('deliveryRoute', fn ($q) => $q->forUser($user));
    }
}
