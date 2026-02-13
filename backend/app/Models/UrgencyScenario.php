<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class UrgencyScenario extends Model
{
    use HasFactory;

    protected $fillable = [
        'slug',
        'name',
        'description',
        'factors',
    ];

    protected $casts = [
        'factors' => 'array',
    ];
}
