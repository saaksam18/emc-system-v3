<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\VehicleClasses; // Import the VehicleClasses model
use App\Models\User; // Import the User model
use Illuminate\Support\Facades\DB;

class VehicleClassSeeder extends Seeder
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
             $this->command->warn('No users found in the database. Skipping Vehicle Class seeding that requires a user_id.');
             // Decide how to handle this: stop, create a default user, or adjust logic if user_id can be nullable
        }

        // Define default vehicle classes
        $classes = [
            [
                'name' => 'Big Auto',
                'description' => 'Vehicle with automatic transmission and engine exceed 125 cc',
                'user_id' => $userId,
            ],
            [
                'name' => 'Auto',
                'description' => 'Vehicle with automatic transmission and engine less than or 125 cc',
                'user_id' => $userId,
            ],
            [
                'name' => '50cc Auto',
                'description' => 'Vehicle with automatic transmission and engine 50 cc',
                'user_id' => $userId,
            ],
            [
                'name' => 'Manual',
                'description' => 'Vehicle with manual transmission.',
                'user_id' => $userId,
            ],
            // Add other vehicle classes as needed
        ];

        // Loop through the classes and create them
        foreach ($classes as $class) {
            // Skip if user_id is required but not available
             if (isset($class['user_id']) && $class['user_id'] === null) {
                 $this->command->info("Skipping vehicle class '{$class['name']}' due to missing user_id.");
                 continue;
            }

            // Use updateOrCreate to prevent duplicates if the seeder runs again
            // It checks for existing records based on 'name' and updates or creates
            VehicleClasses::updateOrCreate(
                ['name' => $class['name']], // Attributes to find existing record by
                $class // Attributes to update with or create
            );
        }

        $this->command->info('Vehicle classes seeded successfully!');
    }
}
