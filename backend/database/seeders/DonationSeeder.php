<?php

namespace Database\Seeders;

use App\Models\Donation;
use App\Models\User;
use Illuminate\Database\Seeder;

class DonationSeeder extends Seeder
{
    /**
     * Seed verified donations (without warehouse assignment) for Warehouse Assignment page.
     */
    public function run(): void
    {
        if (Donation::count() > 0) {
            return; // Donations already seeded (e.g. from previous run or user-created)
        }

        $suppliers = User::whereIn('role', ['supplier', 'donor'])->pluck('id')->toArray();
        if (empty($suppliers)) {
            return;
        }

        $auditor = User::where('role', 'auditor')->first();
        $auditedBy = $auditor?->id;

        $donations = [
            [
                'item' => 'Rice',
                'type' => 'Goods',
                'quantity' => 500,
                'unit' => 'bags',
                'description' => '50kg bags of premium rice for emergency relief',
                'status' => 'Verified',
                'warehouse_id' => null,
                'price_status' => 'Locked',
                'audited_price' => 125000,
                'market_price' => 125000,
                'value' => 125000,
                'date_received' => now()->subDays(5),
                'expiry_date' => now()->addYear(),
            ],
            [
                'item' => 'Paracetamol',
                'type' => 'Goods',
                'quantity' => 5000,
                'unit' => 'boxes',
                'description' => '500mg tablets, 100 per box',
                'status' => 'Verified',
                'warehouse_id' => null,
                'price_status' => 'Locked',
                'audited_price' => 25000,
                'market_price' => 25000,
                'value' => 25000,
                'date_received' => now()->subDays(3),
                'expiry_date' => now()->addMonths(18),
            ],
            [
                'item' => 'Mosquito Nets',
                'type' => 'Goods',
                'quantity' => 2000,
                'unit' => 'pieces',
                'description' => 'Insecticide-treated nets for malaria prevention',
                'status' => 'Verified',
                'warehouse_id' => null,
                'price_status' => 'Locked',
                'audited_price' => 60000,
                'market_price' => 60000,
                'value' => 60000,
                'date_received' => now()->subDays(7),
                'expiry_date' => null,
            ],
            [
                'item' => 'Cooking Oil',
                'type' => 'Goods',
                'quantity' => 200,
                'unit' => 'gallons',
                'description' => 'Vegetable cooking oil, 5L per gallon',
                'status' => 'Verified',
                'warehouse_id' => null,
                'price_status' => 'Locked',
                'audited_price' => 24000,
                'market_price' => 24000,
                'value' => 24000,
                'date_received' => now()->subDays(2),
                'expiry_date' => now()->addMonths(12),
            ],
            [
                'item' => 'Medical Gloves',
                'type' => 'Goods',
                'quantity' => 10000,
                'unit' => 'pairs',
                'description' => 'Disposable nitrile gloves, boxes of 100',
                'status' => 'Verified',
                'warehouse_id' => null,
                'price_status' => 'Locked',
                'audited_price' => 45000,
                'market_price' => 45000,
                'value' => 45000,
                'date_received' => now()->subDays(4),
                'expiry_date' => now()->addYears(3),
            ],
            [
                'item' => 'Blankets',
                'type' => 'Goods',
                'quantity' => 800,
                'unit' => 'pieces',
                'description' => 'Emergency relief blankets',
                'status' => 'Verified',
                'warehouse_id' => null,
                'price_status' => 'Locked',
                'audited_price' => 40000,
                'market_price' => 40000,
                'value' => 40000,
                'date_received' => now()->subDays(6),
                'expiry_date' => null,
            ],
        ];

        foreach ($donations as $index => $donationData) {
            $userId = $suppliers[$index % count($suppliers)];

            Donation::create(array_merge($donationData, [
                'user_id' => $userId,
                'remaining_quantity' => $donationData['quantity'],
                'audited_by' => $auditedBy,
                'locked_at' => now(),
            ]));
        }
    }
}
