<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ItemClaim extends Model
{
    use HasFactory;

    protected $fillable = [
        'project_id',
        'project_item_id',
        'supplier_inventory_id',
        'ngo_id',
        'quantity_claimed',
        'status',
        'notes',
        'approved_by',
        'approved_at',
    ];

    protected $casts = [
        'quantity_claimed' => 'integer',
        'approved_at' => 'datetime',
    ];

    // Relationships
    public function project()
    {
        return $this->belongsTo(Project::class);
    }

    public function projectItem()
    {
        return $this->belongsTo(ProjectItem::class);
    }

    public function supplierInventory()
    {
        return $this->belongsTo(SupplierInventory::class);
    }

    public function ngo()
    {
        return $this->belongsTo(User::class, 'ngo_id');
    }

    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}
