<?php

namespace Database\Seeders;

use App\Models\Rentals;
use App\Models\Vehicles;
use Illuminate\Support\Facades\DB;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class UpdateVehicleRentalIds extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        echo "Starting vehicle rental ID and status update...\n";
        
        $onRentStatusId = DB::table('vehicle_statuses')->where('status_name', 'On Rent')->value('id');

        // Check if the status ID was found
        if (!$onRentStatusId) {
            echo "Error: 'On Rent' status not found in vehicle_statuses table. Aborting update.\n";
            return;
        }

        // Step 2: Define the rental statuses that correspond to 'On Rent'
        $onRentRentalStatuses = ['New Rental', 'Extension', 'Temp. Return','Add Coming Date', 'EX. Deposit', 'Exchange'];

        // Step 3: Get all the latest rental records with these statuses
        $onRentRentals = Rentals::whereIn('status', $onRentRentalStatuses)
                                  ->where('is_latest_version', true)
                                  ->get();

        foreach ($onRentRentals as $rental) {
            $vehicle = Vehicles::find($rental->vehicle_id);

            if ($vehicle) {
                $vehicle->current_rental_id = $rental->id;
                $vehicle->current_status_id = $onRentStatusId;
                $vehicle->save();
            } else {
                echo "Vehicle with ID {$rental->vehicle_id} not found for rental {$rental->id}. Skipping update.\n";
            }
        }
        echo "Completed updates for 'On Rent' vehicles.\n";
    } 
}
