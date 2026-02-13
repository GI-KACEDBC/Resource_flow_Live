<?php

namespace Database\Seeders;

use App\Models\Request;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class RequestSeeder extends Seeder
{
    /**
     * Seed approved aid requests from recipients for Resource Allocation.
     */
    public function run(): void
    {
        $recipients = User::whereIn('role', ['requestor', 'recipient'])->get();
        if ($recipients->isEmpty()) {
            return;
        }

        if (Request::count() === 0) {
            $requests = [
            [
                'title' => 'Emergency Food Relief - Northern Region',
                'description' => 'Urgent need for rice, cooking oil, and canned goods for displaced families in Tamale area.',
                'aid_type' => 'Health',
                'need_type' => 'emergency',
                'time_sensitivity' => 'critical',
                'recipient_type' => 'displaced_families',
                'region' => 'Northern',
                'quantity_required' => 500,
                'unit' => 'bags',
                'availability_gap' => 80,
                'urgency_score' => 85,
                'urgency_level' => 'Critical',
                'status' => 'approved',
                'funding_status' => 'unfunded',
            ],
            [
                'title' => 'Medical Supplies for Rural Clinic',
                'description' => 'Paracetamol, bandages, and basic medical supplies needed for rural health outreach.',
                'aid_type' => 'Health',
                'need_type' => 'ongoing',
                'time_sensitivity' => 'high',
                'recipient_type' => 'rural_clinic',
                'region' => 'Ashanti',
                'quantity_required' => 200,
                'unit' => 'boxes',
                'availability_gap' => 60,
                'urgency_score' => 72,
                'urgency_level' => 'High',
                'status' => 'approved',
                'funding_status' => 'unfunded',
            ],
            [
                'title' => 'Mosquito Nets Distribution',
                'description' => 'Insecticide-treated nets for malaria prevention in high-risk communities.',
                'aid_type' => 'Health',
                'need_type' => 'preventive',
                'time_sensitivity' => 'medium',
                'recipient_type' => 'community',
                'region' => 'Greater Accra',
                'quantity_required' => 1000,
                'unit' => 'pieces',
                'availability_gap' => 45,
                'urgency_score' => 55,
                'urgency_level' => 'Medium',
                'status' => 'approved',
                'funding_status' => 'unfunded',
            ],
            [
                'title' => 'Blankets and Warm Clothing',
                'description' => 'Winter relief items for vulnerable populations in northern regions.',
                'aid_type' => 'Other',
                'custom_aid_type' => 'Shelter',
                'need_type' => 'seasonal',
                'time_sensitivity' => 'medium',
                'recipient_type' => 'vulnerable_population',
                'region' => 'Northern',
                'quantity_required' => 300,
                'unit' => 'pieces',
                'availability_gap' => 35,
                'urgency_score' => 40,
                'urgency_level' => 'Medium',
                'status' => 'approved',
                'funding_status' => 'unfunded',
            ],
            [
                'title' => 'School Feeding Program Supplies',
                'description' => 'Rice and cooking oil for school feeding program in underserved areas.',
                'aid_type' => 'Education',
                'need_type' => 'ongoing',
                'time_sensitivity' => 'low',
                'recipient_type' => 'school',
                'region' => 'Western',
                'quantity_required' => 150,
                'unit' => 'bags',
                'availability_gap' => 25,
                'urgency_score' => 28,
                'urgency_level' => 'Low',
                'status' => 'approved',
                'funding_status' => 'unfunded',
            ],
        ];

            foreach ($requests as $index => $reqData) {
                $userId = $recipients[$index % $recipients->count()]->id;

                Request::create(array_merge($reqData, [
                    'user_id' => $userId,
                    'urgency_calculation_log' => ['seeded' => true],
                ]));
            }
        }

        // Aged requests for "Flagged for Review" testing (bypass 30-day threshold)
        $agedRequests = [
            45 => ['title' => 'Farmerline Aid Request', 'description' => 'Agricultural inputs and extension support for smallholder farmers in Northern Region.'],
            60 => ['title' => 'Babori - North Pipe/Borehole Request', 'description' => 'Community borehole and pipe network for safe drinking water in Babori settlement.'],
            90 => ['title' => 'Rural Clinic Medical Supplies - Upper East', 'description' => 'Essential medicines and basic medical equipment for remote health outreach.'],
        ];
        foreach ($agedRequests as $days => $data) {
            $userId = $recipients->first()->id;
            $createdAt = Carbon::now()->subDays($days);
            Request::updateOrCreate(
                ['title' => $data['title']],
                [
                    'user_id' => $userId,
                    'description' => $data['description'],
                    'aid_type' => 'Health',
                    'need_type' => 'emergency',
                    'time_sensitivity' => 'high',
                    'recipient_type' => 'community',
                    'region' => 'Northern',
                    'quantity_required' => 100,
                    'unit' => 'units',
                    'availability_gap' => 50,
                    'urgency_score' => 65,
                    'urgency_level' => 'High',
                    'status' => 'approved',
                    'funding_status' => 'unfunded',
                    'urgency_calculation_log' => ['seeded' => true, 'aged' => $days],
                    'created_at' => $createdAt,
                    'updated_at' => $createdAt,
                ]
            );
        }
    }
}
