<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\Request as AidRequest;

class Donation extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'donor_type',
        'is_anonymous',
        'compliance_agreed',
        'aid_request_id',
        'type',
        'item',
        'quantity',
        'remaining_quantity',
        'unit',
        'description',
        'status',
        'paystack_reference',
        'date_received',
        'receipt_confirmed_at',
        'receipt_confirmed_by',
        'warehouse_id',
        'colocation_facility',
        'colocation_sub_location',
        'value',
        'market_price',
        'price_status',
        'audited_price',
        'auditor_notes',
        'audited_by',
        'locked_at',
        'expiry_date',
    ];

    protected $casts = [
        'quantity' => 'decimal:2',
        'remaining_quantity' => 'decimal:2',
        'value' => 'decimal:2',
        'market_price' => 'decimal:2',
        'audited_price' => 'decimal:2',
        'date_received' => 'date',
        'receipt_confirmed_at' => 'datetime',
        'expiry_date' => 'date',
        'locked_at' => 'datetime',
        'is_anonymous' => 'boolean',
        'compliance_agreed' => 'boolean',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function aidRequest()
    {
        return $this->belongsTo(AidRequest::class, 'aid_request_id');
    }

    public function warehouse()
    {
        return $this->belongsTo(Warehouse::class);
    }

    public function auditor()
    {
        return $this->belongsTo(User::class, 'audited_by');
    }

    public function receiptConfirmedBy()
    {
        return $this->belongsTo(User::class, 'receipt_confirmed_by');
    }

    public function allocations()
    {
        return $this->hasMany(Allocation::class);
    }

    public function isExpired(): bool
    {
        if (!$this->expiry_date) {
            return false;
        }
        return $this->expiry_date->isPast();
    }

    public function isAvailable(): bool
    {
        return $this->status === 'Verified' && !$this->isExpired();
    }

    /**
     * Scope queries by authenticated user role
     */
    public function scopeForUser($query, $user)
    {
        if (!$user) {
            return $query->whereRaw('1 = 0');
        }
        if ($user->isAdmin() || $user->isAuditor()) {
            return $query;
        }
        if ($user->isSupplier() || $user->isDonor()) {
            return $query->where('user_id', $user->id);
        }
        return $query->where('user_id', $user->id);
    }
}
