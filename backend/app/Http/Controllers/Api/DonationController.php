<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\DonationResource;
use App\Models\Donation;
use App\Models\Request as AidRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class DonationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Donation::query()->forUser($request->user())
            ->with(['user', 'warehouse', 'auditor', 'aidRequest']);

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        if ($request->has('warehouse_id')) {
            $query->where('warehouse_id', $request->warehouse_id);
        }

        if ($request->has('aid_request_id')) {
            $query->where('aid_request_id', $request->aid_request_id);
        }

        $donations = $query->orderBy('created_at', 'desc')->get();
        return response()->json(DonationResource::collection($donations));
    }

    public function show(Donation $donation): JsonResponse
    {
        $this->authorize('view', $donation);
        $donation->load(['user', 'warehouse', 'auditor']);
        return response()->json(new DonationResource($donation));
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', Donation::class);
        $validated = $request->validate([
            'type' => 'required|in:Goods,Monetary,Services',
            'item' => 'required|string|max:255',
            'quantity' => 'required|numeric|min:0.01',
            'unit' => 'required|string|max:50',
            'description' => 'nullable|string',
            'warehouse_id' => 'nullable|exists:warehouses,id',
            'colocation_facility' => 'nullable|string|max:255',
            'colocation_sub_location' => 'nullable|string|max:255',
            'expiry_date' => 'nullable|date',
            'aid_request_id' => 'nullable|exists:requests,id',
        ]);

        $supplier = $request->user();
        $validated['user_id'] = $supplier->id;
        $validated['remaining_quantity'] = $validated['quantity'];

        // Identity Conflict Guard: Block if Account ID, Phone, or Ghana Card match (self-dealing)
        if (!empty($validated['aid_request_id'])) {
            $aidRequest = AidRequest::with('user')->findOrFail($validated['aid_request_id']);
            $recipient = $aidRequest->user;

            // 1. Account ID check - same user cannot donate to own request
            if ($recipient && $recipient->id === $supplier->id) {
                return response()->json([
                    'message' => 'Conflict of Interest. You cannot donate to your own request.',
                ], 403);
            }

            // 2. Phone / Ghana Card match - prevent self-dealing across accounts
            if ($recipient && $this->identityMatches($supplier, $recipient)) {
                return response()->json([
                    'message' => 'Conflict of Interest. Identity match detected (phone or Ghana Card). You cannot donate to your own request.',
                ], 403);
            }

            // Request must be approved for targeted donation
            if ($aidRequest->status !== 'approved') {
                return response()->json([
                    'message' => 'Target request must be approved before creating a targeted donation.',
                ], 422);
            }

            // Targeted donations: Verified immediately so they appear in Resource Allocation (except Monetary - verified after payment)
            $validated['status'] = ($validated['type'] === 'Monetary') ? 'Pending' : 'Verified';
        } else {
            $validated['status'] = 'Pending';
        }

        // For Monetary donations: Initialize Paystack and return authorization_url for redirect
        if ($validated['type'] === 'Monetary') {
            return $this->handleMonetaryDonation($request, $validated, $supplier);
        }

        $donation = Donation::create($validated);
        $donation->load(['user', 'warehouse', 'aidRequest']);
        return response()->json(new DonationResource($donation), 201);
    }

    /**
     * Handle Monetary donation: Create donation record, call Paystack Initialize API,
     * return authorization_url so frontend can redirect user to Paystack payment screen.
     */
    private function handleMonetaryDonation(Request $request, array $validated, User $supplier): JsonResponse
    {
        $donation = Donation::create($validated);

        $paystackSecretKey = config('services.paystack.secret_key');
        if (!$paystackSecretKey) {
            Log::warning('Paystack secret key not configured');
            return response()->json([
                'message' => 'Payment service not configured. Please contact support.',
                'donation' => new DonationResource($donation->load(['user', 'warehouse', 'aidRequest'])),
            ], 500);
        }

        // Amount in pesewas (GHS subunit: 1 GHS = 100 pesewas)
        $amountInPesewas = (int) round($validated['quantity'] * 100);
        if ($amountInPesewas < 10) {
            return response()->json([
                'message' => 'Minimum amount is GH₵0.10.',
            ], 422);
        }

        $metadata = [
            'user_id' => $supplier->id,
            'donation_id' => $donation->id,
            'type' => 'Donation',
            'description' => $validated['item'] . ' - ' . ($validated['description'] ?? 'Monetary donation'),
        ];
        if (!empty($validated['aid_request_id'])) {
            $metadata['aid_request_id'] = $validated['aid_request_id'];
        }

        $callbackUrl = config('app.frontend_url', config('app.url')) . '/dashboard?payment=success';
        $paystackResponse = Http::withHeaders([
            'Authorization' => 'Bearer ' . $paystackSecretKey,
            'Content-Type' => 'application/json',
        ])->post('https://api.paystack.co/transaction/initialize', [
            'email' => $supplier->email,
            'amount' => $amountInPesewas,
            'currency' => 'GHS',
            'callback_url' => $callbackUrl,
            'metadata' => $metadata,
        ]);

        $paystackData = $paystackResponse->json();

        if (!$paystackResponse->successful() || !($paystackData['status'] ?? false)) {
            Log::error('Paystack Initialize failed', [
                'response' => $paystackData,
                'donation_id' => $donation->id,
            ]);
            return response()->json([
                'message' => $paystackData['message'] ?? 'Failed to initialize payment. Please try again.',
            ], 502);
        }

        $authorizationUrl = $paystackData['data']['authorization_url'] ?? null;
        if (!$authorizationUrl) {
            return response()->json([
                'message' => 'Payment initialization failed. No redirect URL received.',
            ], 502);
        }

        return response()->json([
            'message' => 'Redirect to Paystack to complete payment.',
            'authorization_url' => $authorizationUrl,
            'donation' => new DonationResource($donation->load(['user', 'warehouse', 'aidRequest'])),
            'reference' => $paystackData['data']['reference'] ?? null,
        ], 200);
    }

    /**
     * Identity match check: Phone and/or Ghana Card match indicates same person (self-dealing).
     */
    private function identityMatches(User $supplier, User $recipient): bool
    {
        $phoneMatch = !empty($supplier->phone) && !empty($recipient->phone)
            && preg_replace('/\D/', '', $supplier->phone) === preg_replace('/\D/', '', $recipient->phone);
        $ghanaCardMatch = !empty($supplier->ghana_card) && !empty($recipient->ghana_card)
            && trim($supplier->ghana_card) === trim($recipient->ghana_card);
        return $phoneMatch || $ghanaCardMatch;
    }

    public function update(Request $request, Donation $donation): JsonResponse
    {
        $this->authorize('update', $donation);
        $validated = $request->validate([
            'status' => 'sometimes|in:Pending,Verified,Allocated,Delivered,Rejected',
            'warehouse_id' => 'nullable|exists:warehouses,id',
            'colocation_facility' => 'nullable|string|max:255',
            'colocation_sub_location' => 'nullable|string|max:255',
            'description' => 'nullable|string',
        ]);

        $donation->update($validated);
        $donation->load(['user', 'warehouse', 'auditor']);
        return response()->json(new DonationResource($donation));
    }

    /**
     * Lock price - Called by auditor to finalize donation value. Requires Auditor approval.
     */
    public function lockPrice(Request $request, Donation $donation): JsonResponse
    {
        $this->authorize('lockPrice', $donation);
        $validated = $request->validate([
            'audited_price' => 'required|numeric|min:0',
            'auditor_notes' => 'nullable|string',
        ]);

        $donation->update([
            'audited_price' => $validated['audited_price'],
            'price_status' => 'Locked',
            'audited_by' => $request->user()->id,
            'audited_at' => now(),
            'locked_at' => now(),
            'locked_by' => $request->user()->name,
            // Transition status from Pending to Verified when price is locked
            'status' => 'Verified',
        ]);

        $donation->load(['user', 'warehouse', 'auditor']);
        return response()->json(new DonationResource($donation));
    }

    /**
     * Assign warehouse - Called by admin to assign donation to warehouse. Requires Admin approval.
     */
    public function assignWarehouse(Request $request, Donation $donation): JsonResponse
    {
        $this->authorize('assignWarehouse', $donation);
        $validated = $request->validate([
            'warehouse_id' => 'required|exists:warehouses,id',
            'colocation_facility' => 'nullable|string|max:255',
            'colocation_sub_location' => 'nullable|string|max:255',
        ]);

        // Fix #4: Validate warehouse capacity
        $warehouse = \App\Models\Warehouse::findOrFail($validated['warehouse_id']);
        
        // Calculate current usage
        $currentUsage = Donation::where('warehouse_id', $warehouse->id)
            ->where('status', '!=', 'Delivered')
            ->sum('quantity');

        if ($currentUsage + $donation->quantity > $warehouse->capacity) {
            return response()->json([
                'message' => "Warehouse capacity exceeded. Available: " . ($warehouse->capacity - $currentUsage) . " {$donation->unit}"
            ], 422);
        }

        $donation->update([
            'warehouse_id' => $validated['warehouse_id'],
            'colocation_facility' => $validated['colocation_facility'] ?? null,
            'colocation_sub_location' => $validated['colocation_sub_location'] ?? null,
        ]);

        $donation->load(['user', 'warehouse', 'auditor']);
        return response()->json(new DonationResource($donation));
    }
}
