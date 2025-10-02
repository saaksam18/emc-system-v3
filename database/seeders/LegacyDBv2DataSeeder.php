<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Carbon\Carbon;

use Illuminate\Support\Facades\DB;

// New Eloquent models
use App\Models\User;
use App\Models\Customers;

class LegacyDBv2DataSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Step 1: Migrate Users
        echo 'Migrating users...\n';
        $legacyUsers = DB::connection('legacy_mysql')->table('users')->get();

        foreach ($legacyUsers as $legacyUser) {
            $newUser = new User();
            $newUser->name = $legacyUser->name;
            $newUser->email = $legacyUser->email;
            $newUser->legacy_id = $legacyUser->id; // Important: Store the old ID for relationships
            $newUser->password = $legacyUser->password;
            $newUser->save();
        }
        echo 'Users migrated successfully!\n';

        // Step 2: Migrate Customers (using the legacy_id to link to new users)
        echo 'Migrating customers...\n';
        $legacyCustomers = DB::connection('legacy_mysql')->table('tbl_customer')->get();

        foreach ($legacyCustomers as $legacyCustomer) {
            $newUser = User::where('legacy_id', $legacyCustomer->userID)->first();

            // Find the position of the first space
            $firstSpacePosition = strpos($legacyCustomer->CustomerName, ' ');

            if ($firstSpacePosition !== false) {
                // Separate the name into two parts
                $firstName = substr($legacyCustomer->CustomerName, 0, $firstSpacePosition);
                $lastName = substr($legacyCustomer->CustomerName, $firstSpacePosition + 1);
            } else {
                // Handle cases with no space, or single-name entries
                $firstName = $legacyCustomer->CustomerName;
                $lastName = "N/A"; // or an empty string
            }

            if ($newUser) {
                DB::table('customers')->insert([
                    'legacy_id' => $legacyCustomer->customerID,
                    'first_name' => $firstName,
                    'last_name' => $lastName,
                    'gender' => $legacyCustomer->gender,
                    'nationality' => $legacyCustomer->nationality,
                    'address_line_1' => $legacyCustomer->address,
                    'notes' => $legacyCustomer->comment,
                    'user_id' => $newUser->id, // Use the new user's ID
                    'created_at' => $legacyCustomer->created_at,
                    'updated_at' => $legacyCustomer->updated_at,
                ]);
            }
        }
        echo 'Customers migrated successfully!\n';

        // Step 3: Migrate customers Contacts (using the legacy_id to link to new users)
        echo 'Migrating customer contacts...\n';

        // Step 3.1: Cache the new type IDs
        // We'll fetch all contact types from the new 'types' table and create a lookup array
        // This is much more efficient than querying the database in every loop iteration.
        $newTypes = DB::table('types')->pluck('id', 'name')->toArray();

        // Step 3.2: Migrate contacts
        $legacyContacts = DB::connection('legacy_mysql')->table('tbl_contact')->get();

        foreach ($legacyContacts as $legacyContact) {
            $newUser = User::where('legacy_id', $legacyContact->userID)->first();
            $newCustomer = Customers::where('legacy_id', $legacyContact->customerID)->first();

            // Add a check to ensure the customer exists
            if (!$newCustomer) {
                // Log the issue and skip this record
                echo "Customer with legacy_id: {$legacyContact->customerID} not found. Skipping contact with legacy_id: {$legacyContact->id}\n";
                continue; // Skip to the next iteration of the loop
            }

            $contactTypeName = $legacyContact->contactType; // Get the old name (e.g., 'Mobile Phone')
            $typeId = null;

            // Initialize start_date and end_date
            $startDate = null;
            $endDate = null;

            // Check the value of the old 'is_Active' column
            if ($legacyContact->is_Active == 1) {
                // If the contact is active, set the start_date to the current time
                // and leave the end_date as null.
                $startDate = $legacyContact->created_at;
                $endDate = null;
            } else {
                // If the contact is inactive, set the start_date to a past time
                // and the end_date to the same time. This signifies the contact was active
                // up until that point, or not active at all.
                // You can also use a specific historical date if that's more appropriate.
                $startDate = $legacyContact->created_at; 
                $endDate = Carbon::now()->subDay();
            }

            // Check if the old contact type name exists in our new lookup array
            if (isset($newTypes[$contactTypeName])) {
                $typeId = $newTypes[$contactTypeName];
            } else {
                // Handle edge cases where a type name doesn't exist in the new table.
                // You can:
                // a) Log the error for manual review
                echo "Contact type '{$contactTypeName}' not found in the new 'types' table.\n";
                
                // b) Insert a default value for 'Others' if it exists.
                if (isset($newTypes['Others'])) {
                    $typeId = $newTypes['Others'];
                }
            }

            // Step 3.33: Insert into the new contacts table
            DB::table('contacts')->insert([
                'customer_id' => $newCustomer->id,
                'contact_type_id' => $typeId, // This is the key change
                'contact_value' => $legacyContact->contactDetail,
                'start_date' => $startDate,
                'end_date' => $endDate,
                'legacy_id' => $legacyContact->id, // Use legacy_id for this table too
                'user_id' => $newUser->id, // Use the new user's ID
                'created_at' => $legacyContact->created_at,
                'updated_at' => $legacyContact->updated_at,
            ]);
        }
        echo 'Contacts migrated successfully!\n';

        // Step 4: Migrate vehicles (using the legacy_id to link to new users)
        echo 'Migrating vehicles... \n';

        // Step 4.1: Define the hardcoded mapping
        // You must know the new 'id's from your 'vehicle_classes' table.
        // Assuming your 'vehicle_classes' table has:
        // id: 1, name: 'Automatic'
        // id: 2, name: 'Semi-automatic'
        // id: 3, name: 'Manual'
        $vehicleClassMapping = [
            1 => 1, // 'Big Auto'
            2 => 2, // 'Auto'
            3 => 3, // '50cc Auto'
            4 => 4, // 'Manual'
        ];

        $vehicleStatusMapping = [
            1 => 1, // 'In Stock'
            2 => 2, // 'On Rent'
            3 => 3, // 'Sold'
            4 => 4, // 'Lost / Stolen'
            5 => 5, // 'Temp. Return'
            6 => 4, // 'Lost / Stolen'
            7 => 7, // 'Under Repair'
            8 => 8, // 'Unavailable'
        ];

        // Step 4.2: Cache the new Classes, Makes, Models, Statuses IDs
        $vehicleMakes = DB::table('vehicle_makers')->pluck('id', 'name')->toArray();
        $vehicleModels = DB::table('vehicle_actual_models')->pluck('id', 'name')->toArray();

        // Step 4.3: Migrate vehicles
        $legacyVehicles = DB::connection('legacy_mysql')->table('tbl_motorInfor')->get();

        foreach ($legacyVehicles as $legacyVehicle) {
            $makeId = null;
            $modelId = null;

            // Check for a non-null motorModel before attempting to split
            if ($legacyVehicle->motorModel) {
                // Split the motorModel string (e.g., 'Honda Dream' -> ['Honda', 'Dream'])
                $modelParts = explode(' ', trim($legacyVehicle->motorModel));
                
                // The first part is assumed to be the make
                $makeName = array_shift($modelParts);
                
                // The rest is the model name
                $modelName = implode(' ', $modelParts);
                
                // Look up the IDs from the cached arrays
                $makeId = $vehicleMakes[$makeName] ?? null;
                $modelId = $vehicleModels[$modelName] ?? null;

                // Optional: Log any models that were not found for manual review
                if (!$makeId) {
                    echo "Vehicle make '{$makeName}' not found.\n";
                }
                if (!$modelId) {
                    echo "Vehicle model '{$modelName}' not found.\n";
                }
            }

            $vehicleClassId = null;
                if (isset($vehicleClassMapping[$legacyVehicle->motorType])) {
                $vehicleClassId = $vehicleClassMapping[$legacyVehicle->motorType];
            } else {
                // Handle unknown types (e.g., assign to a default class or log an error)
                echo "Unknown motorType: {$legacyVehicle->motorType}. Assigning a default class.\n";
                // You can assign a default ID if you have one, e.g., for an 'Other' class
                continue;
            }

            $vehicleStatusId = null;
                if (isset($vehicleStatusMapping[$legacyVehicle->motorStatus])) {
                $vehicleStatusId = $vehicleStatusMapping[$legacyVehicle->motorStatus];
            } else {
                // Handle unknown types (e.g., assign to a default class or log an error)
                echo "Unknown motorType: {$legacyVehicle->motorType}. Assigning a default class.\n";
                // You can assign a default ID if you have one, e.g., for an 'Other' class
                continue;
            }

            $newUser = User::where('legacy_id', $legacyVehicle->userID)->first();
            $newCustomer = Customers::where('legacy_id', $legacyVehicle->customerID)->first();

            // Check the value of the old 'is_Active' column
            if ($legacyVehicle->is_Active == 1) {
                $createdAt = $legacyVehicle->purchaseDate;
                $deletedAt = null;
            } else {
                $createdAt = $legacyVehicle->purchaseDate; 
                $deletedAt = $legacyVehicle->updated_at;
            }

            // Check if the old chassisNo is a placeholder
            $vin = $legacyVehicle->chassisNo;
            if (in_array($vin, ['NIL', 'N/A', '', 'NULL'])) {
                // Generate a unique VIN using the old record's ID
                $vin = 'NIL-' . $legacyVehicle->motorID;
            }
            
            // Check if the generated VIN already exists (unlikely, but a good practice)
            $existingVehicle = DB::table('vehicles')->where('vin', $vin)->first();
            if ($existingVehicle) {
                $vin = 'NIL-' . $legacyVehicle->motorID . '-' . uniqid();
            }

            // Insert the transformed data into the new vehicles table
            DB::table('vehicles')->insert([
                'vehicle_no' => $legacyVehicle->motorno,
                'vehicle_make_id' => $makeId,
                'vehicle_model_id' => $modelId,
                'year' => $legacyVehicle->year,
                'license_plate' => $legacyVehicle->plateNo,
                'color' => $legacyVehicle->motorColor,
                'vin' => $vin, // Assuming chassisNo maps to VIN
                'engine_cc' => 125, // No equivalent in old DB, set to a default value
                'vehicle_class_id' => $vehicleClassId,
                'compensation_price' => $legacyVehicle->compensationPrice,
                'purchase_price' => $legacyVehicle->totalPurchasePrice,
                'purchase_date' => $legacyVehicle->purchaseDate,
                'daily_rental_price' => 0.00, // Assuming new data requires a default
                'weekly_rental_price' => 0.00,
                'monthly_rental_price' => 0.00,
                'current_status_id' => $vehicleStatusId, // Assuming you'll have a default status ID
                'current_location' => null,
                'purchase_date' => $legacyVehicle->purchaseDate,
                'legacy_id' => $legacyVehicle->motorID, // Store the old ID for relationships
                'user_id' => $newUser->id ?? null, // Map the old userID to the new user ID
                'created_at' => $legacyVehicle->created_at,
                'updated_at' => $legacyVehicle->updated_at,
            ]);
        }
        echo 'Vehicles migrated successfully!\n';

    }
}
