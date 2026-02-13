<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DeliveryRoute extends Model
{
    use HasFactory;

    protected $fillable = [
        'route_name',
        'warehouse_id',
        'allocation_id',
        'destination_region',
        'destination_city',
        'destination_address',
        'distance_km',
        'estimated_duration_minutes',
        'status',
        'recipient_confirmed_at',
        'scheduled_date',
        'actual_departure_date',
        'actual_arrival_date',
        'driver_id',
        'vehicle_id',
        'route_notes',
    ];

    protected $casts = [
        'distance_km' => 'decimal:2',
        'scheduled_date' => 'date',
        'recipient_confirmed_at' => 'datetime',
        'actual_departure_date' => 'date',
        'actual_arrival_date' => 'date',
    ];

    public function warehouse()
    {
        return $this->belongsTo(Warehouse::class);
    }

    public function driver()
    {
        return $this->belongsTo(User::class, 'driver_id');
    }

    public function logistics()
    {
        return $this->hasMany(Logistic::class);
    }

    public function allocation()
    {
        return $this->belongsTo(Allocation::class);
    }

    /**
     * Scope queries by authenticated user role
     */
    public function scopeForUser($query, $user)
    {
        if (!$user) {
            return $query->whereRaw('1 = 0');
        }
        if ($user->isAdmin() || $user->isDistributor()) {
            return $query;
        }
        if ($user->isSupplier()) {
            return $query->where(function ($q) use ($user) {
                $q->whereHas('allocation', fn ($aq) => $aq->whereHas('donation', fn ($dq) => $dq->where('user_id', $user->id)))
                    ->orWhere('driver_id', $user->id);
            });
        }
        return $query->where('driver_id', $user->id);
    }
}
