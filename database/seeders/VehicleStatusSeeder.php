<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\VehicleStatus;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class VehicleStatusSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Optional: Fetch the first user to assign as the creator.
        // Ensure you have at least one user seeded before running this seeder,
        // or handle the case where no user exists.
        $firstUser = User::first(); // Get the first user from the users table
        $userId = $firstUser ? $firstUser->id : null; // Use the user's ID or null if no user exists

        // Check if a user was found before proceeding if user_id is required
        if (!$userId) {
             $this->command->warn('No users found in the database. Skipping VehicleStatus seeding that requires a user_id.');
             // You might want to create a default user here or stop the seeder
             // For this example, we'll proceed but statuses requiring user_id won't be created
             // Or adjust the logic below if user_id can be nullable
        }

        // Define the default vehicle statuses
        $statuses = [
            [
                'status_name' => 'In Stock',
                'description' => 'Vehicle is available for rent.',
                'is_rentable' => true,
                'user_id' => $userId, // Assign the fetched user ID
            ],
            [
                'status_name' => 'On Rent',
                'description' => 'Vehicle is currently rented out.',
                'is_rentable' => false,
                'user_id' => $userId,
            ],
            [
                'status_name' => 'Reserved',
                'description' => 'Vehicle is reserved.',
                'is_rentable' => false,
                'user_id' => $userId,
            ],
            [
                'status_name' => 'Maintenance',
                'description' => 'Vehicle is undergoing maintenance.',
                'is_rentable' => false,
                'user_id' => $userId,
            ],
            [
                'status_name' => 'Under Repair',
                'description' => 'Vehicle is undergoing repair.',
                'is_rentable' => false,
                'user_id' => $userId,
            ],
            [
                'status_name' => 'Unavailable',
                'description' => 'Vehicle is not available for rent for other reasons (e.g., reserved, damaged).',
                'is_rentable' => false,
                'user_id' => $userId,
            ],
             [
                'status_name' => 'Decommissioned',
                'description' => 'Vehicle is no longer part of the fleet.',
                'is_rentable' => false,
                'user_id' => $userId,
            ],
            // Add any other statuses you need
        ];

        // Loop through the statuses and create them
        foreach ($statuses as $status) {
            // Only create if user_id is not required or if a user_id was found
            if (isset($status['user_id']) && $status['user_id'] === null) {
                 $this->command->info("Skipping status '{$status['status_name']}' due to missing user_id.");
                 continue; // Skip this status if user_id is null and required
            }

            // Use updateOrCreate to avoid duplicates if the seeder is run multiple times
            // It checks for existing records based on the first array, and updates or creates accordingly
            VehicleStatus::updateOrCreate(
                ['status_name' => $status['status_name']], // Attributes to find existing record
                $status // Attributes to update or create with
            );
        }

        $this->command->info('Vehicle statuses seeded successfully!');
    }
}
