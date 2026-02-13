<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Available Permissions
    |--------------------------------------------------------------------------
    | All permissions that can be assigned to staff accounts.
    */
    'available' => [
        'valuation.view' => ['label' => 'View Valuation Queue', 'group' => 'valuation'],
        'valuation.lock' => ['label' => 'Lock Prices', 'group' => 'valuation'],
        'valuation.override' => ['label' => 'Override Prices', 'group' => 'valuation'],
        'ngo_verification.view' => ['label' => 'View NGO Verification', 'group' => 'audit'],
        'ngo_verification.verify' => ['label' => 'Verify NGOs', 'group' => 'audit'],
        'monetary_transfers.view' => ['label' => 'View Monetary Transfers', 'group' => 'audit'],
        'audit_logs.view' => ['label' => 'View Audit Logs', 'group' => 'audit'],
        'impact_proofs.upload' => ['label' => 'Upload Project Photos', 'group' => 'field'],
        'impact_proofs.view' => ['label' => 'View Impact Proofs', 'group' => 'field'],
        'logistics.view' => ['label' => 'View Logistics', 'group' => 'logistics'],
        'logistics.update' => ['label' => 'Update Delivery Status', 'group' => 'logistics'],
        'delivery_routes.view' => ['label' => 'View Delivery Routes', 'group' => 'logistics'],
        'delivery_routes.assign' => ['label' => 'Assign Routes', 'group' => 'logistics'],
        'team_management.view' => ['label' => 'View Team', 'group' => 'supervision'],
        'team_management.assign' => ['label' => 'Assign Team Members', 'group' => 'supervision'],
    ],

    /*
    |--------------------------------------------------------------------------
    | Default Permissions by Role
    |--------------------------------------------------------------------------
    */
    'role_defaults' => [
        'auditor' => [
            'valuation.view', 'valuation.lock', 'valuation.override',
            'ngo_verification.view', 'ngo_verification.verify',
            'monetary_transfers.view', 'audit_logs.view',
        ],
        'field_agent' => [
            'impact_proofs.upload', 'impact_proofs.view',
        ],
        'driver' => [
            'logistics.view', 'logistics.update',
            'delivery_routes.view',
        ],
        'supervisor' => [
            'logistics.view', 'delivery_routes.view', 'delivery_routes.assign',
            'team_management.view', 'team_management.assign',
        ],
        'special' => [], // Custom - selected by admin
    ],
];
