<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Contacts\Types as ContactType; // Import the Types model and alias it for clarity
use App\Models\User; // Import the User model
use Carbon\Carbon; // Import Carbon for date handling
use Illuminate\Support\Facades\DB;

class ContactTypeSeeder extends Seeder
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
             $this->command->warn('No users found in the database. Skipping Contact Type seeding that requires a user_id.');
             // Decide how to handle this: stop, create a default user, or make user_id nullable in the types below
        }

        // Define default contact types
        $types = [
            [
                'name' => 'Mobile Phone',
                'description' => 'Customer phone number.',
                'is_active' => true,
                'start_date' => Carbon::now(), // Set start date to current time
                'end_date' => null, // No end date for primary typically
                'user_id' => $userId,
            ],
            [
                'name' => 'Email',
                'description' => 'Customer mail address for inquiries.',
                'is_active' => true,
                'start_date' => Carbon::now(),
                'end_date' => null,
                'user_id' => $userId,
            ],
            [
                'name' => 'Facebook',
                'description' => 'Customer Facebook account. Can be account name or link.',
                'is_active' => true,
                'start_date' => Carbon::now(),
                'end_date' => null,
                'user_id' => $userId,
            ],
            [
                'name' => 'Telegram',
                'description' => 'Customer Telegram account. Can be username or link.',
                'is_active' => true,
                'start_date' => Carbon::now(),
                'end_date' => null,
                'user_id' => $userId,
            ],
             [
                'name' => 'WhatsApp',
                'description' => 'Customer WhatsApp account. Can be username or link.',
                'is_active' => true, // Mark as inactive
                'start_date' => Carbon::now(), // Example start date
                'end_date' => null,
                'user_id' => $userId,
            ],
            [
               'name' => 'Others',
               'description' => 'Other type of contact that is not commons.',
               'is_active' => true, // Mark as inactive
               'start_date' => Carbon::now(), // Example start date
               'end_date' => null,
               'user_id' => $userId,
           ],
            // Add other contact types as needed
        ];

        // Loop through the types and create them
        foreach ($types as $type) {
            // Skip if user_id is required but not available
             if (isset($type['user_id']) && $type['user_id'] === null) {
                 $this->command->info("Skipping contact type '{$type['name']}' due to missing user_id.");
                 continue;
            }

            // Use updateOrCreate to prevent duplicates if the seeder runs again
            // It checks for existing records based on 'name' and updates or creates
            ContactType::updateOrCreate(
                ['name' => $type['name']], // Attributes to find existing record by
                $type // Attributes to update with or create
            );
        }

        $this->command->info('Contact types seeded successfully!');
    }
}
