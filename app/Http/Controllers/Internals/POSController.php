<?php

namespace App\Http\Controllers\Internals;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

use Carbon\Carbon;
use Exception;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\RedirectResponse;
use Inertia\Response;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

// Model
use App\Models\User;
use App\Models\Customers;
use App\Models\Vehicles;
use App\Models\Deposits\DepositTypes;
use App\Models\VehicleStatus;

// Auth
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Foundation\Validation\ValidatesRequests;

class POSController extends Controller
{
    use AuthorizesRequests, ValidatesRequests;

    public function index(): Response
    {
        $userId = Auth::id() ?? 'guest';
        Log::info("User [ID: {$userId}] attempting to access POS.");

        try {
            $this->authorize('pos-list');
            Log::info("User [ID: {$userId}] authorized for pos-list.");

            // Get all customers
            $customers = Customers::select('id', 'first_name', 'last_name')->get();

            // --- Format Customer Data for View ---
            $formattedCustomers = $customers->map(function (Customers $customer) {
                $firstName = $customer->first_name ?? '';
                $lastName = $customer->last_name ?? '';
                $full_name = trim($firstName . ' ' . $lastName);
                if (empty($full_name)) {
                    $full_name = 'N/A';
                }
                return [
                    'id' => $customer->id,
                    'name' => $customer->full_name,
                ];
            });

            // Vehicle Status
            $vehicleStatuses = VehicleStatus::select('id', 'status_name')->get();

            $formattedVehicleStatuses = $vehicleStatuses->map(function (VehicleStatus $vehicleStatus) {
                return [
                    'id' => $vehicleStatus->id,
                    'status_name' => (string) $vehicleStatus->status_name,
                ];
            });

            $depositTypes = DepositTypes::with('creator:id,name', 'deposits')
                ->where('is_active', true)
                ->orderBy('name', 'asc')
                ->get();

            // --- Format Data for View ---
            $formattedDepositTypes = $depositTypes->map(function (DepositTypes $depositType) { // Changed variable name for clarity
                return [
                    'id' => $depositType->id,
                    'name' => $depositType->name,
                ];
            });

            $users = User::select('id', 'name')->get();

            $this->authorize('vehicle-list');
            $vehicles = Vehicles::orderBy('vehicle_no', 'asc')
                              ->with(['vehicleMaker:id,name', 'vehicleModel:id,name', 'vehicleClasses:id,name', 'vehicleStatus:id,status_name', 'creator:id,name'])
                              ->get();
            
            // --- Format Vehicle Data for View ---
            $formattedVehicles = $vehicles->map(function (Vehicles $vehicle) {
                return [
                    'id' => $vehicle->id,
                    'vehicle_no' => $vehicle->vehicle_no,
                    'make' => $vehicle->vehicleMaker?->name ?? 'N/A',
                    'model' => $vehicle->vehicleModel?->name ?? 'N/A',
                    'year' => $vehicle->year,
                    'license_plate' => $vehicle->license_plate,
                    'vin' => $vehicle->vin ?? 'N/A',
                    'color' => $vehicle->color ?? 'N/A',
                    'engine_cc' => $vehicle->engine_cc ?? 'N/A',
                    'vehicle_class_name' => $vehicle->vehicleClasses?->name ?? 'N/A',
                    'vehicle_class_id' => $vehicle->vehicle_class_id ?? 'N/A',
                    'compensation_price' => $vehicle->compensation_price ?? 'N/A',
                    'purchase_price' => $vehicle->purchase_price ?? 'N/A',
                    'purchase_date' => $vehicle->purchase_date ? Carbon::parse($vehicle->purchase_date)->toDateString() : 'N/A',
                    'daily_rental_price' => $vehicle->daily_rental_price ?? 'N/A',
                    'weekly_rental_price' => $vehicle->weekly_rental_price ?? 'N/A',
                    'monthly_rental_price' => $vehicle->monthly_rental_price ?? 'N/A',
                    'current_status_name' => $vehicle->vehicleStatus?->status_name ?? 'N/A',
                    'current_status_id' => $vehicle->current_status_id ?? 'N/A',
                    'current_location' => $vehicle->current_location ?? 'N/A',
                    'current_Rentals_id' => $vehicle->current_Rentals_id,
                    'notes' => $vehicle->notes ?? 'N/A',
                    'user_name' => $vehicle->creator?->name ?? 'Initial',
                    'created_at' => $vehicle->created_at?->toISOString(),
                    'updated_at' => $vehicle->updated_at?->toISOString(),
                ];
            });
            $formattedAvailableVehicles = $vehicles->map(function (Vehicles $vehicle) {
                return [
                    'id' => $vehicle->id,
                    'vehicle_no' => (string) $vehicle->vehicle_no,
                ];
            });

            return Inertia::render('pos', [
                'customers' => Inertia::defer(fn () => $formattedCustomers),
                'availableVehicles' => Inertia::defer(fn () => $formattedAvailableVehicles),
                'vehicles' => Inertia::defer(fn () => $formattedVehicles),
                'users' => Inertia::defer(fn () => $users->toArray()),
                'vehicleStatuses' => Inertia::defer(fn () => $formattedVehicleStatuses),
                'depositTypes' => Inertia::defer(fn () => $formattedDepositTypes),
            ]);
        } catch (AuthorizationException $e) {
            Log::warning("Authorization failed for User [ID: {$userId}] accessing Dashboard: " . $e->getMessage());
            abort(403, 'Unauthorized action.');
        } catch (Exception $e) {
            Log::error("Error accessing Dashboard for User [ID: {$userId}]: " . $e->getMessage(), ['exception' => $e]);
            abort(500, 'Could not load dashboard data.');
        }
    }
}
