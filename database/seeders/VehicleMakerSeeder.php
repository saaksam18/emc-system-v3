<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\VehicleMaker;
use App\Models\User; // Import the User model
use Illuminate\Support\Facades\DB;

class VehicleMakerSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Optional: Fetch the first user to assign as the creator.
        // Ensure you have at least one user seeded before running this seeder.
        $firstUser = User::first();
        $userId = $firstUser ? $firstUser->id : null; // Use the user's ID or null

        // Check if a user was found before proceeding if user_id is required
        if (!$userId) {
             $this->command->warn('No users found in the database. Skipping Vehicle Maker seeding that requires a user_id.');
             // Decide how to handle this: stop, create a default user, or adjust logic if user_id can be nullable
        }

        // Define default vehicle makers
        $makers = [
            ['name' => 'Suzuki', 'user_id' => $userId],
            ['name' => 'Honda', 'user_id' => $userId],
            ['name' => 'Yamaha', 'user_id' => $userId],
            // Add other vehicle makers as needed
        ];

        // Loop through the makers and create them
        foreach ($makers as $maker) {
            // Skip if user_id is required but not available
             if (isset($maker['user_id']) && $maker['user_id'] === null) {
                 $this->command->info("Skipping vehicle maker '{$maker['name']}' due to missing user_id.");
                 continue;
            }

            // Use updateOrCreate to prevent duplicates if the seeder runs again
            // It checks for existing records based on 'name' and updates or creates
            VehicleMaker::updateOrCreate(
                ['name' => $maker['name']], // Attributes to find existing record by
                $maker // Attributes to update with or create
            );
        }

        $this->command->info('Vehicle makers seeded successfully!');
    }
}
