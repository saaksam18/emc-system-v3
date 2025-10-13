<?php

namespace App\Http\Controllers\Internals;

use App\Http\Controllers\Controller;
use App\Models\Accountings\ChartOfAccounts;
use Illuminate\Http\Request;

use Carbon\Carbon;
use Exception;
use Illuminate\Auth\Access\AuthorizationException;
use Inertia\Response;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

// Model
use App\Models\User;
use App\Models\Customers;
use App\Models\Vehicles;
use App\Models\Deposits\DepositTypes;
use App\Models\VehicleStatus;
use App\Models\Contacts\Types;
use App\Models\Rentals;
use App\Models\Contacts;
use App\Models\Deposits;

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

            // --- Fetch only the absolutely required data (or use deferred loading for others) ---
            // Assuming you still need customers, users, etc., for dropdowns in the POS view.
            // If not, you can remove these sections entirely.

            // Eager load all necessary relationships for Vehicles
            $vehicles = Vehicles::orderBy('vehicle_no', 'asc')
                            ->with([
                                'vehicleMaker:id,name',
                                'vehicleModel:id,name',
                                'vehicleClasses:id,name',
                                'vehicleStatus:id,status_name',
                                'creator:id,name'
                            ])
                            ->get();
            
            // --- Format Vehicle Data for View ---
            $formattedVehicles = $vehicles->map(function (Vehicles $vehicle) {
                return [
                    'id' => $vehicle->id,
                    'vehicle_no' => $vehicle->vehicle_no,
                    'make' => $vehicle->vehicleMaker?->name ?? 'N/A',
                    'model' => $vehicle->vehicleModel?->name ?? 'N/A',
                    'year' => $vehicle->year,
                    'color' => $vehicle->color ?? 'N/A',
                    'current_status_name' => $vehicle->vehicleStatus?->status_name ?? 'N/A',
                    'current_status_id' => $vehicle->current_status_id ?? 'N/A',
                    'current_Rentals_id' => $vehicle->current_rental_id,
                    'photo_path' => $vehicle->photo_path ? Storage::url($vehicle->photo_path) : null,
                ];
            });

            $availableVehicles = Vehicles::available()->select('id', 'vehicle_no')->get();
            $formattedAvailableVehicles = $availableVehicles->map(fn ($v) => ['id' => $v->id, 'vehicle_no' => (string)$v->vehicle_no]);

            // Get all customers (minimal data)
            $customers = Customers::select('id', 'first_name', 'last_name')->orderBy('id', 'desc')->get();
            $formattedCustomers = $customers->map(function (Customers $customer) {
                $full_name = trim(($customer->first_name ?? '') . ' ' . ($customer->last_name ?? ''));
                return ['id' => $customer->id, 'name' => empty($full_name) ? 'N/A' : $full_name];
            });
            $users = User::select('id', 'name')->get();
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
                    'status_name' => (string) $vehicleStatus->status_name,
                ];
            });

            $depositTypes = DepositTypes::select('id', 'name') // Reduced selected columns
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

            // **The key fix for N+1 and data reduction is here:**
            // Eager load only the essential relationships and constrain deposits.
            $rentals = Rentals::select('id', 'vehicle_id', 'customer_id', 'status', 'end_date') // Select only columns you need from Rentals
                ->with([
                    // Only Vehicle ID and No.
                    'vehicle:id,vehicle_no',
                    // Only Customer ID and Names
                    'customer:id,first_name,last_name',
                    // Eager load only active deposits and their type (DepositTypes must be an available model)
                    'deposits' => function ($query) {
                        $query->select('id', 'rental_id', 'type_id', 'deposit_value', 'is_primary') // Minimal columns
                            ->where('is_active', true)
                            ->with('depositType:id,name'); // Load the deposit type name
                    },
                    'status' // Keep status if you need to display it
                ])
                ->get();

            // --- Format Rental Data for View (Only required data) ---
            $formattedRentals = $rentals->map(function (Rentals $rental) {
                // Customer Name
                $firstName = $rental->customer->first_name ?? '';
                $lastName = $rental->customer->last_name ?? '';
                $full_name = trim($firstName . ' ' . $lastName);
                if (empty($full_name)) {
                    $full_name = 'N/A';
                }

                // Active Deposit Logic (Eager loaded via relationship)
                $activeDeposits = $rental->deposits;

                // Logic to find primary deposit
                $primaryDeposit = $activeDeposits->firstWhere('is_primary', true)
                            ?? $activeDeposits->firstWhere('is_primary', false)
                            ?? null;

                $primaryDepositType = $primaryDeposit?->depositType?->name ?? 'N/A';
                $primaryDepositValue = $primaryDeposit?->deposit_value ?? 'N/A';

                return [
                    'id' => $rental->id,
                    'vehicle_no' => $rental->vehicle->vehicle_no ?? 'N/A',
                    'full_name' => $full_name,
                    
                    // Active Deposit
                    'primary_deposit_type' => $primaryDepositType,
                    'primary_deposit' => $primaryDepositValue,
                    'active_deposits_count' => $activeDeposits->count(),
                    
                    // Status and Overdue (optional but useful)
                    'status_name' => $rental->status,
                    'overdue' => $rental->overdue_duration_human ?? null,
                ];
            });

            return Inertia::render('pos', [
                'vehicles' => $formattedVehicles,
                'availableVehicles' => Inertia::defer(fn () => $formattedAvailableVehicles),
                'customers' => Inertia::defer(fn () => $formattedCustomers),
                'users' => Inertia::defer(fn () => $users->toArray()),
                'chartOfAccounts' => Inertia::defer(fn () => $chartOfAccounts),
                'vehicleStatuses' => Inertia::defer(fn () => $formattedVehicleStatuses),
                'depositTypes' => Inertia::defer(fn () => $formattedDepositTypes),
                'contactTypes' => Inertia::defer(fn () => $formattedContactTypes),
                'rentals' => Inertia::defer(fn () => $formattedRentals),
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
