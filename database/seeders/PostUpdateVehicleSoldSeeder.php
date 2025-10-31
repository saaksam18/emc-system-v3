<?php

namespace Database\Seeders;

use App\Models\Rentals;
use App\Models\Vehicles;
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

        // Step 1: Cache the ID for the vehicle statuses
        $statusIds = DB::table('vehicle_statuses')->pluck('id', 'status_name')->toArray();

        // Step 2: Define the rental statuses that correspond to 'Sold' or 'Lost/Stolen'
        // Assuming '3' corresponds to 'Sold' in your legacy mapping, but using names is safer.
        $finalRentalStatuses = ['3', 'Lost / Stolen']; // Use names for clarity

        // --- Logic for 'Sold' and 'Lost / Stolen' vehicles ---
        $unavailableRentals = Rentals::whereIn('status', $finalRentalStatuses)
                                   ->where('is_latest_version', true)
                                   ->get();

        if ($unavailableRentals->isEmpty()) {
            echo "No final-state rentals found. Skipping loop...\n";
            return; 
        } 
        
        $statusesList = $unavailableRentals->pluck('status')->unique()->implode(', ');
        echo "Processing " . $unavailableRentals->count() . " unavailable rentals with status(es): {$statusesList}...\n";

        foreach ($unavailableRentals as $rental) {
            $vehicle = Vehicles::find($rental->vehicle_id);
            $vehicleStatusId = $statusIds[$rental->status] ?? null;

            if ($vehicle && $vehicleStatusId) {
                $vehicle->current_rental_id = $rental->id;
                $vehicle->current_status_id = $vehicleStatusId;

                // CRITICAL FIX: Set deleted_at to the completion date from the rental.
                // It will be actual_return_date if available, otherwise end_date.
                $deleteDate = $rental->actual_return_date ?? $rental->end_date;
                
                // Only set deleted_at if a valid date exists for the final state
                if ($deleteDate) {
                     $vehicle->deleted_at = $deleteDate;
                     echo "The vehicle for rental {$rental->id} is soft-deleted as of {$deleteDate} and updated to {$rental->status}.\n";
                } else {
                     // Log an alert if the final-state rental has no end date
                     echo "WARNING: Final-state rental {$rental->id} has no end date. Vehicle {$vehicle->id} not soft-deleted.\n";
                }

                $vehicle->save();
            } else {
                echo "Skipping update for rental {$rental->id} due to missing vehicle or status '{$rental->status}'.\n";
            }
        }
        
        echo "Finished updating sold and lost vehicle.\n";
    }
}