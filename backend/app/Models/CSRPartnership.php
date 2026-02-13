<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CSRPartnership extends Model
{
    use HasFactory;

    protected $fillable = [
        'corporate_id',
        'ngo_id',
        'project_id',
        'funding_amount',
        'funding_type',
        'milestones',
        'status',
        'agreement_terms',
        'impact_report',
        'funding_date',
        'completion_date',
    ];

    protected $casts = [
        'milestones' => 'array',
        'impact_report' => 'array',
        'funding_amount' => 'decimal:2',
        'funding_date' => 'datetime',
        'completion_date' => 'datetime',
    ];

    // Relationships
    public function corporate()
    {
        return $this->belongsTo(User::class, 'corporate_id');
    }

    public function ngo()
    {
        return $this->belongsTo(User::class, 'ngo_id');
    }

    public function project()
    {
        return $this->belongsTo(Project::class);
    }
}
