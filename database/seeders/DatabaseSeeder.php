<?php

namespace Database\Seeders;

use App\Models\User;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            // Customer
            ContactTypeSeeder::class,

            // Vehicles
            VehicleClassSeeder::class,
            VehicleStatusSeeder::class,
            VehicleMakerSeeder::class,
            VehicleModelSeeder::class,

            // Legacy Database
            LegacyDBv2DataSeeder::class,
            LegacyRentalDataSeeder::class,
            
            // User
            UserRolesAndPermissionsSeeder::class,
            AdminSeeder::class,

            // Rental
            DepositTypeSeeder::class,

            // Chart of Accounting
            ChartOfAccountSeeder::class,
        ]);

        User::factory()->create([
            'name' => 'Test User',
            'email' => 'test@example.com',
        ]);
    }
}
