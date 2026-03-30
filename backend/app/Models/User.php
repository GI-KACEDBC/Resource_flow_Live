<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    /** Staff roles that Super Admin can create */
    public const ROLE_AUDITOR = 'auditor';

    public const ROLE_FIELD_AGENT = 'field_agent';

    public const ROLE_DRIVER = 'driver';

    public const ROLE_SUPERVISOR = 'supervisor';

    public const ROLE_SPECIAL = 'special';

    public const STAFF_ROLES = [
        self::ROLE_AUDITOR,
        self::ROLE_FIELD_AGENT,
        self::ROLE_DRIVER,
        self::ROLE_SUPERVISOR,
        self::ROLE_SPECIAL,
    ];

    /** Roles that Super Admin can create (Admin + Staff). Admin has no user creation access. */
    public const MANAGED_ROLES = ['admin', ...self::STAFF_ROLES];

    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'donor_type',
        'assessable_annual_income',
        'kyc_details_submitted',
        'organization',
        'address',
        'phone',
        'ghana_card',
        'is_active',
        'is_verified',
        'is_blocked',
        'verified_at',
        'reputation_score',
        'verification_status',
        'verified_by',
        'password_changed_at',
        'permissions',
        'custom_role_name',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
        'is_active' => 'boolean',
        'is_verified' => 'boolean',
        'is_blocked' => 'boolean',
        'verified_at' => 'datetime',
        'password_changed_at' => 'datetime',
        'reputation_score' => 'integer',
        'verified_by' => 'integer',
        'permissions' => 'array',
        'assessable_annual_income' => 'decimal:2',
        'kyc_details_submitted' => 'boolean',
    ];

    /** Password expires after 30 days. */
    private const PASSWORD_EXPIRY_DAYS = 30;

    public function isPasswordExpired(): bool
    {
        $changedAt = $this->password_changed_at ?? $this->created_at;
        if (! $changedAt) {
            return true;
        }

        return $changedAt->addDays(self::PASSWORD_EXPIRY_DAYS)->isPast();
    }

    public function requests()
    {
        return $this->hasMany(Request::class);
    }

    public function donations()
    {
        return $this->hasMany(Donation::class);
    }

    public function vulnerabilityScore()
    {
        return $this->hasOne(VulnerabilityScore::class);
    }

    public function verificationDocuments()
    {
        return $this->hasMany(VerificationDocument::class);
    }

    public function allocations()
    {
        return $this->hasMany(Allocation::class, 'allocated_by');
    }

    public function deliveryRoutes()
    {
        return $this->hasMany(DeliveryRoute::class, 'driver_id');
    }

    public function auditTrails()
    {
        return $this->hasMany(AuditTrail::class);
    }

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    /** Dedicated finance role (reserved for future policy expansion). */
    public function isFinance(): bool
    {
        return $this->role === 'finance';
    }

    /** Whether this user may list all financial rows (Super Admin only). */
    public function canListAllFinancialRecords(): bool
    {
        return $this->isSuperAdmin();
    }

    /** Super Admin is the single account that can create Admin and Staff users. */
    public function isSuperAdmin(): bool
    {
        return $this->email === config('app.super_admin_email', 'superadmin@resourceflow.com');
    }

    public function isRequestor(): bool
    {
        return $this->role === 'requestor';
    }

    /** NGO: receives assistance from Donor/Institutions, creates projects, uploads fundable projects */
    public function isNGO(): bool
    {
        return $this->role === 'ngo';
    }

    /** Donor/Institution: Corporate donors who fund NGOs */
    public function isDonorInstitution(): bool
    {
        return $this->role === 'donor_institution';
    }

    /** Donor/Individual: individual donors */
    public function isDonorIndividual(): bool
    {
        return $this->role === 'donor_individual';
    }

    /** Angel Donor: no ID verification, donations capped at GHS 5000 */
    public function isAngelDonor(): bool
    {
        return $this->role === 'angel_donor';
    }

    /** Any donor type (institution, individual, or angel) - can donate */
    public function isDonor(): bool
    {
        return $this->isDonorInstitution() || $this->isDonorIndividual() || $this->isAngelDonor();
    }

    /** Can donate/claim - all donor types */
    public function isSupplier(): bool
    {
        return $this->isDonorInstitution() || $this->isDonorIndividual() || $this->isAngelDonor();
    }

    public function isAuditor(): bool
    {
        return $this->role === 'auditor';
    }

    /** Corporate donor (Donor/Institution) */
    public function isCorporate(): bool
    {
        return $this->role === 'donor_institution';
    }

    public function isFieldAgent(): bool
    {
        return $this->role === 'field_agent';
    }

    public function isDistributor(): bool
    {
        return $this->role === 'distributor';
    }

    public function isDriver(): bool
    {
        return $this->role === 'driver';
    }

    public function isSupervisor(): bool
    {
        return $this->role === 'supervisor';
    }

    public function isSpecial(): bool
    {
        return $this->role === 'special';
    }

    /** Check if user has a permission (for special/custom roles) */
    public function hasPermission(string $permission): bool
    {
        if ($this->isAdmin()) {
            return true;
        }
        $permissions = $this->permissions ?? [];

        return is_array($permissions) && in_array($permission, $permissions);
    }

    /** Get display role name (for special: custom_role_name or "Special") */
    public function getDisplayRoleAttribute(): string
    {
        if ($this->role === 'special' && $this->custom_role_name) {
            return $this->custom_role_name;
        }
        $labels = [
            'ngo' => 'NGO',
            'donor_institution' => 'Donor (Institution)',
            'donor_individual' => 'Donor (Individual)',
            'angel_donor' => 'Angel Donor',
        ];

        return $labels[$this->role ?? ''] ?? ucfirst(str_replace('_', ' ', $this->role ?? ''));
    }

    // New relationships for CSR Matchmaking (NGO creates projects, donor_institution funds them)
    public function projects()
    {
        return $this->hasMany(Project::class, 'ngo_id');
    }

    public function organization()
    {
        return $this->hasOne(Organization::class);
    }

    public function csrPartnershipsAsCorporate()
    {
        return $this->hasMany(CSRPartnership::class, 'corporate_id');
    }

    public function csrPartnershipsAsNGO()
    {
        return $this->hasMany(CSRPartnership::class, 'ngo_id');
    }

    public function supplierInventory()
    {
        return $this->hasMany(SupplierInventory::class, 'supplier_id');
    }

    /** Can this user create projects / CSR partnerships? (NGO only) */
    public function canCreateProjects(): bool
    {
        return $this->isNGO();
    }

    public function impactProofs()
    {
        return $this->hasMany(ImpactProof::class, 'field_agent_id');
    }

    public function verifier()
    {
        return $this->belongsTo(User::class, 'verified_by');
    }

    public function verifiedUsers()
    {
        return $this->hasMany(User::class, 'verified_by');
    }
}
