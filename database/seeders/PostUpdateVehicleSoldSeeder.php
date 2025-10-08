<?php

namespace Database\Seeders;

use App\Models\Rentals;
use App\Models\Vehicles;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class PostUpdateVehicleSoldSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        echo "Starting update sold and lost vehicle...\n";

        // Step 1: Cache the ID for the 'On Rent' status
        $statusIds = DB::table('vehicle_statuses')->pluck('id', 'status_name')->toArray();

        // Step 2: Define the rental statuses that correspond to 'On Rent'
        // Step 2: Define the statuses
        $unavailableRentalStatuses = ['Sold', 'Lost / Stolen'];

        // --- Logic for 'Sold' and 'Lost / Stolen' vehicles ---
        // This query is now simpler and more direct.
        $unavailableRentals = Rentals::whereIn('status', $unavailableRentalStatuses)
                                   ->where('is_latest_version', true)
                                   ->get();
        // This is the correct check for an empty collection
        if ($unavailableRentals->isEmpty()) {
            echo "No rentals found. Skipping loop...\n";
            return; // Exit the method since there's nothing to process
        } else {
            echo "Processing " . $unavailableRentals->pluck('status') . " unavailable rentals...\n";
        }

        foreach ($unavailableRentals as $rental) {
            $vehicle = Vehicles::find($rental->vehicle_id);
            $vehicleStatusId = $statusIds[$rental->status] ?? null;

            if ($vehicle && $vehicleStatusId) {
                $vehicle->current_rental_id = $rental->id;
                $vehicle->current_status_id = $vehicleStatusId;
                $vehicle->deleted_at = $rental->actual_return_date;
                $vehicle->save();
                echo "The rental is {$rental->id}.\n";
            } else {
                echo "Skipping update for rental {$rental->id} due to missing vehicle or status.\n";
            }
        }
    }
}
