<?php

namespace App\Http\Controllers\Internals;

use App\Http\Controllers\Controller;
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

            // --- Fetch Contact Types (still needed for dropdowns/filters probably) ---
            $contactTypes = Types::with('creator:id,name', 'contacts')
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

            $rentals = Rentals::with([
                'vehicle:id,vehicle_no',
                'customer:id,first_name,last_name',
                'incharger:id,name',
                'creator:id,name',
                'status'
            ])->get();
            $formattedRentals = $rentals->map(function (Rentals $rental) {
                // --- Correctly concatenate first and last names with a space ---
                // Check if customer relationship and names exist before concatenating
                $firstName = $rental->customer->first_name ?? '';
                $lastName = $rental->customer->last_name ?? '';
                // Concatenate with a space, handle cases where one or both might be empty
                $full_name = trim($firstName . ' ' . $lastName);
                // If the result is an empty string after trimming, set to 'N/A'
                if (empty($full_name)) {
                    $full_name = 'N/A';
                }
                
                // Get the loaded active deposits collection
                $activeDeposits = Deposits::where('rental_id', $rental->id)
                ->where('is_active', true)
                ->get();


                $contacts = Contacts::where('customer_id', $rental->customer_id)
                ->where('is_active', true)
                ->get();

                // --- Logic to find primary deposits ---
                $primaryContact = $contacts->firstWhere('is_primary', true)
                               ?? $contacts->firstWhere('is_primary', false) // Fallback
                               ?? null; // Final fallback

                $primaryContactType = $primaryContact?->contactType?->name ?? 'N/A';
                $primaryContactValue = $primaryContact?->contact_value ?? 'N/A';
                $activeContactCount = $contacts->count();

                // --- Logic to find primary deposit ---
                $primaryDeposit = $activeDeposits->firstWhere('is_primary', true)
                               ?? $activeDeposits->firstWhere('is_primary', false) // Fallback
                               ?? null; // Final fallback

                $primaryDepositType = $primaryDeposit?->depositType->name ?? 'N/A';
                $primaryDepositValue = $primaryDeposit?->deposit_value ?? 'N/A';
                $activeDepositsCount = $activeDeposits->count();

                $formattedActiveContacts = $contacts->map(function ($contact) {
                    return [
                        'id' => $contact->id,
                        'contact_type_id' => $contact->contact_type_id,
                        'contact_type_name' => $contact->contactType?->name ?? 'N/A',
                        'contact_value' => $contact->contact_value,
                        'description' => $contact->description,
                        'is_primary' => $contact->is_primary,
                        'is_active' => $contact->is_active ? 'Yes' : 'No',
                         'created_at' => $contact->created_at?->toISOString(),
                         'updated_at' => $contact->updated_at?->toISOString(),
                    ];
                });
                $formattedActiveDeposits = $activeDeposits->map(function ($deposit) {
                    return [
                        'id' => $deposit->id,
                        'type_id' => $deposit->type_id,
                        'type_name' => $deposit->depositType?->name ?? 'N/A',
                        'deposit_value' => $deposit->deposit_value,
                        'registered_number' => $deposit->registered_number,
                        'expiry_date' => $deposit->expiry_date?->toISOString(),
                        'description' => $deposit->description,
                        'is_primary' => $deposit->is_primary,
                        'is_active' => $deposit->is_active ? 'Yes' : 'No',
                         'created_at' => $deposit->created_at?->toISOString(),
                         'updated_at' => $deposit->updated_at?->toISOString(),
                    ];
                });

                // Calculate how long each rental is overdue
                $overdueRentals = Rentals::overdue()
                ->where('id', $rental->id)
                ->whereNull('actual_return_date')
                ->where('end_date', '<', now())
                ->get();
                // Calculate how long each rental is overdue
                    foreach ($overdueRentals as $rental) {
                        // Ensure end_date is a Carbon instance (it should be due to $casts in model)
                        if ($rental->end_date instanceof Carbon) {
                            // Calculate the difference in days from the end_date to now
                            $overdueDays = $rental->end_date->diffInDays(Carbon::now());
                            // You can also get a human-readable format, e.g., "3 days ago"
                            $overdueHuman = $rental->end_date->diffForHumans(Carbon::now(), true); // 'true' for absolute difference

                            $rental->overdue_duration_days = $overdueDays;
                            $rental->overdue_duration_human = $overdueHuman;
                        } else {
                            // Handle cases where end_date might not be a Carbon instance (though it should be)
                            $rental->overdue_duration_days = null;
                            $rental->overdue_duration_human = 'N/A';
                        }
                    }
            
                // --- Return the formatted array ---
                return [
                    // Basic
                    'id' => $rental->id,

                    // Vehicle - Use null coalescing operator correctly
                    'vehicle_no' => $rental->vehicle?->vehicle_no ?? 'N/A', // Optional chaining for related object property
            
                    // --- Use the calculated $full_name variable directly ---
                    'full_name' => $full_name, // Already handled 'N/A' case above

                    // Contact
                    'primary_contact_type' => $primaryContactType,
                    'primary_contact' => $primaryContactValue,
                    'active_contact_count' => $activeContactCount,

                    // Deposit
                    'primary_deposit_type' => $primaryDepositType,
                    'primary_deposit' => $primaryDepositValue,
                    'active_deposits_count' => $activeDepositsCount,

                    // Use the newly formatted collections
                    'activeContacts' => $formattedActiveContacts,
                    'activeDeposits' => $formattedActiveDeposits, // Use formatted deposits

                    // Status and Pricing
                    'status_name' => $rental->status,
                    'total_cost' => $rental->total_cost,
                    
                    // Date
                    'start_date' => $rental->start_date,
                    'end_date' => $rental->end_date,
                    'period' => $rental->period,
                    'overdue' => $rental->overdue_duration_human,

                    // Additional Info
                    'notes' => $rental->notes ?? 'N/A', // Null coalescing for notes
                    'incharger_name' => $rental->incharger?->name ?? 'Initial', // Optional chaining for creator name
                    'user_name' => $rental->creator?->name ?? 'Initial', // Optional chaining for creator name
                    'created_at' => $rental->created_at?->toISOString() ?? 'N/A', // Optional chaining for dates
                    'updated_at' => $rental->updated_at?->toISOString() ?? 'N/A', // Optional chaining for dates
                ];
            });
            
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
                    'current_Rentals_id' => $vehicle->current_rental_id,
                    'notes' => $vehicle->notes ?? 'N/A',
                    'photo_path' => $vehicle->photo_path ? Storage::url($vehicle->photo_path) : null,
                    'user_name' => $vehicle->creator?->name ?? 'Initial',
                    'created_at' => $vehicle->created_at?->toISOString(),
                    'updated_at' => $vehicle->updated_at?->toISOString(),
                ];
            });

            $availableVehicles = Vehicles::available()->get();
            $formattedAvailableVehicles = $availableVehicles->map(function (Vehicles $vehicle) {
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
