<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Deposits\DepositTypes; // Import the DepositTypes model
use App\Models\User; // Import the User model
use Carbon\Carbon; // Import Carbon for date handling
use Illuminate\Support\Facades\DB;

class DepositTypeSeeder extends Seeder
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
             $this->command->warn('No users found in the database. Skipping Deposit Type seeding that requires a user_id.');
             // Decide how to handle this: stop, create a default user, or make user_id nullable below
        }

        // Define default deposit types
        $types = [
            [
                'name' => 'Passport',
                'description' => 'Original Passport. Standard deposit held against damages or unpaid rent.',
                'is_active' => true,
                'start_date' => Carbon::now(), // Set start date to current time
                'end_date' => null, // Typically no end date unless the type is retired
                'user_id' => $userId,
            ],
            [
                'name' => 'Money',
                'description' => 'Money deposit. Can be cash, bank transfer, or credit card.',
                'is_active' => true,
                'start_date' => Carbon::now(),
                'end_date' => null,
                'user_id' => $userId,
            ],
            [
                'name' => 'Others',
                'description' => 'Other deposit. Standard deposit held against damages or unpaid rent. Can be working contract, house rental contract, etc...',
                'is_active' => true,
                'start_date' => Carbon::now(),
                'end_date' => null,
                'user_id' => $userId,
            ],
        ];

        // Loop through the types and create them
        foreach ($types as $type) {
            // Skip if user_id is required but not available
             if (isset($type['user_id']) && $type['user_id'] === null) {
                 $this->command->info("Skipping deposit type '{$type['name']}' due to missing user_id.");
                 continue;
            }

            // Use updateOrCreate to prevent duplicates if the seeder runs again
            // It checks for existing records based on 'name' and updates or creates
            DepositTypes::updateOrCreate(
                ['name' => $type['name']], // Attributes to find existing record by
                $type // Attributes to update with or create
            );
        }

        $this->command->info('Deposit types seeded successfully!');
    }
}
