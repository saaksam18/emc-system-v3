<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\VehicleActualModel; // Import the model for the actual vehicle models
use App\Models\VehicleMaker;       // Import the VehicleMaker model to get maker IDs
use App\Models\User;               // Import the User model
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Arr; // Useful for array handling

class VehicleModelSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Optional: Fetch the first user to assign as the creator.
        $firstUser = User::first();
        $userId = $firstUser ? $firstUser->id : null;

        // Check if a user was found before proceeding if user_id is required
        if (!$userId) {
             $this->command->warn('No users found in the database. Skipping Vehicle Actual Model seeding that requires a user_id.');
             // Decide how to handle this: stop, create a default user, or adjust logic
        }

        // Fetch existing vehicle makers and key them by name for easy lookup
        // Ensure VehicleMakerSeeder has run before this seeder!
        $makers = VehicleMaker::pluck('id', 'name')->all(); // ['Toyota' => 1, 'Honda' => 2, ...]

        if (empty($makers)) {
            $this->command->error('No Vehicle Makers found in the database. Please run VehicleMakerSeeder first.');
            return; // Stop the seeder if no makers exist
        }

        // Define default vehicle models, mapping them to maker names
        $models = [
            // Honda
            ['maker_name' => 'Honda', 'name' => 'Click', 'user_id' => $userId],
            ['maker_name' => 'Honda', 'name' => 'Air-Blade', 'user_id' => $userId],
            ['maker_name' => 'Honda', 'name' => 'PCX', 'user_id' => $userId],
            ['maker_name' => 'Honda', 'name' => 'Dio', 'user_id' => $userId],
            ['maker_name' => 'Honda', 'name' => 'Lead', 'user_id' => $userId],
            ['maker_name' => 'Honda', 'name' => 'Spacy', 'user_id' => $userId],
            ['maker_name' => 'Honda', 'name' => 'Vision', 'user_id' => $userId],
            ['maker_name' => 'Honda', 'name' => 'Today', 'user_id' => $userId],

            // Suzuki
            ['maker_name' => 'Suzuki', 'name' => 'Address', 'user_id' => $userId],

            // Yamaha
            ['maker_name' => 'Yamaha', 'name' => 'Cygnus', 'user_id' => $userId],
            ['maker_name' => 'Yamaha', 'name' => 'Fino', 'user_id' => $userId],
            ['maker_name' => 'Yamaha', 'name' => 'Mio', 'user_id' => $userId],

            // Add other models for other makers as needed
        ];

        // Loop through the models and create them
        foreach ($models as $modelData) {
            $makerName = $modelData['maker_name'];

            // Check if the specified maker exists in our fetched list
            if (!isset($makers[$makerName])) {
                $this->command->warn("Maker '{$makerName}' not found for model '{$modelData['name']}'. Skipping.");
                continue; // Skip this model if its maker doesn't exist
            }

            // Check if user_id is required but not available
            if (isset($modelData['user_id']) && $modelData['user_id'] === null) {
                 $this->command->info("Skipping vehicle model '{$modelData['name']}' due to missing user_id.");
                 continue;
            }

            // Prepare data for creation/update, replacing maker_name with maker_id
            $dataToInsert = [
                'name' => $modelData['name'],
                'maker_id' => $makers[$makerName], // Get the maker_id from the lookup array
                'user_id' => $modelData['user_id'],
            ];

            // Use updateOrCreate to prevent duplicates.
            // Check based on both name and maker_id to ensure uniqueness.
            VehicleActualModel::updateOrCreate(
                [
                    'name' => $dataToInsert['name'],
                    'maker_id' => $dataToInsert['maker_id']
                ], // Attributes to find existing record by
                $dataToInsert // Attributes to update with or create
            );
        }

        $this->command->info('Vehicle actual models seeded successfully!');
    }
}
