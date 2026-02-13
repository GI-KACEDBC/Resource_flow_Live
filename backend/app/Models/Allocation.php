<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Allocation extends Model
{
    use HasFactory;

    protected $fillable = [
        'request_id',
        'donation_id',
        'allocated_by',
        'quantity_allocated',
        'status',
        'notes',
        'allocated_date',
        'expected_delivery_date',
        'actual_delivery_date',
    ];

    protected $casts = [
        'quantity_allocated' => 'decimal:2',
        'allocated_date' => 'date',
        'expected_delivery_date' => 'date',
        'actual_delivery_date' => 'date',
    ];

    public function request()
    {
        return $this->belongsTo(Request::class);
    }

    public function donation()
    {
        return $this->belongsTo(Donation::class);
    }

    public function allocator()
    {
        return $this->belongsTo(User::class, 'allocated_by');
    }

    public function logistics()
    {
        return $this->hasOne(Logistic::class);
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
        if ($user->isSupplier()) {
            return $query->whereHas('donation', fn ($q) => $q->where('user_id', $user->id));
        }
        if ($user->isRequestor() || $user->role === 'recipient') {
            return $query->whereHas('request', fn ($q) => $q->where('user_id', $user->id));
        }
        return $query->where('allocated_by', $user->id);
    }
}
