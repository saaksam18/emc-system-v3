<?php

namespace App\Http\Controllers\Internals;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

use Carbon\Carbon;
use Carbon\CarbonPeriod; // Still needed for index if it computes its own things
use Exception;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\Eloquent\Builder;
use Inertia\Response;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

// Import your new service
use App\Services\ChartDataService;

// Import models still needed for index() method
use App\Models\Customers;
use App\Models\Rentals;
use App\Models\User;
use App\Models\VehicleActualModel;
use App\Models\VehicleClasses;
use App\Models\VehicleMaker;
use App\Models\Vehicles;
use App\Models\VehicleStatus;

// Auth
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Foundation\Validation\ValidatesRequests;

class DashboardController extends Controller
{
    use AuthorizesRequests, ValidatesRequests;

    protected $chartDataService;

    // Inject the service via constructor
    public function __construct(ChartDataService $chartDataService)
    {
        $this->chartDataService = $chartDataService;
    }

    /**
     * Display a listing of the customers.
     *
     * @return \Inertia\Response
     */
    public function index(): Response
    {
        // ... (your existing index method logic, no changes needed for chart data here)
        // You can keep all the other dashboard data fetching here.
        // It's still good to pass vehicleClassesWithColors for initial chart config on the dashboard if needed.

        $userId = Auth::id() ?? 'guest';
        Log::info("User [ID: {$userId}] attempting to access Dashboard.");

        try {
            $this->authorize('dashboard-list');
            Log::info("User [ID: {$userId}] authorized for dashboard-list.");
            return Inertia::render('dashboard');

        } catch (AuthorizationException $e) {
            Log::warning("Authorization failed for User [ID: {$userId}] accessing Dashboard: " . $e->getMessage());
            abort(403, 'Unauthorized action.');
        } catch (Exception $e) {
            Log::error("Error accessing Dashboard for User [ID: {$userId}]: " . $e->getMessage(), ['exception' => $e]);
            abort(500, 'Could not load dashboard data.');
        }
    }

    /**
     * Fetches the historical chart data.
     * This method will be called via an XHR request from the frontend.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function getChartData(Request $request)
    {
        $userId = Auth::id() ?? 'guest';
        Log::info("User [ID: {$userId}] attempting to fetch chart data.");

        try {
            $this->authorize('dashboard-list');
            Log::info("User [ID: {$userId}] authorized for fetching chart data.");

            // Call the service method to get the data
            $data = $this->chartDataService->getHistoricalChartData();

            return response()->json([
                'chartData' => $data['chartData'],
                'vehicleClasses' => $data['vehicleClasses'],
            ]);

        } catch (AuthorizationException $e) {
            Log::warning("Authorization failed for User [ID: {$userId}] fetching chart data: " . $e->getMessage());
            return response()->json(['error' => 'Unauthorized'], 403);
        } catch (Exception $e) {
            Log::error("Error fetching chart data for User [ID: {$userId}]: " . $e->getMessage(), ['exception' => $e]);
            return response()->json(['error' => 'Could not load chart data.'], 500);
        }
    }

    // Remove the private getTotalFleetSizeForDate method as it's now in the service
    // private function getTotalFleetSizeForDate(Carbon $endDate): int { ... }
}