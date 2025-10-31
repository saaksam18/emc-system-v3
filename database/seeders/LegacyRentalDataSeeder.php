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
        echo 'Migrating rental data...\n';

        $legacyRentals = DB::connection('legacy_mysql')
        ->table('tbl_rental')
        // Get all rentals and order them to find the latest for each customer
        ->orderBy('customerID')
        ->orderBy('created_at', 'desc') // Or 'rentalDay' or 'returnDate'
        ->get();

        // This will keep track of which customers we have already marked a 'latest' rental for
        $processedCustomers = []; // Reset this for each table migration

    $legacyRentals = DB::connection('legacy_mysql')
        ->table('tbl_rental')
        ->orderBy('customerID')
        ->orderBy('created_at', 'desc')
        ->get();

    foreach ($legacyRentals as $legacyRental) {
        $isLatestVersion = false;
        $deletedAt = null;

        if (!in_array($legacyRental->customerID, $processedCustomers)) {
            $isLatestVersion = true;
            $processedCustomers[] = $legacyRental->customerID;
        } else {
            $deletedAt = $legacyRental->updated_at;
        }

        // --- Start of New Logic for "Sold" transactions ---
        $newStatus = (string) $legacyRental->transactionType;
        

        if ($newStatus === "3") {
            // Logic for sold rentals
            $startDate = $legacyRental->rentalDay;
            $actualStartDate = $legacyRental->rentalDay;
            $endDate = $legacyRental->returnDate;
            $actualReturnDate = $legacyRental->returnDate;

            $isActive = false;
            $isLatestVersion = true; // A "Sold" record is always the final/latest state
            $deletedAt = $legacyRental->updated_at; // The record is "deleted" from active usage
            
        } else {
            // Logic for all other rental types
            $startDate = $legacyRental->rentalDay;
            $actualStartDate = $legacyRental->rentalDay;
            $endDate = $legacyRental->returnDate;
            $actualReturnDate = ($newStatus === 'Return' || $newStatus === 'Temp. Return') ? $legacyRental->returnDate : null;

            $isActive = ($legacyRental->is_Active == 1);
            // $isLatestVersion and $deletedAt are handled by the logic at the top of the loop
        }
        // --- End of New Logic ---

        // Look up new IDs for foreign keys (customer, vehicle, user, staff)
        $newCustomer = Customers::where('legacy_id', $legacyRental->customerID)->first();
        $newVehicle = Vehicles::where('legacy_id', $legacyRental->motorID)->first();
        $newUser = User::where('legacy_id', $legacyRental->userID)->first();
        $newStaff = User::where('legacy_id', $legacyRental->staff_id)->first();
        
        // Handle missing relationships by skipping the record
        if (!$newCustomer || !$newVehicle || !$newUser || !$newStaff) {
            echo "Skipping rental with legacy_id: {$legacyRental->rentalID} due to missing related record.\n";
            continue;
        }

        DB::table('rentals')->insert([
            'vehicle_id' => $newVehicle->id,
            'customer_id' => $newCustomer->id,
            'start_date' => $startDate,
            'end_date' => $endDate,
            'period' => $legacyRental->rentalPeriod,
            'coming_date' => $legacyRental->commingDate,
            'actual_start_date' => $actualStartDate,
            'actual_return_date' => $actualReturnDate,
            'total_cost' => $legacyRental->price,
            'is_active' => $isActive,
            'status' => $newStatus,
            'incharger_id' => $newStaff->id,
            'user_id' => $newUser->id,
            'legacy_id' => $legacyRental->rentalID,
            'created_at' => $legacyRental->created_at,
            'updated_at' => $legacyRental->updated_at,
            'is_latest_version' => $isLatestVersion,
            'version_timestamp' => $legacyRental->created_at,
            'deleted_at' => $deletedAt,
        ]);
    
    }
        echo 'Rental data migrated successfully!\n';
    }
}
