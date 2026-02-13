<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Warehouse extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'city',
        'region',
        'address',
        'capacity',
        'capacity_unit',
        'manager',
        'contact_phone',
        'contact_email',
        'status',
        'current_occupancy',
    ];

    protected $casts = [
        'capacity' => 'decimal:2',
        'current_occupancy' => 'decimal:2',
    ];

    public function donations()
    {
        return $this->hasMany(Donation::class);
    }

    public function deliveryRoutes()
    {
        return $this->hasMany(DeliveryRoute::class);
    }

    public function getOccupancyPercentageAttribute(): float
    {
        if ($this->capacity == 0) {
            return 0;
        }
        return ($this->current_occupancy / $this->capacity) * 100;
    }
}
