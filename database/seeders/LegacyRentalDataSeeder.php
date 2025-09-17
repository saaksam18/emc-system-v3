<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

use App\Models\Customers; // Make sure to use your Customer model
use App\Models\Vehicles;  // Make sure to use your Vehicle model
use App\Models\User; 

class LegacyRentalDataSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Caching lookups from previous migrations
        echo 'Migrating rental data...';

        $legacyRentals = DB::connection('legacy_mysql')->table('tbl_rental')->get();

        foreach ($legacyRentals as $legacyRental) {
        // Step 1: Look up new IDs using legacy_id
        $newCustomer = Customers::where('legacy_id', $legacyRental->customerID)->first();
        $newVehicle = Vehicles::where('legacy_id', $legacyRental->motorID)->first();
        $newUser = User::where('legacy_id', $legacyRental->userID)->first();
        $newStaff = User::where('legacy_id', $legacyRental->staff_id)->first();
        
        // Handle missing relationships by skipping the record
        if (!$newCustomer || !$newVehicle || !$newUser || !$newStaff) {
            echo "Skipping rental with legacy_id: {$legacyRental->rentalID} due to missing customer, vehicle, or user record.";
            continue;
        }

        // Initialize variables for the new table
        $actualReturnDate = null;
        
        // This is the new logic you requested
        if ($legacyRental->transactionType === 'Return') {
            $actualReturnDate = $legacyRental->returnDate;
        }

        // Step 2: Data Transformation and Mapping
        $newStatus = $legacyRental->transactionType;
        $isActive = ($legacyRental->is_Active == 1);
        $startDate = $legacyRental->rentalDay;
        $endDate = $legacyRental->returnDate;
        $comingDate = $legacyRental->commingDate;
        $totalCost = $legacyRental->price;

        // Step 3: Insert into the new `rentals` table
        DB::table('rentals')->insert([
            'vehicle_id' => $newVehicle->id,
            'customer_id' => $newCustomer->id,
            'start_date' => $startDate,
            'end_date' => $endDate,
            'period' => $legacyRental->rentalPeriod, // Assuming this is a duration in days/months
            'coming_date' => $comingDate,
            'actual_start_date' => $startDate, // Mapping old 'rentalDay' to new 'actual_start_date'
            'actual_return_date' => $actualReturnDate, // This can't be set during migration, it's set later.
            'total_cost' => $totalCost,
            'is_active' => $isActive,
            'status' => $newStatus,
            'incharger_id' => $newStaff->id,
            'user_id' => $newUser->id,
            'legacy_id' => $legacyRental->rentalID, // Crucial for future relations
            'created_at' => $legacyRental->created_at,
            'updated_at' => $legacyRental->updated_at,
        ]);
    }

        echo 'Rental data migrated successfully!';
    }
}
