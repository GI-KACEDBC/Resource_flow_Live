<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Financial;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PaymentController extends Controller
{
    /**
     * Verify payment with Paystack and create financial record
     */
    public function verifyPayment(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'reference' => 'required|string',
            'amount' => 'required|numeric|min:0',
            'type' => 'required|in:Donation,Project Funding,General Support',
            'donation_id' => 'nullable|exists:donations,id',
            'allocation_id' => 'nullable|exists:allocations,id',
            'description' => 'nullable|string',
        ]);

        try {
            $paystackSecretKey = config('services.paystack.secret_key');
            
            if (!$paystackSecretKey) {
                Log::warning('Paystack secret key not configured');
                return response()->json(['message' => 'Payment verification service not configured.'], 500);
            }

            $paystackResponse = Http::withHeaders([
                'Authorization' => 'Bearer ' . $paystackSecretKey,
            ])->get("https://api.paystack.co/transaction/verify/{$validated['reference']}");

            $paystackData = $paystackResponse->json();

            if ($paystackResponse->successful() && ($paystackData['status'] ?? false)) {
                $transactionData = $paystackData['data'];

                if ($transactionData['status'] === 'success') {
                    $financial = Financial::firstOrCreate(
                        ['payment_reference' => $validated['reference']],
                        [
                            'user_id' => $request->user()->id,
                            'transaction_type' => $validated['type'],
                            'amount' => $validated['amount'],
                            'currency' => 'GHS',
                            'payment_method' => 'paystack',
                            'status' => 'Completed',
                            'description' => $validated['description'] ?? "Payment via Paystack: {$validated['reference']}",
                            'transaction_date' => now(),
                            'donation_id' => $validated['donation_id'] ?? null,
                            'allocation_id' => $validated['allocation_id'] ?? null,
                        ]
                    );

                    return response()->json([
                        'message' => 'Payment verified and recorded successfully',
                        'financial' => $financial,
                    ]);
                }
            }
            return response()->json(['message' => 'Payment verification failed.'], 400);
        } catch (\Exception $e) {
            Log::error('Payment verification error', ['error' => $e->getMessage()]);
            return response()->json(['message' => 'Verification failed. Please contact support.'], 500);
        }
    }

    /**
     * Paystack webhook handler
     * Addresses BRD Concern: Webhook signature verification 
     */ 
    public function paystackWebhook(Request $request): JsonResponse
    {
        // 1. Check for signature header [cite: 152]
        if (!$request->hasHeader('x-paystack-signature')) {
            return response()->json(['message' => 'Missing signature'], 400);
        }

        // 2. Compute and verify signature 
        $signingSecret = config('services.paystack.secret_key');
        $computedSignature = hash_hmac('sha512', $request->getContent(), $signingSecret);

        if ($request->header('x-paystack-signature') !== $computedSignature) {
            Log::error('Invalid Paystack Webhook Signature');
            return response()->json(['message' => 'Invalid signature'], 401);
        }

        $payload = $request->all();

        // 3. Handle successful charge event 
        if (($payload['event'] ?? null) === 'charge.success') {
            $data = $payload['data'];
            
            // Prevent duplicate records for the same reference 
            if (Financial::where('payment_reference', $data['reference'])->exists()) {
                return response()->json(['status' => 'duplicate ignored'], 200);
            }

            $metadata = $data['metadata'] ?? [];
            $donationId = $metadata['donation_id'] ?? null;

            Financial::create([
                'user_id' => $metadata['user_id'] ?? null,
                'transaction_type' => $metadata['type'] ?? 'Donation',
                'amount' => $data['amount'] / 100, // Convert pesewas to GHS
                'currency' => $data['currency'],
                'payment_reference' => $data['reference'],
                'payment_method' => 'paystack',
                'status' => 'Completed',
                'description' => "Webhook: " . ($metadata['description'] ?? 'Paystack payment'),
                'transaction_date' => now(),
                'donation_id' => $donationId,
            ]);

            // Mark Monetary donation as Verified when payment succeeds (for Resource Allocation)
            if ($donationId && ($metadata['type'] ?? '') === 'Donation') {
                $donation = \App\Models\Donation::find($donationId);
                if ($donation && $donation->type === 'Monetary' && $donation->status === 'Pending') {
                    $donation->update(['status' => 'Verified']);
                }
            }
        }

        return response()->json(['status' => 'success'], 200);
    }
}