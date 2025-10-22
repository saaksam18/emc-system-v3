<?php

namespace App\Http\Controllers\Internals\Rentals;

use App\Http\Controllers\Controller;
use App\Models\Accountings\ChartOfAccounts;
use App\Models\Contacts\Types;
use App\Models\Customers;
use App\Models\Deposits\DepositTypes;
use App\Models\Rentals;
use App\Models\User;
use App\Models\Vehicles;
use App\Models\VehicleStatus;
use Exception;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

// Auth
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Foundation\Validation\ValidatesRequests;

class TransactionController extends Controller
{
    use AuthorizesRequests, ValidatesRequests;

    public function index(Vehicles $vehicle) {
        $userId = Auth::id() ?? 'guest';
        Log::info("User [ID: {$userId}] attempting to access POS.");

        try {
            $this->authorize('rental-create');
            Log::info("User [ID: {$userId}] authorized for rental-create.");

            // Eager load all necessary relationships for the SINGLE Vehicle
            $vehicle = Vehicles::with([
                                'vehicleMaker:id,name',
                                'vehicleModel:id,name',
                                'vehicleClasses:id,name',
                                'vehicleStatus:id,status_name',
                                'creator:id,name'
                            ])
                            ->findOrFail($vehicle->id);
            
            // --- Format Vehicle Data for View ---
            $formattedVehicles =  [
                    'id' => $vehicle->id,
                    'vehicle_no' => $vehicle->vehicle_no,
                    'make' => $vehicle->vehicleMaker?->name ?? 'N/A',
                    'model' => $vehicle->vehicleModel?->name ?? 'N/A',
                    'year' => $vehicle->year,
                    'color' => $vehicle->color ?? 'N/A',
                    'current_status_name' => $vehicle->vehicleStatus?->status_name ?? 'N/A',
                    'vehicle_class' => $vehicle->vehicleClasses?->name ?? 'N/A',
                    'current_status_id' => $vehicle->current_status_id ?? 'N/A',
                    'current_Rentals_id' => $vehicle->current_rental_id,
                    'photo_path' => $vehicle->photo_path ? Storage::url($vehicle->photo_path) : null,
                    'compensation_price' => $vehicle->compensation_price ?? 'N/A',
                    'license_plate' => $vehicle->license_plate ?? 'N/A',
                ];

            // Get all customers (minimal data)
            //$customers = Customers::select('id', 'first_name', 'last_name')->orderBy('id', 'desc')->get();
            $customers = Customers::with([
                // Eager load active contacts AND their associated contactType relationship
                'activeContacts.contactType',
                // Eager load active deposits (assuming you might need details later)
                'activeDeposits.depositType',
                'creator:id,name' // load creator efficiently
            ])
            ->orderBy('id', 'desc')
            ->get();
            $formattedCustomers = $customers->map(function (Customers $customer) {
                $full_name = trim(($customer->first_name ?? '') . ' ' . ($customer->last_name ?? ''));
                return ['id' => $customer->id, 'name' => empty($full_name) ? 'N/A' : $full_name];
            });
            $chartOfAccounts = ChartOfAccounts::orderBy('name')->get()->toArray();
            // --- Fetch Contact Types (still needed for dropdowns/filters probably) ---
            $contactTypes = Types::select('id', 'name')
                ->where('is_active', true)
                ->orderBy('name', 'asc')
                ->get();

            // --- Format Data for View ---
            $formattedContactTypes = $contactTypes->map(function (Types $contactType) { // Changed variable name for clarity
                return [
                    'id' => $contactType->id,
                    'name' => $contactType->name,
                ];
            });

            // Vehicle Status
            $vehicleStatuses = VehicleStatus::select('id', 'status_name')->get();

            $formattedVehicleStatuses = $vehicleStatuses->map(function (VehicleStatus $vehicleStatus) {
                return [
                    'id' => $vehicleStatus->id,
                    'name' => (string) $vehicleStatus->status_name,
                ];
            });

            $depositTypes = DepositTypes::select('id', 'name') // Reduced selected columns
                ->where('is_active', true)
                ->orderBy('id', 'asc')
                ->get();

            // --- Format Data for View ---
            $formattedDepositTypes = $depositTypes->map(function (DepositTypes $depositType) { // Changed variable name for clarity
                return [
                    'id' => $depositType->id,
                    'name' => $depositType->name,
                ];
            });

            $users = User::select('id', 'name')->get();

            return Inertia::render('rentals/transaction-processing', [
                'vehicle' => Inertia::defer(fn () => $formattedVehicles),
                'customers' => Inertia::defer(fn () => $formattedCustomers),
                'users' => Inertia::defer(fn () => $users->toArray()),
                'chartOfAccounts' => Inertia::defer(fn () => $chartOfAccounts),
                'vehicleStatuses' => Inertia::defer(fn () => $formattedVehicleStatuses),
                'depositTypes' => Inertia::defer(fn () => $formattedDepositTypes),
                'contactTypes' => Inertia::defer(fn () => $formattedContactTypes),
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
