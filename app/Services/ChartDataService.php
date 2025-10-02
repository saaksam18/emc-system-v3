<?php

namespace App\Services;

use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Exception;
use Illuminate\Support\Facades\Log;

use App\Models\Rentals;
use App\Models\VehicleClasses;
use App\Models\Vehicles;

class ChartDataService
{
    /**
     * Fetches and processes historical chart data for vehicle stock and rentals.
     *
     * @return array An array containing chartData and vehicleClassesWithColors.
     * @throws Exception If there's an error during data calculation.
     */
    public function getHistoricalChartDataService(): array
    {
        Log::info("Starting historical chart data calculation via ChartDataService.");

        // --- Fetch Vehicle Classes for Chart Configuration ---
        $vehicleClasses = VehicleClasses::select('id', 'name')->get();
        $defaultColors = ['#04a96d', '#1c3151', '#2463eb', '#ff7f0e', '#ffbb78', '#d62728', '#ff9896', '#9467bd', '#c5b0d5', '#8c564b', '#c49c94', '#e377c2', '#f7b6d2', '#7f7f7f', '#c7c7c7', '#bcbd22', '#dbdb8d', '#17becf', '#9edae5'];
        $vehicleClassesWithColors = $vehicleClasses->map(function ($class, $index) use ($defaultColors) {
            $cleanName = str_replace(' ', '', $class->name);
            return [
                'id' => $class->id,
                'name' => $class->name,
                'color' => $defaultColors[$index % count($defaultColors)],
                'key_name' => 'totalClass' . $cleanName,
            ];
        });


        // --- Prepare ALL Historical Chart Data (DAILY Granularity) ---
        $earliestVehicleDate = Vehicles::min('created_at');
        $earliestRentalDate = Rentals::min('start_date');

        $minDate = null;
        if ($earliestVehicleDate && $earliestRentalDate) {
            $minDate = Carbon::parse(min($earliestVehicleDate, $earliestRentalDate))->startOfDay();
        } elseif ($earliestVehicleDate) {
            $minDate = Carbon::parse($earliestVehicleDate)->startOfDay();
        } elseif ($earliestRentalDate) {
            $minDate = Carbon::parse($earliestRentalDate)->startOfDay();
        } else {
            // If no vehicles or rentals exist, default to last 36 months for a reasonable initial chart view
            $minDate = Carbon::now()->subMonths(36)->startOfDay();
        }

        // NEW: Pull all fleet size totals outside of the loop (1 or 2 initial queries)
        $fleetTotalsByDate = $this->getDailyFleetTotals($minDate);
        // --- NEW: Pull ALL Rental Data (Aggregated) in a single query ---
        // This query finds the total number of vehicles for each class that were
        // rented at some point since the minDate.
        $allRentals = Rentals::where('start_date', '>=', $minDate)
            ->withTrashed()
            ->select('vehicle_id', 'start_date', 'end_date')
            ->get();

        $allVehicleClasses = Vehicles::whereIn('id', $allRentals->pluck('vehicle_id'))
            ->pluck('vehicle_class_id', 'id')
            ->toArray();
        // --- END NEW DATA PULL ---

        // --- Prepare Historical Chart Data (DAILY Granularity) ---
        $currentDate = Carbon::now()->startOfDay();
        $historicalPeriod = CarbonPeriod::create($minDate, '1 day', $currentDate);
        $allHistoricalChartData = [];

        $currentRentedByClass = []; // State tracker for rented vehicles by class ID
        foreach ($vehicleClassesWithColors as $class) {
            $currentRentedByClass[$class['id']] = 0;
        }

        foreach ($historicalPeriod as $date) {
            $dayStart = $date->copy()->startOfDay();
            $dayEnd = $date->copy()->endOfDay();
            $dayLabel = $date->format('M d, \'y');
            $dateKey = $date->format('Y-m-d');

            // --- ZERO Database Queries inside this loop! ---
            
            // 1. Calculate the fleet size for the current day
            $totalMotoCount = $fleetTotalsByDate[$dateKey] ?? 0;
            
            // 2. Iterate over all rentals to update the current rented count
            $rentedVehicleIdsOnDay = $allRentals->filter(function ($rental) use ($dayStart, $dayEnd) {
                return $rental->start_date <= $dayEnd && (is_null($rental->end_date) || $rental->end_date >= $dayStart);
            })->pluck('vehicle_id')->unique();


            // 3. Recalculate current rented counts by class (this is the key calculation)
            $totalRentedOnDay = 0;
            $dailyEntry = [
                'label' => $dayLabel,
                'date_key' => $dateKey,
                'totalFleet' => $totalMotoCount,
                'totalRented' => 0,
                'totalStock' => $totalMotoCount,
            ];
            
            foreach ($vehicleClassesWithColors as $class) {
                $keyName = $class['key_name'];
                $classId = $class['id'];
                
                // Count vehicles currently rented in this class by checking against pre-pulled vehicle classes
                $rentedCountForClass = $rentedVehicleIdsOnDay->filter(function ($vehicleId) use ($allVehicleClasses, $classId) {
                    return ($allVehicleClasses[$vehicleId] ?? null) === $classId;
                })->count();

                $dailyEntry[$keyName] = $rentedCountForClass;
                $totalRentedOnDay += $rentedCountForClass;
            }

            $dailyEntry['totalRented'] = $totalRentedOnDay;
            $dailyEntry['totalStock'] = $totalMotoCount - $totalRentedOnDay;
            $allHistoricalChartData[] = $dailyEntry;
        }

        Log::info("Finished historical chart data calculation via ChartDataService. Generated data for " . count($allHistoricalChartData) . " days.");

        return [
            'chartData' => $allHistoricalChartData,
            'vehicleClasses' => $vehicleClassesWithColors->toArray(),
        ];
    }

    private function getDailyFleetTotals(Carbon $minDate): array
    {
        // Fetch all creation and deletion events for vehicles since the beginning of time
        $events = Vehicles::withTrashed()
            ->select('created_at', 'deleted_at')
            ->where('created_at', '<=', now())
            ->get();

        $dailyChange = [];
        $today = Carbon::now()->startOfDay();

        // Tally the change for each day
        foreach ($events as $vehicle) {
            $creationDay = $vehicle->created_at->startOfDay()->format('Y-m-d');
            $deletionDay = $vehicle->deleted_at ? $vehicle->deleted_at->startOfDay()->format('Y-m-d') : null;

            // Count as +1 on the creation day
            $dailyChange[$creationDay] = ($dailyChange[$creationDay] ?? 0) + 1;

            // Count as -1 on the deletion day (if deleted and before today)
            if ($deletionDay && $vehicle->deleted_at->lessThanOrEqualTo($today)) {
                $dailyChange[$deletionDay] = ($dailyChange[$deletionDay] ?? 0) - 1;
            }
        }

        // Now, run a cumulative sum (prefix sum) over the historical period
        $historicalPeriod = CarbonPeriod::create($minDate->startOfDay(), '1 day', $today);
        $fleetTotals = [];
        $currentFleet = 0; // Initialize with fleet count before minDate (You can query this once if needed)
        
        // For simplicity, let's query the fleet count ON the minDate once:
        $currentFleet = Vehicles::where('created_at', '<', $minDate)
                            ->where(function ($query) use ($minDate) {
                                $query->whereNull('deleted_at')
                                    ->orWhere('deleted_at', '>', $minDate);
                            })
                            ->count();
        
        foreach ($historicalPeriod as $date) {
            $dateKey = $date->format('Y-m-d');
            
            // Apply the daily change
            $currentFleet += $dailyChange[$dateKey] ?? 0;
            
            $fleetTotals[$dateKey] = $currentFleet;
        }

        return $fleetTotals;
    }

    /**
     * Calculates the total fleet size (active vehicles) up to a given date.
     *
     * @param Carbon $endDate The date up to which to count active vehicles.
     * @return int
     */
    private function getTotalFleetSizeForDate(Carbon $endDate): int
    {
        try {
            $count = Vehicles::where('created_at', '<=', $endDate)
                          ->where(function ($query) use ($endDate) {
                              $query->whereNull('deleted_at')
                                    ->orWhere('deleted_at', '>', $endDate);
                          })
                          ->count();
            return $count;
        } catch (Exception $e) {
            Log::error("Error calculating total fleet size for date ending " . $endDate->toDateString() . ": " . $e->getMessage(), ['exception' => $e]);
            return 0;
        }
    }

    public function getVehicleStockChartDataService(): array
    {
        Log::info("Starting vehicle stock chart data calculation via ChartDataService.");

        $defaultColors = [
            '#1c3151', '#ff7f0e', '#2463eb', '#04a96d', '#ffbb78', '#d62728', '#ff9896',
            '#9467bd', '#c5b0d5', '#8c564b', '#c49c94', '#e377c2', '#f7b6d2', '#7f7f7f',
            '#c7c7c7', '#bcbd22', '#dbdb8d', '#17becf', '#9edae5'
        ];

        // Eager load counts for total and unavailable vehicles in a single query per relationship
        $vehicleClassesData = VehicleClasses::query()
            ->select('id', 'name')
            ->withCount([
                'vehicles as total_vehicles_count', // Counts all vehicles for the class
                'vehicles as unavailable_vehicles_count' => function ($query) {
                    $query->unavailable(); // Applies your unavailable scope
                }
            ])
            ->get();

        $chartData = $vehicleClassesData->map(function ($class, $index) use ($defaultColors) {
            $cleanName = str_replace(' ', '', $class->name);
            $totalVehicles = $class->total_vehicles_count;
            $unavailableVehicles = $class->unavailable_vehicles_count;
            $availableVehicles = $totalVehicles - $unavailableVehicles;

            return [
                'id' => $class->id,
                'label' => $class->name,
                'total' => $totalVehicles, // Total vehicles in this class
                'available' => $availableVehicles, // Available vehicles (calculated)
                'unavailable' => $unavailableVehicles, // Unavailable vehicles
                'vehicle_class_key' => 'class_' . strtolower($cleanName), // Consistent key naming
                'fill' => $defaultColors[$index % count($defaultColors)],
            ];
        });

        // Calculate the grand total of available vehicles
        $grandTotalAvailableVehicles = $chartData->sum('available');

        // Create a mapping from vehicle_class_id to your desired key name (e.g., 'class_sedan')
        $vehicleClassIdToKeyName = $chartData->pluck('vehicle_class_key', 'id')->toArray();
        
        return [
            'chartData' => $chartData,
            'vehicleClassIdToKeyName' => $vehicleClassIdToKeyName,
            'grandTotalAvailableVehicles' => $grandTotalAvailableVehicles, // Add the new data point

        ];
    }
}