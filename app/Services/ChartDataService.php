<?php

namespace App\Services;

use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Exception;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

use App\Models\Rentals;
use App\Models\VehicleClasses;
use App\Models\VehicleStatus;
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
        $vehicleClassIdToKeyName = $vehicleClassesWithColors->pluck('key_name', 'id')->toArray();

        // --- Determine Rentable Status ID (if needed by data logic, though not directly used in chart data itself) ---
        // $rentableStatusId = VehicleStatus::where('is_rentable', 1)->value('id');
        // if (is_null($rentableStatusId)) {
        //     Log::warning("No vehicle status with 'is_rentable' = 1 found. Chart data might be inaccurate for stock.");
        //     $rentableStatusId = 0;
        // }


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

        $currentDate = Carbon::now()->startOfDay();
        $historicalPeriod = CarbonPeriod::create($minDate, '1 day', $currentDate);
        $allHistoricalChartData = [];

        foreach ($historicalPeriod as $date) {
            $dayStart = $date->copy()->startOfDay();
            $dayEnd = $date->copy()->endOfDay();
            $dayLabel = $date->format('M d, \'y');
            $dateKey = $date->format('Y-m-d');

            $rentedVehicleIdsOnDay = Rentals::where('start_date', '<=', $dayEnd)
                ->withTrashed()
                ->where(function ($query) use ($dayStart) {
                    $query->where('end_date', '>=', $dayStart)
                          ->orWhereNull('end_date');
                })
                ->distinct()
                ->pluck('vehicle_id');

            $totalMotoCount = $this->getTotalFleetSizeForDate($dayEnd);

            $dailyEntry = [
                'label' => $dayLabel,
                'date_key' => $dateKey,
                'totalFleet' => $totalMotoCount,
                'totalRented' => 0,
                'totalStock' => $totalMotoCount,
            ];

            foreach ($vehicleClassesWithColors as $class) {
                $dailyEntry[$class['key_name']] = 0;
            }

            if ($rentedVehicleIdsOnDay->isNotEmpty()) {
                $countsByClassId = Vehicles::whereIn('vehicles.id', $rentedVehicleIdsOnDay)
                    ->select('vehicles.vehicle_class_id', DB::raw('COUNT(vehicles.id) as count'))
                    ->groupBy('vehicles.vehicle_class_id')
                    ->pluck('count', 'vehicle_class_id');

                $totalRentedOnDay = 0;
                foreach ($countsByClassId as $classId => $count) {
                    if (isset($vehicleClassIdToKeyName[$classId])) {
                        $keyName = $vehicleClassIdToKeyName[$classId];
                        $dailyEntry[$keyName] = $count;
                        $totalRentedOnDay += $count;
                    }
                }
                $dailyEntry['totalRented'] = $totalRentedOnDay;
                $dailyEntry['totalStock'] = $totalMotoCount - $totalRentedOnDay;
            }

            $allHistoricalChartData[] = $dailyEntry;
        }

        Log::info("Finished historical chart data calculation via ChartDataService. Generated data for " . count($allHistoricalChartData) . " days.");

        return [
            'chartData' => $allHistoricalChartData,
            'vehicleClasses' => $vehicleClassesWithColors->toArray(),
        ];
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