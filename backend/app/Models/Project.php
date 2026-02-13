<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Project extends Model
{
    use HasFactory;

    protected $fillable = [
        'ngo_id',
        'title',
        'description',
        'need_type',
        'sdg_goals',
        'budget',
        'funded_amount',
        'impact_metrics',
        'location',
        'status',
        'start_date',
        'end_date',
        'is_verified',
        'verified_by',
        'verified_at',
    ];

    protected $casts = [
        'sdg_goals' => 'array',
        'impact_metrics' => 'array',
        'budget' => 'decimal:2',
        'funded_amount' => 'decimal:2',
        'start_date' => 'datetime',
        'end_date' => 'datetime',
        'verified_at' => 'datetime',
        'is_verified' => 'boolean',
    ];

    // Relationships
    public function ngo()
    {
        return $this->belongsTo(User::class, 'ngo_id');
    }

    public function verifier()
    {
        return $this->belongsTo(User::class, 'verified_by');
    }

    public function csrPartnerships()
    {
        return $this->hasMany(CSRPartnership::class);
    }

    public function projectItems()
    {
        return $this->hasMany(ProjectItem::class);
    }

    public function impactProofs()
    {
        return $this->hasMany(ImpactProof::class);
    }

    public function itemClaims()
    {
        return $this->hasMany(ItemClaim::class);
    }

    // Helper methods
    public function getFundingProgressAttribute()
    {
        if (!$this->budget || $this->budget == 0) {
            return 0;
        }
        return min(100, ($this->funded_amount / $this->budget) * 100);
    }

    public function getRemainingBudgetAttribute()
    {
        return max(0, $this->budget - $this->funded_amount);
    }
}
