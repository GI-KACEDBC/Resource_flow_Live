<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\UrgencyController;
use App\Http\Controllers\Api\RequestController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\WarehouseController;
use App\Http\Controllers\Api\VulnerabilityScoreController;
use App\Http\Controllers\Api\AllocationController;
use App\Http\Controllers\Api\DeliveryRouteController;
use App\Http\Controllers\Api\LogisticController;
use App\Http\Controllers\Api\VerificationDocumentController;
use App\Http\Controllers\Api\FinancialController;
use App\Http\Controllers\Api\AuditTrailController;
use App\Http\Controllers\Api\DonationController;
use App\Http\Controllers\Api\ContributionController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\FileUploadController;
use App\Http\Controllers\Api\MatchmakingController;
use App\Http\Controllers\Api\ImpactDashboardController;
use App\Http\Controllers\Api\ProjectController;
use App\Http\Controllers\Api\CSRPartnershipController;
use App\Http\Controllers\Api\NGOVerificationController;
use App\Http\Controllers\Api\ImpactProofController;
use App\Http\Controllers\Api\MapController;
use App\Http\Controllers\Api\GhanaCardVerificationController;
use App\Http\Controllers\Api\UserManagementController;
use App\Http\Controllers\Api\UserController;

// Public routes
Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/auth/change-expired-password', [AuthController::class, 'changeExpiredPassword']);

// Test route (remove in production)
Route::get('/test/users', [\App\Http\Controllers\Api\TestController::class, 'checkUsers']);

Route::prefix('urgency')->group(function () {
    Route::post('/calculate', [UrgencyController::class, 'calculate']);
    Route::get('/formula', [UrgencyController::class, 'getFormula']);
    Route::get('/scenarios', [UrgencyController::class, 'getDemoScenarios']);
    Route::get('/factors', [UrgencyController::class, 'getFactorDefinitions']);
});

// Ghana Card verification (public for Register; works with or without auth for consent logging)
Route::middleware('throttle:10,1')->post('/verify-ghana-card', [GhanaCardVerificationController::class, 'verify']);

// Protected routes
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
});

Route::middleware(['auth:sanctum', 'password.expired'])->group(function () {
    Route::get('/auth/me', [AuthController::class, 'me']);

    // Users - admin dashboard (list users for stats: recipients, pending verification)
    Route::get('/users', [UserController::class, 'index']);
    Route::get('/users/{user}', [UserController::class, 'show']);
    Route::put('/users/{user}', [UserController::class, 'update']);
    Route::post('/auth/change-password', [AuthController::class, 'changePassword']);
    
    // Requests - define literal paths BEFORE apiResource so they are not matched as {id}
    Route::get('/requests/available', [RequestController::class, 'getAvailableRequests']);
    Route::get('/supplier/available-requests', [RequestController::class, 'getAvailableRequests']); // Alias to avoid route conflict
    Route::get('/requests/map-data', [MapController::class, 'getMapData']);
    Route::get('/requests/flagged', [RequestController::class, 'getFlagged']);
    Route::post('/requests/batch-update-status', [RequestController::class, 'batchUpdateStatus']);
    Route::post('/requests', [RequestController::class, 'store'])->middleware('verified.user');
    Route::post('/requests/{id}/approve', [RequestController::class, 'approve']); // Admin2 approval
    Route::post('/requests/{id}/audit', [RequestController::class, 'audit']); // Admin audit gate (documents + approve)
    Route::post('/requests/{id}/claim', [RequestController::class, 'claim']); // Supplier claim
    Route::post('/requests/{id}/recede', [RequestController::class, 'requestRecede']); // Supplier recede request
    Route::post('/requests/{id}/approve-recede', [RequestController::class, 'approveRecede']); // Admin2 approve recede
    Route::post('/requests/{id}/complete', [RequestController::class, 'complete']); // Mark as completed
    // Requests index/show/update/destroy: allow unverified recipients to view their dashboard
    // Only store (create) requires verification - enforced on POST /requests above
    Route::get('/requests', [RequestController::class, 'index']);
    Route::get('/requests/{id}', [RequestController::class, 'show']);
    Route::put('/requests/{id}', [RequestController::class, 'update']);
    Route::delete('/requests/{id}', [RequestController::class, 'destroy']);
    
    // Contributions (Partial Funding)
    Route::apiResource('contributions', ContributionController::class);
    Route::get('/contributions/request/{requestId}/stats', [ContributionController::class, 'getRequestStats']); // Get contribution stats for a request
    
    // Warehouses
    Route::apiResource('warehouses', WarehouseController::class);
    
    // Vulnerability Scores
    Route::apiResource('vulnerability-scores', VulnerabilityScoreController::class);
    Route::get('/vulnerability-scores/user/{userId}', [VulnerabilityScoreController::class, 'getByUser']);
    Route::get('/vulnerability-scores/priority-list', [VulnerabilityScoreController::class, 'getPriorityList']);
    
    // Allocations - define literal path BEFORE apiResource so it is not matched as {id}
    Route::get('/allocations/prioritized-requests', [AllocationController::class, 'getPrioritizedRequests']);
    Route::apiResource('allocations', AllocationController::class);
    
    // Delivery Routes
    Route::apiResource('delivery-routes', DeliveryRouteController::class);
    
    // Logistics
    Route::apiResource('logistics', LogisticController::class);
    Route::get('/logistics/track/{trackingNumber}', [LogisticController::class, 'track']);
    Route::post('/logistics/{logistic}/update-location', [LogisticController::class, 'updateLocation']);
    Route::post('/logistics/{logistic}/complete-delivery', [LogisticController::class, 'completeDelivery']);
    
    // Verification Documents
    Route::apiResource('verification-documents', VerificationDocumentController::class);
    Route::post('/verification-documents/{verificationDocument}/verify', [VerificationDocumentController::class, 'verify']);
    Route::get('/verification-documents/{verificationDocument}/download', [VerificationDocumentController::class, 'download']);
    
    // Donations - requires verification for creation
    Route::get('/donations', [DonationController::class, 'index']);
    Route::get('/donations/{donation}', [DonationController::class, 'show']);
    Route::post('/donations', [DonationController::class, 'store'])->middleware('verified.user');
    Route::put('/donations/{donation}', [DonationController::class, 'update']);
    Route::put('/donations/{donation}/lock-price', [DonationController::class, 'lockPrice']);
    Route::put('/donations/{donation}/assign-warehouse', [DonationController::class, 'assignWarehouse']);
    
    // Financials - statistics must be before apiResource so /statistics isn't matched as {id}
    Route::get('/financials/statistics', [FinancialController::class, 'getStatistics']);
    Route::apiResource('financials', FinancialController::class);
    
    // Audit Trails
    Route::apiResource('audit-trails', AuditTrailController::class);
    Route::get('/audit-trails/model/{modelType}/{modelId}', [AuditTrailController::class, 'getByModel']);
    
    // Payments
    Route::post('/payments/verify', [PaymentController::class, 'verifyPayment']);
    
    // File Uploads - with rate limiting
    Route::middleware('throttle:uploads')->post('/files/upload', [FileUploadController::class, 'upload']);
    Route::middleware('throttle:uploads-multiple')->post('/files/upload-multiple', [FileUploadController::class, 'uploadMultiple']);
    
    // CSR Matchmaking & Impact Tracking
    Route::prefix('matchmaking')->group(function () {
        Route::get('/matches', [MatchmakingController::class, 'getMatches']);
        Route::get('/project/{projectId}/matches', [MatchmakingController::class, 'getProjectMatches']);
    });
    
    // Impact Dashboard (Corporate)
    Route::prefix('impact')->group(function () {
        Route::get('/dashboard', [ImpactDashboardController::class, 'getImpactData']);
    });
    
    // Projects (NGO, Corporate)
    Route::apiResource('projects', ProjectController::class);
    
    // CSR Partnerships
    Route::apiResource('csr-partnerships', CSRPartnershipController::class);
    
    // NGO Verification (Auditor)
    Route::prefix('ngo-verification')->group(function () {
        Route::get('/', [NGOVerificationController::class, 'index']);
        Route::get('/{ngoId}', [NGOVerificationController::class, 'show']);
        Route::post('/{ngoId}/verify', [NGOVerificationController::class, 'verify']);
    });

    // User Management (Super Admin only - Auditor, Field Agent, Driver, Supervisor, Special)
    Route::prefix('user-management')->group(function () {
        Route::get('/', [UserManagementController::class, 'index']);
        Route::get('/permissions', [UserManagementController::class, 'permissionsConfig']);
        Route::post('/', [UserManagementController::class, 'store']);
        Route::post('/{user}/reactivate', [UserManagementController::class, 'reactivate']);
        Route::get('/{user}', [UserManagementController::class, 'show']);
        Route::put('/{user}', [UserManagementController::class, 'update']);
        Route::delete('/{user}', [UserManagementController::class, 'destroy']);
    });

    // Impact Proofs (Field Agent)
    Route::apiResource('impact-proofs', ImpactProofController::class);
    Route::get('/impact-proofs/active-projects', [ImpactProofController::class, 'getActiveProjects']);
    Route::post('/impact-proofs/{impactProof}/verify', [ImpactProofController::class, 'verify']); // Auditor verify
    Route::get('/impact-proofs/{impactProof}/download', [ImpactProofController::class, 'download']);
});

// Public payment webhook (no auth required for Paystack)
Route::post('/payments/paystack-webhook', [PaymentController::class, 'paystackWebhook']);
