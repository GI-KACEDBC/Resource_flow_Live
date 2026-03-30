<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StoreDonationRequest extends FormRequest
{
    /** Matches DB DECIMAL(10,2): absolute value must stay below 10^8. */
    public const MAX_NUMERIC_10_2 = 99999999.99;

    /** Individual donation threshold (GHS) - above this, full details required */
    public const INDIVIDUAL_ANONYMOUS_LIMIT = 10000;

    /** Angel donor cap (GHS) - no ID verification, all donations capped */
    public const ANGEL_DONOR_CAP = 5000;

    public function authorize(): bool
    {
        return $this->user()?->isDonor() ?? false;
    }

    public function rules(): array
    {
        $user = $this->user();
        $isCorporate = $user && $user->isDonorInstitution();
        $isIndividual = $user && $user->isDonorIndividual();

        $rules = [
            'type' => 'required|in:Goods,Monetary,Services',
            'item' => 'required|string|max:255',
            'quantity' => 'required|numeric|min:0.01|max:' . self::MAX_NUMERIC_10_2,
            'unit' => 'required|string|max:50',
            'description' => 'nullable|string',
            'warehouse_id' => 'nullable|exists:warehouses,id',
            'colocation_facility' => 'nullable|string|max:255',
            'colocation_sub_location' => 'nullable|string|max:255',
            'expiry_date' => 'nullable|date',
            'aid_request_id' => 'nullable|exists:requests,id',
            'is_anonymous' => 'nullable|boolean',
            'compliance_agreed' => 'nullable|boolean',
        ];

        // Corporate: require compliance checkbox for tax-deductible donations
        if ($isCorporate) {
            $rules['compliance_agreed'] = 'required|accepted';
        }

        return $rules;
    }

    public function messages(): array
    {
        return [
            'compliance_agreed.required' => 'Corporate donors must agree that the expenditure is wholly, exclusively, and necessarily incurred in the production of income.',
            'compliance_agreed.accepted' => 'You must agree to the tax compliance condition.',
            'quantity.max' => 'The amount or quantity exceeds the maximum allowed for this field (' . number_format(self::MAX_NUMERIC_10_2, 2) . ').',
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            $user = $this->user();
            if (!$user) {
                return;
            }

            $amount = $this->getDonationAmount();
            $isAnonymous = (bool) $this->input('is_anonymous', false);

            // Rule: Angel Donors - cap at GHS 5000, no ID verification
            if ($user->isAngelDonor()) {
                if ($amount > self::ANGEL_DONOR_CAP) {
                    $validator->errors()->add(
                        'quantity',
                        sprintf(
                            'Angel donors are capped at GH₵%s per donation. Your donation of GH₵%s exceeds this limit.',
                            number_format(self::ANGEL_DONOR_CAP, 0),
                            number_format($amount, 0)
                        )
                    );
                }
                return;
            }

            // Rule A: Individual Donations
            if ($user->isDonorIndividual()) {
                if ($amount > self::INDIVIDUAL_ANONYMOUS_LIMIT && $isAnonymous) {
                    $validator->errors()->add(
                        'is_anonymous',
                        'Donations over GH₵10,000 cannot be anonymous. Full details (Name, ID, Contact) are required.'
                    );
                }
                if ($amount > self::INDIVIDUAL_ANONYMOUS_LIMIT && !$this->hasFullDetails($user)) {
                    $validator->errors()->add(
                        'full_details',
                        'Donations over GH₵10,000 require full details: Name, Ghana Card/ID, and Contact (phone or email). Please complete your profile.'
                    );
                }
            }

            // Rule B: Corporate - check tax limit if assessable_annual_income is set
            if ($user->isDonorInstitution() && $user->assessable_annual_income) {
                $maxDeductible = (float) $user->assessable_annual_income * 0.10;
                $ytdDonations = (float) $user->donations()
                    ->where('type', 'Monetary')
                    ->whereIn('status', ['Verified', 'Allocated', 'Delivered'])
                    ->whereYear('created_at', now()->year)
                    ->sum('quantity');
                $totalAfter = $ytdDonations + $amount;
                if ($totalAfter > $maxDeductible) {
                    $validator->errors()->add(
                        'quantity',
                        sprintf(
                            'This donation would exceed your 10%% tax deductible limit (GH₵%s). Remaining cap: GH₵%s.',
                            number_format($maxDeductible, 2),
                            number_format(max(0, $maxDeductible - $ytdDonations), 2)
                        )
                    );
                }
            }
        });
    }

    /** Get monetary value of donation for compliance rules (GHS) */
    protected function getDonationAmount(): float
    {
        $type = $this->input('type', 'Goods');
        $quantity = (float) $this->input('quantity', 0);

        if ($type === 'Monetary') {
            return $quantity; // quantity is GHS amount for Monetary
        }

        // For Goods/Services, use value if provided, else quantity as proxy
        $value = (float) $this->input('value', $quantity);
        return $value > 0 ? $value : $quantity;
    }

    /** Check if user has full details (Name, ID, Contact) */
    protected function hasFullDetails($user): bool
    {
        $hasName = !empty(trim($user->name ?? ''));
        $hasId = !empty(trim($user->ghana_card ?? ''));
        $hasContact = !empty(trim($user->phone ?? '')) || !empty(trim($user->email ?? ''));
        return $hasName && $hasId && $hasContact;
    }
}
