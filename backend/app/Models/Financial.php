<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Financial extends Model
{
    use HasFactory;

    protected $fillable = [
        'transaction_type',
        'user_id',
        'donation_id',
        'allocation_id',
        'amount',
        'currency',
        'payment_reference',
        'payment_method',
        'status',
        'description',
        'transaction_date',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'transaction_date' => 'date',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function donation()
    {
        return $this->belongsTo(Donation::class);
    }

    public function allocation()
    {
        return $this->belongsTo(Allocation::class);
    }
}
