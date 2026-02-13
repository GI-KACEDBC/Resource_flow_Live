<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProjectItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'project_id',
        'item_name',
        'description',
        'quantity_needed',
        'quantity_received',
        'unit',
        'estimated_value',
        'status',
    ];

    protected $casts = [
        'quantity_needed' => 'integer',
        'quantity_received' => 'integer',
        'estimated_value' => 'decimal:2',
    ];

    // Relationships
    public function project()
    {
        return $this->belongsTo(Project::class);
    }

    public function itemClaims()
    {
        return $this->hasMany(ItemClaim::class, 'project_item_id');
    }

    // Helper methods
    public function getProgressAttribute()
    {
        if ($this->quantity_needed == 0) {
            return 0;
        }
        return min(100, ($this->quantity_received / $this->quantity_needed) * 100);
    }

    public function getRemainingQuantityAttribute()
    {
        return max(0, $this->quantity_needed - $this->quantity_received);
    }
}
