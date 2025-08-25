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
            // User
            UserRolesAndPermissionsSeeder::class,
            AdminSeeder::class,

            // Customer
            ContactTypeSeeder::class,

            // Vehicles
            VehicleClassSeeder::class,
            VehicleStatusSeeder::class,
            VehicleMakerSeeder::class,
            VehicleModelSeeder::class,

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
