<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Request extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'title',
        'description',
        'aid_type',
        'custom_aid_type',
        'status',
        'funding_status',
        'assigned_supplier_id',
        'supporting_documents',
        'need_type',
        'time_sensitivity',
        'recipient_type',
        'region',
        'availability_gap',
        'quantity_required',
        'unit',
        'expires_at',
        'is_flagged_for_review',
        'flagged_at',
        'urgency_score',
        'urgency_level',
        'urgency_calculation_log',
        'admin_override',
        'last_audited_at',
        'audited_by',
    ];

    protected $casts = [
        'urgency_calculation_log' => 'array',
        'supporting_documents' => 'array',
        'urgency_score' => 'float',
        'availability_gap' => 'integer',
        'admin_override' => 'integer',
        'quantity_required' => 'float',
        'expires_at' => 'datetime',
        'is_flagged_for_review' => 'boolean',
        'flagged_at' => 'datetime',
        'last_audited_at' => 'datetime',
    ];

    public function auditor()
    {
        return $this->belongsTo(User::class, 'audited_by');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function allocations()
    {
        return $this->hasMany(Allocation::class);
    }

    public function assignedSupplier()
    {
        return $this->belongsTo(User::class, 'assigned_supplier_id');
    }

    /**
     * Get all contributions for this request
     */
    public function contributions()
    {
        return $this->hasMany(Contribution::class);
    }

    /**
     * Get committed contributions only
     */
    public function committedContributions()
    {
        return $this->hasMany(Contribution::class)->where('status', 'committed');
    }

    /**
     * Calculate total funded percentage (capped at 100%)
     */
    public function getTotalFundedPercentageAttribute(): int
    {
        return (int) \App\Helpers\FormatHelper::capPercent($this->committedContributions()->sum('percentage'));
    }

    /**
     * Calculate remaining percentage (capped, never negative)
     */
    public function getRemainingPercentageAttribute(): int
    {
        return (int) max(0, 100 - $this->total_funded_percentage);
    }

    public function getResponseTimeAttribute(): string
    {
        return match($this->urgency_level) {
            'critical' => '< 6 hours',
            'high' => '< 24 hours',
            'medium' => '< 72 hours',
            'low' => '> 72 hours',
            default => '> 72 hours',
        };
    }

    /**
     * Scope to exclude expired requests (past their valid lifecycle)
     */
    public function scopeNotExpired($query)
    {
        return $query->where(function ($q) {
            $q->whereNull('expires_at')->orWhere('expires_at', '>', now());
        });
    }

    /**
     * Scope to only include expired requests
     */
    public function scopeExpired($query)
    {
        return $query->whereNotNull('expires_at')->where('expires_at', '<=', now());
    }

    public function isExpired(): bool
    {
        return $this->expires_at && $this->expires_at->isPast();
    }
}

