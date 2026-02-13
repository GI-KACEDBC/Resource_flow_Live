<?php

namespace Database\Seeders;

use App\Models\Warehouse;
use Illuminate\Database\Seeder;

class WarehouseSeeder extends Seeder
{
    /**
     * Seed warehouse facilities for Ghana.
     */
    public function run(): void
    {
        $warehouses = [
            [
                'name' => 'Accra Central Warehouse',
                'city' => 'Accra',
                'region' => 'Greater Accra',
                'address' => 'Industrial Area, Accra',
                'capacity' => 5000,
                'capacity_unit' => 'm²',
                'manager' => 'Kwame Asante',
                'contact_phone' => '+233-21-123456',
                'contact_email' => 'accra@resourceflow.gh',
                'status' => 'Active',
                'current_occupancy' => 0,
            ],
            [
                'name' => 'Kumasi Distribution Hub',
                'city' => 'Kumasi',
                'region' => 'Ashanti',
                'address' => 'Suame Industrial, Kumasi',
                'capacity' => 3500,
                'capacity_unit' => 'm²',
                'manager' => 'Ama Serwaa',
                'contact_phone' => '+233-32-234567',
                'contact_email' => 'kumasi@resourceflow.gh',
                'status' => 'Active',
                'current_occupancy' => 0,
            ],
            [
                'name' => 'Tamale Regional Hub',
                'city' => 'Tamale',
                'region' => 'Northern',
                'address' => 'Industrial Road, Tamale',
                'capacity' => 2000,
                'capacity_unit' => 'm²',
                'manager' => 'Ibrahim Mohammed',
                'contact_phone' => '+233-37-345678',
                'contact_email' => 'tamale@resourceflow.gh',
                'status' => 'Active',
                'current_occupancy' => 0,
            ],
            [
                'name' => 'Takoradi Port Storage',
                'city' => 'Takoradi',
                'region' => 'Western',
                'address' => 'Harbour Road, Takoradi',
                'capacity' => 2800,
                'capacity_unit' => 'm²',
                'manager' => 'Esi Mensah',
                'contact_phone' => '+233-31-456789',
                'contact_email' => 'takoradi@resourceflow.gh',
                'status' => 'Active',
                'current_occupancy' => 0,
            ],
        ];

        foreach ($warehouses as $warehouse) {
            Warehouse::updateOrCreate(
                ['name' => $warehouse['name']],
                $warehouse
            );
        }
    }
}
