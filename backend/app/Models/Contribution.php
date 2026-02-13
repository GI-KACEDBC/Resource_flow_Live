<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Contribution extends Model
{
    use HasFactory;

    protected $fillable = [
        'request_id',
        'supplier_id',
        'percentage',
        'amount_value',
        'status',
    ];

    protected $casts = [
        'percentage' => 'integer',
        'amount_value' => 'decimal:2',
    ];

    /**
     * Get the request that this contribution belongs to
     */
    public function request()
    {
        return $this->belongsTo(Request::class);
    }

    /**
     * Get the supplier who made this contribution
     */
    public function supplier()
    {
        return $this->belongsTo(User::class, 'supplier_id');
    }

    /**
     * Scope to get only committed contributions
     */
    public function scopeCommitted($query)
    {
        return $query->where('status', 'committed');
    }

    /**
     * Scope to get only pending contributions
     */
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }
}
