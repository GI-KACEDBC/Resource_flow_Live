<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SupplierInventory extends Model
{
    use HasFactory;

    protected $table = 'supplier_inventory';

    protected $fillable = [
        'supplier_id',
        'item_name',
        'description',
        'category',
        'quantity_available',
        'quantity_reserved',
        'unit',
        'unit_price',
        'condition',
        'expiry_date',
        'status',
        'specifications',
    ];

    protected $casts = [
        'quantity_available' => 'integer',
        'quantity_reserved' => 'integer',
        'unit_price' => 'decimal:2',
        'expiry_date' => 'date',
        'specifications' => 'array',
    ];

    // Relationships
    public function supplier()
    {
        return $this->belongsTo(User::class, 'supplier_id');
    }

    public function itemClaims()
    {
        return $this->hasMany(ItemClaim::class, 'supplier_inventory_id');
    }

    // Helper methods
    public function getAvailableQuantityAttribute()
    {
        return max(0, $this->quantity_available - $this->quantity_reserved);
    }

    public function isExpired()
    {
        return $this->expiry_date && $this->expiry_date->isPast();
    }
}
