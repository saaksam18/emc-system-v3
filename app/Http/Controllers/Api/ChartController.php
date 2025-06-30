<?php

namespace App\Http\Controllers\Api; // Note the 'Api' namespace

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\Log;
use App\Services\ChartDataService; // Import your service

// Auth
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Foundation\Validation\ValidatesRequests;

class ChartController extends Controller // You can make it extend Controller
{
    use AuthorizesRequests, ValidatesRequests;
    
    protected $chartDataService;

    public function __construct(ChartDataService $chartDataService)
    {
        $this->chartDataService = $chartDataService;
    }

    public function getChartData(Request $request) // Or just 'index' if it's the main method for this resource
    {
        $userId = Auth::id() ?? 'guest';
        Log::info("User [ID: {$userId}] attempting to fetch chart data from API ChartController.");

        try {
            // Assuming 'dashboard-list' is the permission needed for this data
            $this->authorize('rental-list');
            Log::info("User [ID: {$userId}] authorized for fetching rental chart data.");

            $data = $this->chartDataService->getHistoricalChartDataService();

            return response()->json([
                'chartData' => $data['chartData'],
                'vehicleClasses' => $data['vehicleClasses'],
            ]);

        } catch (AuthorizationException $e) {
            Log::warning("Authorization failed for User [ID: {$userId}] fetching chart data: " . $e->getMessage());
            return response()->json(['error' => 'Unauthorized'], 403);
        } catch (\Exception $e) { // Catch generic Exception
            Log::error("Error fetching chart data for User [ID: {$userId}]: " . $e->getMessage(), ['exception' => $e]);
            return response()->json(['error' => 'Could not load chart data.'], 500);
        }
    }

    public function getVehicleStockChartData(Request $request) // Or just 'index' if it's the main method for this resource
    {
        $userId = Auth::id() ?? 'guest';
        Log::info("User [ID: {$userId}] attempting to fetch chart data from API ChartController.");

        try {
            // Assuming 'dashboard-list' is the permission needed for this data
            $this->authorize('rental-list');
            Log::info("User [ID: {$userId}] authorized for fetching rental chart data.");

            $data = $this->chartDataService->getVehicleStockChartDataService();
            //dd($data['chartData']);
            return response()->json([
                'chartData' => $data['chartData'],
                'vehicleClassIdToKeyName' => $data['vehicleClassIdToKeyName'],
                'grandTotalAvailableVehicles' => $data['grandTotalAvailableVehicles'],
            ]);

        } catch (AuthorizationException $e) {
            Log::warning("Authorization failed for User [ID: {$userId}] fetching chart data: " . $e->getMessage());
            return response()->json(['error' => 'Unauthorized'], 403);
        } catch (\Exception $e) { // Catch generic Exception
            Log::error("Error fetching chart data for User [ID: {$userId}]: " . $e->getMessage(), ['exception' => $e]);
            return response()->json(['error' => 'Could not load chart data.'], 500);
        }
    }
}