<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class VerificationDocument extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'document_type',
        'document_number',
        'file_path',
        'file_name',
        'mime_type',
        'file_size',
        'verification_status',
        'verified_by',
        'verified_at',
        'rejection_reason',
        'notes',
        'qoreid_request_id',
        'qoreid_verified_at',
        'qoreid_photo',
        'requester_submitted_at',
        'field_agent_verified_at',
        'admin_reviewed_at',
        'supplier_uploaded_at',
    ];

    protected $casts = [
        'verified_at' => 'datetime',
        'qoreid_verified_at' => 'datetime',
        'requester_submitted_at' => 'datetime',
        'field_agent_verified_at' => 'datetime',
        'admin_reviewed_at' => 'datetime',
        'supplier_uploaded_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function verifier()
    {
        return $this->belongsTo(User::class, 'verified_by');
    }
}
