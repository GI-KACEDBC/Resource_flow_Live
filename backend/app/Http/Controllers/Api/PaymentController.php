<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Donation;
use App\Models\Financial;
use App\Models\Project;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PaymentController extends Controller
{
    /**
     * Verify payment with Paystack and create financial record.
     * Amount and currency are taken only from Paystack (not client-supplied).
     */
    public function verifyPayment(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'reference' => 'required|string',
            /** Optional client hint for diagnostics only; persisted amount comes from Paystack. */
            'amount' => 'nullable|numeric|min:0',
            'type' => 'required|in:Donation,Project Funding,General Support',
            'donation_id' => 'nullable|exists:donations,id',
            'allocation_id' => 'nullable|exists:allocations,id',
            'project_id' => 'required_if:type,Project Funding|nullable|exists:projects,id',
            'description' => 'nullable|string',
        ]);

        try {
            if (! config('services.paystack.secret_key')) {
                Log::warning('Paystack secret key not configured');

                return response()->json(['message' => 'Payment verification service not configured.'], 500);
            }

            $tx = $this->fetchSuccessfulPaystackTransaction($validated['reference']);
            if ($tx === null) {
                return response()->json(['message' => 'Payment verification failed.'], 400);
            }

            $amountGhs = $tx['amount_ghs'];
            $currency = $tx['currency'];

            if (isset($validated['amount']) && is_numeric($validated['amount'])) {
                $clientHint = (float) $validated['amount'];
                if (abs($clientHint - $amountGhs) > 0.02) {
                    Log::info('Paystack amount differs from client hint', [
                        'reference' => $validated['reference'],
                        'paystack_ghs' => $amountGhs,
                        'client_hint' => $clientHint,
                    ]);
                }
            }

            $donationId = $validated['donation_id'] ?? null;
            if ($donationId === null) {
                $byRef = Donation::where('paystack_reference', $validated['reference'])->first();
                if ($byRef) {
                    $donationId = $byRef->id;
                }
            }

            if ($donationId === null && $request->user() && $validated['type'] === 'Donation') {
                $matches = Donation::query()
                    ->where('user_id', $request->user()->id)
                    ->where('type', 'Monetary')
                    ->where('status', 'Pending')
                    ->whereBetween('quantity', [$amountGhs - 0.01, $amountGhs + 0.01])
                    ->get();
                if ($matches->count() === 1) {
                    $donationId = $matches->first()->id;
                }
            }

            $donation = null;
            if ($donationId !== null) {
                $donation = Donation::findOrFail($donationId);
                if ((int) $donation->user_id !== (int) $request->user()->id) {
                    return response()->json(['message' => 'Unauthorized donation reference.'], 403);
                }
                if ($donation->type === 'Monetary' && strtoupper($currency) === 'GHS' && ! $this->amountMatchesDonation($donation, $amountGhs)) {
                    return response()->json([
                        'message' => 'Paystack amount does not match this donation ('.number_format((float) $donation->quantity, 2).' GHS).',
                    ], 422);
                }
            }

            $ledgerUserId = $donation ? (int) $donation->user_id : (int) $request->user()->id;

            return DB::transaction(function () use ($validated, $amountGhs, $currency, $donationId, $donation, $ledgerUserId) {
                if ($validated['type'] === 'Project Funding') {
                    $project = Project::lockForUpdate()->findOrFail($validated['project_id']);
                    if (! $project->hasDualVerifiedFundingCeiling()) {
                        return response()->json([
                            'message' => 'Project funding is only allowed after an administrator and an auditor have verified the funding ceiling against project documents.',
                        ], 422);
                    }
                    if ($project->totalRaisedGhs() + $amountGhs > (float) $project->verified_ceiling_ghs + 0.02) {
                        return response()->json([
                            'message' => 'This payment would exceed the verified project funding ceiling (GH₵'.number_format((float) $project->verified_ceiling_ghs, 2).').',
                        ], 422);
                    }
                }

                $financial = Financial::firstOrCreate(
                    ['payment_reference' => $validated['reference']],
                    [
                        'user_id' => $ledgerUserId,
                        'transaction_type' => $validated['type'],
                        'amount' => $amountGhs,
                        'currency' => $currency,
                        'payment_method' => 'paystack',
                        'status' => 'Completed',
                        'description' => $validated['description'] ?? 'Payment via Paystack: '.$validated['reference'],
                        'transaction_date' => now(),
                        'donation_id' => $donationId,
                        'allocation_id' => $validated['allocation_id'] ?? null,
                        'project_id' => $validated['project_id'] ?? null,
                    ]
                );

                if ($donationId && $financial->donation_id === null) {
                    $financial->update([
                        'donation_id' => $donationId,
                        'user_id' => $ledgerUserId,
                    ]);
                }

                if ($financial->wasRecentlyCreated && $validated['type'] === 'Project Funding' && ! empty($validated['project_id'])) {
                    Project::where('id', $validated['project_id'])->increment('raised_amount', $amountGhs);
                }

                if ($donation && $donation->type === 'Monetary' && $donation->status === 'Pending') {
                    $donation->update([
                        'status' => 'Verified',
                        'paystack_reference' => $donation->paystack_reference ?? $validated['reference'],
                    ]);
                    $donation->refresh();
                }

                return response()->json([
                    'message' => 'Payment verified and recorded successfully',
                    'financial' => $financial->fresh(),
                ]);
            });
        } catch (\Exception $e) {
            Log::error('Payment verification error', ['error' => $e->getMessage()]);

            return response()->json(['message' => 'Verification failed. Please contact support.'], 500);
        }
    }

    /**
     * Admin: enter Paystack reference from dashboard; server verifies amount vs donation and updates status.
     */
    public function verifyMonetaryAsAdmin(Request $request, Donation $donation): JsonResponse
    {
        $this->authorize('verifyMonetaryAsAdmin', $donation);

        $validated = $request->validate([
            'reference' => 'required|string|max:191',
        ]);

        if ($donation->type !== 'Monetary') {
            return response()->json(['message' => 'Only monetary donations can be verified with this action.'], 422);
        }

        if ($donation->status !== 'Pending') {
            return response()->json(['message' => 'This donation is not pending payment.'], 422);
        }

        if (! config('services.paystack.secret_key')) {
            return response()->json(['message' => 'Paystack is not configured on the server.'], 500);
        }

        $tx = $this->fetchSuccessfulPaystackTransaction($validated['reference']);
        if ($tx === null) {
            return response()->json(['message' => 'Could not verify this reference with Paystack. Check the reference and API keys.'], 400);
        }

        if (strtoupper($tx['currency']) !== 'GHS') {
            return response()->json(['message' => 'Only GHS transactions can be matched to donation amounts in this flow.'], 422);
        }

        if (! $this->amountMatchesDonation($donation, $tx['amount_ghs'])) {
            return response()->json([
                'message' => 'Paystack amount ('.number_format($tx['amount_ghs'], 2).' GHS) does not match this donation ('.number_format((float) $donation->quantity, 2).' GHS).',
            ], 422);
        }

        $financial = Financial::firstOrCreate(
            ['payment_reference' => $validated['reference']],
            [
                'user_id' => $donation->user_id,
                'transaction_type' => 'Donation',
                'amount' => $tx['amount_ghs'],
                'currency' => 'GHS',
                'payment_method' => 'paystack',
                'status' => 'Completed',
                'description' => 'Admin verified Paystack: '.$validated['reference'],
                'transaction_date' => now(),
                'donation_id' => $donation->id,
            ]
        );

        if ($financial->donation_id === null) {
            $financial->update(['donation_id' => $donation->id, 'user_id' => $donation->user_id]);
        }

        $donation->update([
            'status' => 'Verified',
            'paystack_reference' => $donation->paystack_reference ?? $validated['reference'],
        ]);

        return response()->json([
            'message' => 'Payment verified and donation updated.',
            'donation' => $donation->fresh(),
            'financial' => $financial->fresh(),
        ]);
    }

    /**
     * @return array{amount_ghs: float, currency: string}|null
     */
    private function fetchSuccessfulPaystackTransaction(string $reference): ?array
    {
        if (! config('services.paystack.secret_key')) {
            return null;
        }

        $response = Http::withHeaders([
            'Authorization' => 'Bearer '.config('services.paystack.secret_key'),
        ])->get('https://api.paystack.co/transaction/verify/'.$reference);

        $paystackData = $response->json();

        if (! $response->successful() || ! ($paystackData['status'] ?? false)) {
            return null;
        }

        $transactionData = $paystackData['data'] ?? [];

        if (($transactionData['status'] ?? '') !== 'success') {
            return null;
        }

        $amountMinor = (int) ($transactionData['amount'] ?? 0);
        $amountGhs = round($amountMinor / 100, 2);

        if ($amountGhs <= 0) {
            return null;
        }

        return [
            'amount_ghs' => $amountGhs,
            'currency' => strtoupper((string) ($transactionData['currency'] ?? 'GHS')),
        ];
    }

    private function amountMatchesDonation(Donation $donation, float $amountGhs): bool
    {
        return abs((float) $donation->quantity - $amountGhs) <= 0.05;
    }

    /**
     * Paystack webhook handler — signature verified; user attribution from donation row when possible.
     */
    public function paystackWebhook(Request $request): JsonResponse
    {
        if (! $request->hasHeader('x-paystack-signature')) {
            return response()->json(['message' => 'Missing signature'], 400);
        }

        $signingSecret = config('services.paystack.secret_key');
        $computedSignature = hash_hmac('sha512', $request->getContent(), $signingSecret);

        if ($request->header('x-paystack-signature') !== $computedSignature) {
            Log::error('Invalid Paystack Webhook Signature');

            return response()->json(['message' => 'Invalid signature'], 401);
        }

        $payload = $request->all();

        if (($payload['event'] ?? null) === 'charge.success') {
            $data = $payload['data'] ?? [];
            $reference = $data['reference'] ?? null;
            if (! $reference) {
                Log::warning('Paystack webhook: missing charge reference');

                return response()->json(['status' => 'ignored', 'reason' => 'no_reference'], 200);
            }

            $metadata = $this->normalizePaystackMetadata($data);
            $donationId = isset($metadata['donation_id']) ? (int) $metadata['donation_id'] : null;

            if (! $donationId && ! empty($data['reference'])) {
                $byRef = Donation::where('paystack_reference', $data['reference'])->first();
                if ($byRef) {
                    $donationId = $byRef->id;
                }
            }

            $userId = null;
            $transactionType = is_string($metadata['type'] ?? null) ? $metadata['type'] : 'Donation';
            if (! in_array($transactionType, ['Donation', 'Project Funding', 'General Support', 'Allocation', 'Expense', 'Refund'], true)) {
                $transactionType = 'Donation';
            }

            if ($donationId) {
                $donation = Donation::find($donationId);
                if (! $donation) {
                    Log::warning('Paystack webhook: donation_id not found', ['donation_id' => $donationId]);

                    return response()->json(['status' => 'ignored', 'reason' => 'unknown_donation'], 200);
                }

                $userId = $donation->user_id;

                if (isset($metadata['user_id']) && (int) $metadata['user_id'] !== (int) $donation->user_id) {
                    Log::warning('Paystack webhook: metadata user_id ignored (donation mismatch)', [
                        'donation_id' => $donationId,
                        'metadata_user_id' => $metadata['user_id'],
                        'donation_user_id' => $donation->user_id,
                    ]);
                }
            } elseif (! empty($metadata['user_id'])) {
                Log::warning('Paystack webhook: attributing user without donation_id from metadata');

                $userId = (int) $metadata['user_id'];
            }

            // Project funding must go through POST /payments/verify with project_id (ceiling checks). Webhook cannot enforce that.
            if ($transactionType === 'Project Funding') {
                Log::info('Paystack webhook: Project Funding skipped — use authenticated /payments/verify with project_id', [
                    'reference' => $reference,
                ]);

                return response()->json(['status' => 'success'], 200);
            }

            $amountMinor = (int) ($data['amount'] ?? 0);
            $amountMajor = round($amountMinor / 100, 2);

            Financial::firstOrCreate(
                ['payment_reference' => $reference],
                [
                    'user_id' => $userId,
                    'transaction_type' => $transactionType,
                    'amount' => $amountMajor,
                    'currency' => strtoupper((string) ($data['currency'] ?? 'GHS')),
                    'payment_method' => 'paystack',
                    'status' => 'Completed',
                    'description' => 'Webhook: '.(is_string($metadata['description'] ?? null) ? $metadata['description'] : 'Paystack payment'),
                    'transaction_date' => now(),
                    'donation_id' => $donationId,
                ]
            );

            if ($donationId && $transactionType === 'Donation') {
                $donation = Donation::find($donationId);
                if ($donation && $donation->type === 'Monetary' && $donation->status === 'Pending') {
                    $donation->update(['status' => 'Verified']);
                }
            }
        }

        return response()->json(['status' => 'success'], 200);
    }

    /**
     * @return array<string, mixed>
     */
    private function normalizePaystackMetadata(array $data): array
    {
        $meta = $data['metadata'] ?? [];
        if (is_string($meta)) {
            $decoded = json_decode($meta, true);
            if (is_array($decoded)) {
                return $decoded;
            }

            return [];
        }

        return is_array($meta) ? $meta : [];
    }
}
