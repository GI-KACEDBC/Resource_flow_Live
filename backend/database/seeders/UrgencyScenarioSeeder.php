<?php

namespace Database\Seeders;

use App\Models\UrgencyScenario;
use Illuminate\Database\Seeder;

class UrgencyScenarioSeeder extends Seeder
{
    public function run(): void
    {
        $scenarios = [
            [
                'slug' => 'medical_disaster',
                'name' => 'Medical Emergency in Disaster Zone',
                'description' => 'Medical supplies required urgently in active disaster zone',
                'factors' => [
                    'need_type' => 'medical_emergency',
                    'time_sensitivity' => 'less_than_24h',
                    'recipient_type' => 'disaster_zone',
                    'availability_gap' => 0,
                    'admin_override' => 3,
                ],
            ],
            [
                'slug' => 'food_refugee',
                'name' => 'Food Crisis in Refugee Camp',
                'description' => 'Emergency food required at refugee camp',
                'factors' => [
                    'need_type' => 'emergency_food',
                    'time_sensitivity' => '24_to_72h',
                    'recipient_type' => 'refugee_camp',
                    'availability_gap' => 10,
                    'admin_override' => 1,
                ],
            ],
            [
                'slug' => 'winter_clothing_urban',
                'name' => 'Winter Clothing for Urban Poor',
                'description' => 'Clothing required; not immediate but important',
                'factors' => [
                    'need_type' => 'clothing',
                    'time_sensitivity' => '3_to_7_days',
                    'recipient_type' => 'urban_slum',
                    'availability_gap' => 40,
                    'admin_override' => 0,
                ],
            ],
            [
                'slug' => 'school_supplies_remote',
                'name' => 'School Supplies for Remote Village',
                'description' => 'Educational materials for remote village school',
                'factors' => [
                    'need_type' => 'education',
                    'time_sensitivity' => 'more_than_7_days',
                    'recipient_type' => 'remote_village',
                    'availability_gap' => 60,
                    'admin_override' => 0,
                ],
            ],
            [
                'slug' => 'clean_water_clinic',
                'name' => 'Clean Water Emergency',
                'description' => 'Water purification supplies for rural medical clinic',
                'factors' => [
                    'need_type' => 'clean_water',
                    'time_sensitivity' => 'less_than_24h',
                    'recipient_type' => 'rural_clinic',
                    'availability_gap' => 5,
                    'admin_override' => 2,
                ],
            ],
        ];

        foreach ($scenarios as $scenario) {
            UrgencyScenario::updateOrCreate(
                ['slug' => $scenario['slug']],
                $scenario
            );
        }

        $this->command->info(count($scenarios) . ' urgency scenarios seeded/updated successfully.');
    }
}
