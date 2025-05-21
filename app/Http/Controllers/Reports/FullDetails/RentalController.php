<?php

namespace App\Http\Controllers\Reports\FullDetails;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Redirect;
use Inertia\Response;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log; // Ensure Log facade is imported
use Illuminate\Support\Arr;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Support\Collection;
use Illuminate\Database\Eloquent\Builder;
use Exception; // Import base Exception class
use Illuminate\Auth\Access\AuthorizationException; // Import specific exception

// Auth
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Foundation\Validation\ValidatesRequests;

// Model
use App\Models\Rentals;
use App\Models\Customers;
use App\Models\Vehicles;
use App\Models\VehicleStatus;
use App\Models\Contacts;
use App\Models\Deposits;
use App\Models\Deposits\DepositTypes;
use App\Models\User;

class RentalController extends Controller
{
    use AuthorizesRequests, ValidatesRequests;

    /**
     * Display a listing of the customers.
     *
     * @return \Inertia\Response
     */
    public function index(Rentals $rental): Response
    {
        $userId = Auth::id() ?? 'guest';
        Log::info("User [ID: {$userId}] attempting to access Rentals index.");

        try {
            $this->authorize('rental-list');
            Log::info("User [ID: {$userId}] authorized for rental-list.");

            // --- Fetch Customers ---
            Log::info("Fetching rentals, and creator for User [ID: {$userId}].");
            $rentals = Rentals::with([
                'vehicle:id,vehicle_no',
                'customer:id,first_name,last_name',
                'incharger:id,name',
                'creator:id,name',
                'status'
            ])
            ->withTrashed()
            ->where('customer_id', $rental->customer_id)
            ->orderBy('id', 'desc')
            ->get();

            // Get all available vehicles
            $availableVehicles = Vehicles::available()->get();
            // Get all unavailable vehicles
            $unavailableVehicles = Vehicles::unavailable()->get();
            // --- Format Data for View ---
            $formattedAvailableVehicles = $availableVehicles->map(function (Vehicles $vehicle) {
                return [
                    'id' => $vehicle->id,
                    'vehicle_no' => (string) $vehicle->vehicle_no,
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

            // Get all customers
            $customers = Customers::all();

            // --- Format Data for View ---
            $formattedCustomers = $customers->map(function (Customers $customer) { // Changed variable name for clarity
                $firstName = $customer->first_name ?? '';
                $lastName = $customer->last_name ?? '';
                // Concatenate with a space, handle cases where one or both might be empty
                $full_name = trim($firstName . ' ' . $lastName);
                // If the result is an empty string after trimming, set to 'N/A'
                if (empty($full_name)) {
                    $full_name = 'N/A';
                }
                return [
                    'id' => $customer->id,
                    'name' => $customer->full_name,
                ];
            });

            // --- Fetch Deposit Types (still needed for dropdowns/filters probably) ---
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

            $users = User::all();

            // --- Format Data for View ---
            $formattedUsers = $users->map(function (User $user) {
                return [
                    'id' => $user->id,
                    'name' => $user->name,
                ];
            });

            Log::info("Retrieved {$rentals->count()} rentals.");

            // Map the customer data for the frontend
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

                $deposits = Deposits::where('rental_id', $rental->id)
                ->get();
                
                // Get the loaded active deposits collection
                $activeDeposits = Deposits::where('rental_id', $rental->id)
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

                    // Additional Info
                    'notes' => $rental->notes ?? 'N/A', // Null coalescing for notes
                    'incharger_name' => $rental->incharger?->name ?? 'Initial', // Optional chaining for creator name
                    'user_name' => $rental->creator?->name ?? 'Initial', // Optional chaining for creator name
                    'created_at' => $rental->created_at?->toISOString() ?? 'N/A', // Optional chaining for dates
                    'updated_at' => $rental->updated_at?->toISOString() ?? 'N/A', // Optional chaining for dates
                ];
            });
            //dd($formattedRentals);
            Log::info("Finished formatting data. Rendering view for User [ID: {$userId}].");
            // --- Render View ---
            return Inertia::render('full-details/reports-rentals-index', [
                'rentals' => Inertia::defer(fn () => $formattedRentals),
                'availableVehicles' => Inertia::defer(fn () => $formattedAvailableVehicles),
                'vehicleStatuses' => Inertia::defer(fn () => $formattedVehicleStatuses),
                'customers' => Inertia::defer(fn () => $formattedCustomers),
                'depositTypes' => Inertia::defer(fn () => $formattedDepositTypes),
                'users' => Inertia::defer(fn () => $formattedUsers),
            ]);

        } catch (AuthorizationException $e) {
            Log::warning("Authorization failed for User [ID: {$userId}] accessing Customers index: " . $e->getMessage());
            abort(403, 'Unauthorized action.');
        }
    }
}
