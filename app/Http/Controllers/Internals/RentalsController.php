<?php

namespace App\Http\Controllers\Internals;

use App\Http\Controllers\Controller;
use App\Http\Requests\Internals\ExtendContractRequest;
use App\Http\Requests\Internals\StoreExtendRentalRequest;
use App\Http\Requests\Internals\StoreRentalRequest;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Redirect;
use Inertia\Response;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Arr;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Support\Collection;
use Illuminate\Database\Eloquent\Builder;
use Exception;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Validation\ValidationException;

// Model
use App\Models\Rentals;
use App\Models\Customers;
use App\Models\Vehicles;
use App\Models\VehicleStatus;
use App\Models\Contacts;
use App\Models\Deposits;
use App\Models\Deposits\DepositTypes;
use App\Models\User;
use App\Services\SaleService;
// Auth
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Foundation\Validation\ValidatesRequests;

class RentalsController extends Controller
{
    use AuthorizesRequests, ValidatesRequests;

    /**
     * Display a listing of the customers.
     *
     * @return \Inertia\Response
     */
    public function index(): Response
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
            ->where('status', '!=', 'Return')
            ->get();

            // Get all available vehicles
            $availableVehicles = Vehicles::available()->orderBy('vehicle_no', 'asc')->get();
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
            $customers = Customers::orderBy('id', 'desc')->get();

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
                ->orderBy('id', 'asc')
                ->get();

            // --- Format Data for View ---
            $formattedDepositTypes = $depositTypes->map(function (DepositTypes $depositType) { // Changed variable name for clarity
                return [
                    'id' => $depositType->id,
                    'name' => $depositType->name,
                ];
            });

            $users = User::orderBy('name', 'asc')->get();

            // --- Format Data for View ---
            $formattedUsers = $users->map(function (User $user) {
                return [
                    'id' => $user->id,
                    'name' => $user->name,
                ];
            });

            Log::info("Retrieved {$rentals->count()} rentals.");

            // Count Deposit
            $deposits = Deposits::where('is_active', true)->get();

            $numericDepositSum = 0;
            $textDepositCount = 0;
            $textDepositValues = [];
            $overdueRentalsCount = Rentals::overdue()->count();

            // Iterate through each deposit to categorize and aggregate deposit_value
            foreach ($deposits as $deposit) {
                $value = $deposit->deposit_value;

                // Check if the value is numeric.
                // is_numeric() handles both integer and float strings.
                if (is_numeric($value)) {
                    $numericDepositSum += (float) $value; // Cast to float to handle decimal numbers
                } else {
                    $textDepositCount++;
                    $textDepositValues[] = $value; // Store the text value if needed
                }
            }

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
                        'visa_type' => $deposit->visa_type,
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
            //dd($formattedRentals);
            Log::info("Finished formatting data. Rendering view for User [ID: {$userId}].");
            // --- Render View ---
            return Inertia::render('rentals/rentals-index', [
                'rentals' => Inertia::defer(fn () => $formattedRentals),
                'availableVehicles' => Inertia::defer(fn () => $formattedAvailableVehicles),
                'vehicleStatuses' => Inertia::defer(fn () => $formattedVehicleStatuses),
                'customers' => Inertia::defer(fn () => $formattedCustomers),
                'depositTypes' => Inertia::defer(fn () => $formattedDepositTypes),
                'numericDepositSum' => Inertia::defer(fn () => $numericDepositSum),
                'textDepositCount' => Inertia::defer(fn () => $textDepositCount),
                'overdueRentalsCount' => Inertia::defer(fn () => $overdueRentalsCount),
                'users' => Inertia::defer(fn () => $formattedUsers),
            ]);

        } catch (AuthorizationException $e) {
            Log::warning("Authorization failed for User [ID: {$userId}] accessing Customers index: " . $e->getMessage());
            abort(403, 'Unauthorized action.');
        } 
    }

    protected $saleService;

    public function __construct(SaleService $saleService)
    {
        $this->saleService = $saleService;
    }

    public function store(StoreRentalRequest $request): RedirectResponse
    {
        $userId = Auth::id();
        try {
            // Use the validated data array directly
            $validatedData = $request->validated();

            DB::beginTransaction();

            // Fetch the full vehicle model, not just the ID (already validated to exist)
            $vehicle = Vehicles::where('id', $validatedData['vehicle_id'])->firstOrFail();

            // DateTime conversion
            $actualStartDate = \Carbon\Carbon::parse($validatedData['actual_start_date'])->format('Y-m-d');
            $endDate = \Carbon\Carbon::parse($validatedData['end_date'])->format('Y-m-d');

            // --- 1. Create the Rental Record ---
            $rental = new Rentals();
            $rental->fill([
                'vehicle_id' => $vehicle->id,
                'customer_id' => $validatedData['customer_id'],
                'actual_start_date' => $actualStartDate,
                'start_date' => $actualStartDate,
                'end_date' => $endDate,
                'period' => $validatedData['period'],
                'coming_date' => $validatedData['coming_date'] ?? null,
                'total_cost' => $validatedData['total_cost'],
                'status' => 'New Rental',
                'notes' => $validatedData['notes'] ?? null,
                'is_active' => true,
                'incharger_id' => $validatedData['incharger_id'],
                'user_id' => $userId,
            ]);
            $rental->save();

            // --- 2. Create SALE Records using the Service ---
            $customer_id = $validatedData['customer_id'];
            
            foreach ($validatedData['payments'] as $payment) {
                $saleData = [
                    'customer_id' => $customer_id,
                    'sale_date' => $actualStartDate,
                    'item_description' => $payment['description'],
                    'amount' => $payment['amount'],
                    'payment_type' => $payment['payment_type'],
                    'credit_account_id' => $payment['credit_account_id'],
                    'debit_target_account_id' => $payment['debit_target_account_id'] ?? null,
                    'memo_ref_no' => $rental->id,
                ];
                $this->saleService->recordSale($saleData, $rental->id);
            }

            // --- 2. Update the Vehicle Record ---
            $vehicle->current_rental_id = $rental->id;
            $vehicle->current_location = 'With customer';
            $vehicle->current_status_id = $validatedData['status_id'];
            $vehicle->save();

            // --- 3. Create Deposits ---
            if (!empty($validatedData['activeDeposits'])) {
                $depositsToInsert = [];
                
                foreach ($validatedData['activeDeposits'] as $depositData) {
                    $depositTypeId = $depositData['deposit_type'] ?? null;
                    if (!$depositTypeId) {
                        // This is a safety net; validation should have caught this.
                        DB::rollBack();
                        throw new \Exception("An invalid deposit type was processed.");
                    }
                    $depositsToInsert[] = [
                        'customer_id' => $validatedData['customer_id'],
                        'rental_id' => $rental->id,
                        'type_id' => $depositTypeId,
                        'deposit_value' => $depositData['deposit_value'], 
                        'is_primary' => $depositData['is_primary'] ?? false,
                        'visa_type' => $depositData['visa_type'] ?? null,
                        'expiry_date' => $depositData['expiry_date'] ?? null,
                        'description' => $depositData['description'] ?? null,
                        'is_active' => true,
                        'start_date' => now(),
                        'user_id' => $userId,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];
                }
                if (!empty($depositsToInsert)) {
                    Deposits::insert($depositsToInsert);
                }
            }
            DB::commit();

            // --- Success Response ---
            $successMessage = 'Rental of vehicle no. ' . $vehicle->vehicle_no . ' successfully registered (ID: ' . $rental->id . ').';
            return redirect()->back()->with('success', $successMessage);

            } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            DB::rollBack();
            // ... (Error handling remains the same)
            $modelName = match(true) {
                str_contains($e->getMessage(), 'Vehicles') => 'vehicle',
                str_contains($e->getMessage(), 'Customers') => 'customer',
                str_contains($e->getMessage(), 'User') => 'incharge person',
                str_contains($e->getMessage(), 'VehicleStatus') => 'vehicle status',
                default => 'required information'
            };
            return Redirect::back()->withInput()->with('error', "The selected {$modelName} could not be found. Please check your selection.");
        } 
        /* catch (\Exception $e) {
            DB::rollBack();
            // Log other exceptions and return a generic error
            Log::error("General error during rental creation for User [ID: {$userId}]: " . $e->getMessage());
            return Redirect::back()->withInput()->with('error', 'An unexpected error occurred during rental creation. Please try again.');
        } */
    }

    /**
     * Remove the specified rental from storage after verifying admin password.
     *
     * @param Request $request
     * @param Rentals $rental The rental instance injected by route model binding.
     * @return RedirectResponse
     * @throws AuthorizationException
     */
    public function destroy(Request $request, Rentals $rental): RedirectResponse
    {
        // Get authenticated user's ID early for logging/tracking
        $userId = Auth::id();

        // 1. Authorize: Ensure the authenticated user has permission.
        // Use the existing $rental instance passed via route model binding.
        $this->authorize('rental-delete', $rental); // Assuming 'rental-delete' policy exists

        try {
            // --- Prepare Identifier for Messages (Fetch before validation) ---
            $customer = $rental->customer; // Use the relationship if defined
            $customerIdentifier = 'N/A'; // Default identifier
            if ($customer) {
                $firstName = $customer->first_name ?? '';
                $lastName = $customer->last_name ?? '';
                $full_name = trim($firstName . ' ' . $lastName);
                // Use full name if available, otherwise fallback to Customer ID
                $customerIdentifier = !empty($full_name) ? $full_name : ('Customer ID: ' . $customer->id);
            } else {
                // Fallback if customer relationship is missing or customer deleted
                $customerIdentifier = 'Rental ID: ' . $rental->id;
            }
            // --- End Prepare Identifier ---

            // 2. Validate Input with Custom Messages
            $rules = [
                'status_name' => [
                    'required',
                    'string',
                    // Ensure the status name exists in the vehicle_statuses table
                    Rule::exists('vehicle_statuses', 'status_name'),
                    // Custom closure to check against the vehicle's current status
                    function ($attribute, $value, $fail) use ($request, $rental) {
                        // Find the vehicle using the vehicle_id from the rental
                        // Use find() for potentially better performance if ID is known
                        $vehicle = Vehicles::find($rental->vehicle_id);
                        // Find the status ID corresponding to the submitted status_name
                        $selectedStatus = VehicleStatus::where('status_name', $value)->first();

                        // If vehicle or status type not found (should be caught by earlier rules, but good practice)
                        if (!$vehicle || !$selectedStatus) {
                            // Fail silently here as other rules should catch non-existence
                            return;
                        }

                        // Compare the vehicle's current_status_id with the ID of the selected status_name
                        if ($vehicle->current_status_id == $selectedStatus->id) {
                            // Use the custom message defined below for the closure
                            $fail('The selected vehicle status (' . $value . ') is the same as its current status. Please choose a different status if you intend to change it.');
                        }
                    }
                ],
                'user_name' => ['required', 'string', Rule::exists('users', 'name')], // Validate incharger exists
                'actual_end_date' => 'required|date|after_or_equal:'.$rental->start_date, // Ensure return date is not before start date
                'period_difference' => 'required|numeric', // Represents the calculated duration/difference
                'total_cost' => 'required|numeric',
                'notes' => 'nullable|string|max:500', // Added max length for notes
            ];

            $messages = [
                // --- Custom Error Messages ---
                'status_name.required' => 'Please select a new status for the vehicle.',
                'status_name.string'   => 'The selected status must be a valid text value.',
                'status_name.exists'   => 'The selected status is invalid or does not exist.',
                // Incharger
                'user_name.required' => 'The incharge person is required.',
                'user_name.string' => 'The incharge name must be a string.',
                'user_name.exists' => 'The selected incharge person does not exist.',
                // Actual End Date
                'actual_end_date.required' => 'Return date is required.',
                'actual_end_date.date' => 'Return date must be a valid date.',
                'actual_end_date.after_or_equal' => 'Return date cannot be before the rental start date.',
                // Period Difference
                'period_difference.required' => 'The rental period calculation is required.',
                'period_difference.numeric' => 'The rental period must be a numeric value.',
                // Cost
                'total_cost.required' => 'Rental cost is required.',
                'total_cost.numeric' => 'Rental cost must be a number.',
                // Notes
                'notes.max' => 'Notes cannot exceed 500 characters.',
            ];

            // --- Define custom attributes for better error messages ---
            $attributes = [
                'user_name' => 'incharge person',
                'status_name' => 'vehicle status',
                'actual_end_date' => 'return date',
                'total_cost' => 'total cost',
                'period_difference' => 'rental period', // Changed attribute name for clarity
            ];

            // Use validate() which automatically handles redirection on failure
            $validatedData = $request->validate($rules, $messages, $attributes);

            // ******** ADDED LOGIC: Adjust total_cost based on period_difference ********
            // Ensure total_cost sign matches period_difference sign (e.g., negative period means refund/negative cost)
            $periodDifference = (float)$validatedData['period_difference'];
            $totalCost = (float)$validatedData['total_cost'];

            if ($periodDifference < 0 && $totalCost > 0) {
                // If period is negative (early return with refund?), cost should be negative.
                $validatedData['total_cost'] = -abs($totalCost);
            } elseif ($periodDifference >= 0 && $totalCost < 0) {
                // If period is non-negative, cost should generally be non-negative.
                // Adjust this logic if negative costs are valid for non-negative periods in specific cases.
                $validatedData['total_cost'] = abs($totalCost);
            }
            // Ensure it's stored as float/decimal if needed by DB schema
            $validatedData['total_cost'] = (float) $validatedData['total_cost'];


            // --- Start Database Transaction ---
            DB::beginTransaction();

            // --- Find related models needed for updates ---
            // Find the User model instance for the incharger using the validated name
            $incharger = User::where('name', $validatedData['user_name'])->firstOrFail();
            // Find the VehicleStatus model instance using the validated status name
            $newStatus = VehicleStatus::where('status_name', $validatedData['status_name'])->firstOrFail();
            // Find the Vehicle model instance using the vehicle_id from the rental
            $vehicle = Vehicles::find($rental->vehicle_id); // Use find() as ID is known

            // --- ** NEW: Replicate the Rental Record Before Modification ** ---
            $archivedRental = $rental->replicate(); // Create a copy of the original data
            // Modify the replicated record to mark it as an archive
            $archivedRental->status = 'Return';
            $archivedRental->actual_return_date = $validatedData['actual_end_date']; // Use validated actual return date
            $archivedRental->end_date = $validatedData['actual_end_date'];
            $archivedRental->notes = $validatedData['notes']; // Update notes
            $archivedRental->incharger_id = $incharger->id; // Track who processed the return
            $archivedRental->user_id = $userId; // Track the user performing the action
            $archivedRental->period = $validatedData['period_difference']; // Store the calculated period
            $archivedRental->total_cost = $validatedData['total_cost'];
            $archivedRental->created_at = now();
            $archivedRental->updated_at = now();
            // Remove the soft delete timestamp if replicating a non-deleted record
            $archivedRental->deleted_at = $validatedData['actual_end_date'];
            // Save the archived copy.
            // Note: This assumes no unique constraints (other than PK) will conflict.
            // If conflicts exist (e.g., unique rental agreement number), adjust data or schema.
            $archivedRental->save();
            // --- ** End Replication Logic ** ---

            // 3. Update related Deposits (if applicable)
            $activeDeposits = Deposits::where('rental_id', $rental->id)
                                    ->where('is_active', true) // Corrected typo: where instead of whare
                                    ->get(); // Get a collection of deposits

            if ($activeDeposits->isNotEmpty()) {
                foreach ($activeDeposits as $originalDeposit) {
                    // Replicate the original deposit for the archived rental
                    $archivedDeposit = $originalDeposit->replicate();
                    $archivedDeposit->rental_id = $archivedRental->id; // Link to the new archived rental
                    $archivedDeposit->is_active = false;
                    $archivedDeposit->end_date = $validatedData['actual_end_date'];
                    $archivedDeposit->created_at = now(); // Set new timestamps
                    $archivedDeposit->updated_at = now();
                    // Ensure is_active is true for the new deposit record, or set as per your business logic
                    $archivedDeposit->user_id = $userId;
                    $archivedDeposit->save();

                    // Deactivate the original deposit
                    $originalDeposit->is_active = false;
                    $originalDeposit->updated_at = now();
                    $originalDeposit->save();
                }
            } else {
                // Log if no active deposits were found for the original rental
                Log::info("No active deposits were found for Rental [ID: {$rental->id}] during vehicle change process by User [ID: {$userId}]. No deposits were archived or updated.");
            }

            // 4. Update related Vehicle
            if ($vehicle) {
                // Ensure the vehicle is currently linked to *this* specific rental before clearing
                if ($vehicle->current_rental_id == $rental->id) {
                    $vehicle->current_location = 'With EMC'; // Set location back to base
                    $vehicle->current_rental_id = null;     // Clear the link to the rental
                    $vehicle->current_status_id = $newStatus->id; // Update to the new status from validation
                    $vehicle->user_id = $userId;            // Track who updated the vehicle status
                    $vehicle->save();
                } else {
                    // Log if the vehicle wasn't linked to this rental as expected, but still update status
                    Log::warning("Vehicle [ID: {$vehicle->id}] was not linked to the expected Rental [ID: {$rental->id}] during return process by User [ID: {$userId}]. Status updated anyway.");
                    // Decide if updating status is still desired in this edge case
                    $vehicle->current_status_id = $newStatus->id;
                    $vehicle->user_id = $userId;
                    $vehicle->save();
                }
            } else {
                // This case should ideally not happen if rental has a valid vehicle_id, but handle defensively
                Log::error("Vehicle not found for Rental [ID: {$rental->id}] during return process by User [ID: {$userId}]. Vehicle ID was {$rental->vehicle_id}.");
                // Consider throwing an exception or returning an error if vehicle is critical
                 DB::rollBack(); // Rollback as a critical linked record is missing
                 return Redirect::back()
                     ->withInput() // Keep user's input
                     ->with('error', 'Associated vehicle could not be found. Cannot process return.');
            }

            // 5. Update the *Original* Rental Record with Return Details
            $rental->is_latest_version = false;
            $rental->is_active = false;

            $rental->save(); // Save the updates BEFORE soft deleting

            // 6. Perform Soft Deletion on the *updated original* rental record
            $rental->delete(); // This sets the `deleted_at` timestamp

            // 7. Commit Transaction
            DB::commit();

            // 8. Redirect on Success
            return to_route('rentals.index') // Use the correct route name for your rentals list
                   ->with('success', "Rental for {$customerIdentifier} successfully returned, archived, and vehicle status updated.");

        } catch (AuthorizationException $e) {
            DB::rollBack(); // Rollback transaction on authorization failure
            Log::warning("Authorization failed for User [ID: {$userId}] returning Rental [ID: {$rental->id}]: " . $e->getMessage());
            // Provide a user-friendly error message
            return Redirect::back()->with('error', 'You do not have permission to return this rental.');
        } catch (ValidationException $e) {
            // No need to rollback here, Laravel handles this before the transaction starts
            // Log the validation errors for debugging
            Log::warning("Validation failed for User [ID: {$userId}] returning Rental [ID: {$rental->id}].", [
                'errors' => $e->errors(),
                'request_data' => $request->except(['_token', 'password', 'password_confirmation']) // Exclude sensitive data
            ]);
            // Let Laravel handle the redirection back with errors automatically
            throw $e;
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            DB::rollBack(); // Rollback if a related model (User, Status) wasn't found during processing
            Log::error("Model not found during rental return for User [ID: {$userId}], Rental [ID: {$rental->id}]: " . $e->getMessage(), [
                    'request_data' => $request->except(['_token', 'password', 'password_confirmation'])
            ]);
            // Determine which model was not found if possible, or provide a general error
            $modelName = match(true) {
                // Check message content to guess the missing model
                str_contains($e->getMessage(), 'App\Models\User') => 'incharge person',
                str_contains($e->getMessage(), 'App\Models\VehicleStatus') => 'vehicle status',
                // Add other models if necessary
                default => 'required information' // Fallback message
            };
            return Redirect::back()
                ->withInput() // Keep user's input
                ->with('error', "The selected {$modelName} could not be found. Please check your selection and try again.");
        } catch (\Throwable $e) { // Catch any other unexpected errors
            DB::rollBack(); // Rollback transaction on any other errors
            Log::critical("An unexpected error occurred during rental return for User [ID: {$userId}], Rental [ID: {$rental->id}]: " . $e->getMessage(), [
                'exception' => $e,
                'request_data' => $request->except(['_token', 'password', 'password_confirmation'])
            ]);
            // Provide a generic error message to the user
            return Redirect::back()
                   ->withInput()
                   ->with('error', 'An unexpected error occurred while processing the return. Please try again later or contact support.');
        }
    }

    public function tempReturn(Request $request, Rentals $rental): RedirectResponse
    {
        // Get authenticated user's ID early for logging/tracking
        $userId = Auth::id();

        // 1. Authorize: Ensure the authenticated user has permission.
        // Use the existing $rental instance passed via route model binding.
        $this->authorize('rental-delete', $rental); // Assuming 'rental-delete' policy exists

        try {
            // --- Prepare Identifier for Messages (Fetch before validation) ---
            $customer = $rental->customer; // Use the relationship if defined
            $customerIdentifier = 'N/A'; // Default identifier
            if ($customer) {
                $firstName = $customer->first_name ?? '';
                $lastName = $customer->last_name ?? '';
                $full_name = trim($firstName . ' ' . $lastName);
                // Use full name if available, otherwise fallback to Customer ID
                $customerIdentifier = !empty($full_name) ? $full_name : ('Customer ID: ' . $customer->id);
            } else {
                // Fallback if customer relationship is missing or customer deleted
                $customerIdentifier = 'Rental ID: ' . $rental->id;
            }
            // --- End Prepare Identifier ---

            // 2. Validate Input with Custom Messages
            $rules = [
                'status_name' => [
                    'required',
                    'string',
                    // Ensure the status name exists in the vehicle_statuses table
                    Rule::exists('vehicle_statuses', 'status_name'),
                    // Custom closure to check against the vehicle's current status
                    function ($attribute, $value, $fail) use ($request, $rental) {
                        // Find the vehicle using the vehicle_id from the rental
                        // Use find() for potentially better performance if ID is known
                        $vehicle = Vehicles::find($rental->vehicle_id);
                        // Find the status ID corresponding to the submitted status_name
                        $selectedStatus = VehicleStatus::where('status_name', $value)->first();

                        // If vehicle or status type not found (should be caught by earlier rules, but good practice)
                        if (!$vehicle || !$selectedStatus) {
                            // Fail silently here as other rules should catch non-existence
                            return;
                        }

                        // Compare the vehicle's current_status_id with the ID of the selected status_name
                        if ($vehicle->current_status_id == $selectedStatus->id) {
                            // Use the custom message defined below for the closure
                            $fail('The selected vehicle status (' . $value . ') is the same as its current status. Please choose a different status if you intend to change it.');
                        }
                    }
                ],
                'user_name' => ['required', 'string', Rule::exists('users', 'name')], // Validate incharger exists
                'end_date' => 'required|date|after_or_equal:'.$rental->start_date,
                'notes' => 'nullable|string|max:500', // Added max length for notes
            ];

            $messages = [
                // --- Custom Error Messages ---
                'status_name.required' => 'Please select a new status for the vehicle.',
                'status_name.string'   => 'The selected status must be a valid text value.',
                'status_name.exists'   => 'The selected status is invalid or does not exist.',
                // Incharger
                'user_name.required' => 'The incharge person is required.',
                'user_name.string' => 'The incharge name must be a string.',
                'user_name.exists' => 'The selected incharge person does not exist.',
                // Actual End Date
                'end_date.required' => 'Return date is required.',
                'end_date.date' => 'Return date must be a valid date.',
                'date.after_or_equal' => 'Return date cannot be before the rental start date.',
                // Notes
                'notes.max' => 'Notes cannot exceed 500 characters.',
            ];

            // --- Define custom attributes for better error messages ---
            $attributes = [
                'user_name' => 'incharge person',
                'status_name' => 'vehicle status',
                'actual_end_date' => 'return date',
            ];

            // Use validate() which automatically handles redirection on failure
            $validatedData = $request->validate($rules, $messages, $attributes);
            // --- Start Database Transaction ---
            DB::beginTransaction();

            // --- Find related models needed for updates ---
            // Find the User model instance for the incharger using the validated name
            $incharger = User::where('name', $validatedData['user_name'])->firstOrFail();
            // Find the VehicleStatus model instance using the validated status name
            $newStatus = VehicleStatus::where('status_name', $validatedData['status_name'])->firstOrFail();
            // Find the Vehicle model instance using the vehicle_id from the rental
            $vehicle = Vehicles::find($rental->vehicle_id); // Use find() as ID is known

            // --- ** NEW: Replicate the Rental Record Before Modification ** ---
            $archivedRental = $rental->replicate(); // Create a copy of the original data
            // Modify the replicated record to mark it as an archive
            $archivedRental->status = 'Temp. Return';
            $archivedRental->end_date = $validatedData['end_date']; // Use validated actual return date
            $archivedRental->notes = $validatedData['notes']; // Update notes
            $archivedRental->incharger_id = $incharger->id; // Track who processed the return
            $archivedRental->user_id = $userId; // Track the user performing the action
            $archivedRental->period = 0;
            $archivedRental->is_active = true;
            $archivedRental->created_at = now();
            $archivedRental->updated_at = now();
            // Save the archived copy.
            // Note: This assumes no unique constraints (other than PK) will conflict.
            // If conflicts exist (e.g., unique rental agreement number), adjust data or schema.
            $archivedRental->save();
            // --- ** End Replication Logic ** ---


            // 3. Update related Deposits (if applicable)
            // Assuming Deposits have a foreign key 'rental_id' and 'user_id' for tracking
            Deposits::where('rental_id', $rental->id)
                ->where('is_active', true)
                ->update([
                    'is_active' => false,
                    'end_date' => $validatedData['end_date'], // Use actual return date
                    'user_id' => $userId, // Track who processed the return
                    'updated_at' => now(),
                ]);

            // 4. Update related Vehicle
            if ($vehicle) {
                // Ensure the vehicle is currently linked to *this* specific rental before clearing
                if ($vehicle->current_rental_id == $rental->id) {
                    $vehicle->current_location = 'With EMC'; // Set location back to base
                    $vehicle->current_rental_id = $archivedRental->id;     // Clear the link to the rental
                    $vehicle->current_status_id = $newStatus->id; // Update to the new status from validation
                    $vehicle->user_id = $userId;            // Track who updated the vehicle status
                    $vehicle->save();
                } else {
                    // Log if the vehicle wasn't linked to this rental as expected, but still update status
                    Log::warning("Vehicle [ID: {$vehicle->id}] was not linked to the expected Rental [ID: {$rental->id}] during return process by User [ID: {$userId}]. Status updated anyway.");
                    // Decide if updating status is still desired in this edge case
                    $vehicle->current_status_id = $newStatus->id;
                    $vehicle->user_id = $userId;
                    $vehicle->save();
                }
            } else {
                // This case should ideally not happen if rental has a valid vehicle_id, but handle defensively
                Log::error("Vehicle not found for Rental [ID: {$rental->id}] during return process by User [ID: {$userId}]. Vehicle ID was {$rental->vehicle_id}.");
                // Consider throwing an exception or returning an error if vehicle is critical
                 DB::rollBack(); // Rollback as a critical linked record is missing
                 return Redirect::back()
                     ->withInput() // Keep user's input
                     ->with('error', 'Associated vehicle could not be found. Cannot process return.');
            }

            // 5. Update the *Original* Rental Record with Return Details
            $rental->is_latest_version = false;
            $rental->is_active = false;
            $rental->updated_at = now();

            $rental->save(); // Save the updates BEFORE soft deleting

            // 6. Perform Soft Deletion on the *updated original* rental record
            $rental->delete(); // This sets the `deleted_at` timestamp

            // 7. Commit Transaction
            DB::commit();

            // 8. Redirect on Success
            return to_route('rentals.index') // Use the correct route name for your rentals list
                   ->with('success', "Rental for {$customerIdentifier} successfully temporary returned, archived, and vehicle status updated.");

        } catch (AuthorizationException $e) {
            DB::rollBack(); // Rollback transaction on authorization failure
            Log::warning("Authorization failed for User [ID: {$userId}] returning Rental [ID: {$rental->id}]: " . $e->getMessage());
            // Provide a user-friendly error message
            return Redirect::back()->with('error', 'You do not have permission to return this rental.');
        } catch (ValidationException $e) {
            // No need to rollback here, Laravel handles this before the transaction starts
            // Log the validation errors for debugging
            Log::warning("Validation failed for User [ID: {$userId}] returning Rental [ID: {$rental->id}].", [
                'errors' => $e->errors(),
                'request_data' => $request->except(['_token', 'password', 'password_confirmation']) // Exclude sensitive data
            ]);
            // Let Laravel handle the redirection back with errors automatically
            throw $e;
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            DB::rollBack(); // Rollback if a related model (User, Status) wasn't found during processing
            Log::error("Model not found during rental return for User [ID: {$userId}], Rental [ID: {$rental->id}]: " . $e->getMessage(), [
                    'request_data' => $request->except(['_token', 'password', 'password_confirmation'])
            ]);
            // Determine which model was not found if possible, or provide a general error
            $modelName = match(true) {
                // Check message content to guess the missing model
                str_contains($e->getMessage(), 'App\Models\User') => 'incharge person',
                str_contains($e->getMessage(), 'App\Models\VehicleStatus') => 'vehicle status',
                // Add other models if necessary
                default => 'required information' // Fallback message
            };
            return Redirect::back()
                ->withInput() // Keep user's input
                ->with('error', "The selected {$modelName} could not be found. Please check your selection and try again.");
        } catch (\Throwable $e) { // Catch any other unexpected errors
            DB::rollBack(); // Rollback transaction on any other errors
            Log::critical("An unexpected error occurred during rental return for User [ID: {$userId}], Rental [ID: {$rental->id}]: " . $e->getMessage(), [
                'exception' => $e,
                'request_data' => $request->except(['_token', 'password', 'password_confirmation'])
            ]);
            // Provide a generic error message to the user
            return Redirect::back()
                   ->withInput()
                   ->with('error', 'An unexpected error occurred while processing the return. Please try again later or contact support.');
        }
    }

    public function ExtendContract(StoreExtendRentalRequest $request, Rentals $rental): RedirectResponse
    {
        $userId = Auth::id();

        try {
            $validatedData = $request->validated();

            // DateTime conversion
            $startDate = \Carbon\Carbon::parse($validatedData['start_date'])->format('Y-m-d');
            $endDate = \Carbon\Carbon::parse($validatedData['end_date'])->format('Y-m-d');
            $comingDate = \Carbon\Carbon::parse($validatedData['coming_date'])->format('Y-m-d');

            DB::beginTransaction();

            $totalCost = collect($validatedData['payments'])->sum('amount');

            $archivedRental = $rental->replicate();
            $archivedRental->status = 'Extended';
            $archivedRental->start_date = $startDate;
            $archivedRental->end_date = $endDate;
            $archivedRental->coming_date = $comingDate ?? null;
            $archivedRental->notes = $validatedData['notes'] ?? null;
            $archivedRental->total_cost = $totalCost;
            $archivedRental->incharger_id = $validatedData['incharger_id'];
            $archivedRental->period = $validatedData['period'];
            $archivedRental->is_active = true;
            $archivedRental->created_at = now();
            $archivedRental->updated_at = now();
            $archivedRental->user_id = $userId;
            $archivedRental->save();

            // Create SALE Records using the Service
            foreach ($validatedData['payments'] as $payment) {
                $saleData = [
                    'customer_id' => $rental->customer_id,
                    'sale_date' => now(),
                    'item_description' => $payment['description'] ?? 'Rental Extension',
                    'amount' => $payment['amount'],
                    'payment_type' => $payment['payment_type'],
                    'credit_account_id' => $payment['credit_account_id'],
                    'debit_target_account_id' => $payment['debit_target_account_id'] ?? null,
                    'memo_ref_no' => $archivedRental->id,
                ];
                $this->saleService->recordSale($saleData, $archivedRental->id);
            }

            $vehicle = Vehicles::find($rental->vehicle_id);
            if ($vehicle && $vehicle->current_rental_id == $rental->id) {
                $vehicle->current_rental_id = $archivedRental->id;
                $vehicle->user_id = $userId;
                $vehicle->save();
            }

            $activeDeposits = Deposits::where('rental_id', $rental->id)->where('is_active', true)->get();
            if ($activeDeposits->isNotEmpty()) {
                foreach ($activeDeposits as $originalDeposit) {
                    $archivedDeposit = $originalDeposit->replicate();
                    $archivedDeposit->rental_id = $archivedRental->id;
                    $archivedDeposit->created_at = now();
                    $archivedDeposit->updated_at = now();
                    $archivedDeposit->is_active = true;
                    $archivedDeposit->user_id = $userId;
                    $archivedDeposit->save();

                    $originalDeposit->is_active = false;
                    $originalDeposit->updated_at = now();
                    $originalDeposit->save();
                }
            }

            $rental->is_latest_version = false;
            $rental->is_active = false;
            $rental->updated_at = now();
            $rental->save();
            $rental->delete();

            DB::commit();

            $successMessage = 'Rental of vehicle no. ' . $vehicle->vehicle_no . ' successfully extended, archived, and vehicle status updated.';
            return redirect()->back()->with('success', $successMessage);

        } catch (AuthorizationException $e) {
            DB::rollBack();
            Log::warning("Authorization failed for User [ID: {$userId}] extending Rental [ID: {$rental->id}]: " . $e->getMessage());
            return Redirect::back()->with('error', 'You do not have permission to extend this rental.');
        } catch (ValidationException $e) {
            throw $e;
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            DB::rollBack();
            Log::error("Model not found during rental extending for User [ID: {$userId}], Rental [ID: {$rental->id}]: " . $e->getMessage());
            return Redirect::back()->withInput()->with('error', 'A required record could not be found. Please check your selections.');
        } catch (\Throwable $e) {
            DB::rollBack();
            Log::critical("An unexpected error occurred during rental extending for User [ID: {$userId}], Rental [ID: {$rental->id}]: " . $e->getMessage(), [
                'exception' => $e,
                'request_data' => $request->except(['_token', 'password', 'password_confirmation'])
            ]);
            return Redirect::back()->withInput()->with('error', 'An unexpected error occurred while processing the extension. Please try again later.');
        }
    }

    public function ChangeVehicle(Request $request, Rentals $rental): RedirectResponse
    {
        // Get authenticated user's ID early for logging/tracking
        $userId = Auth::id();

        // 1. Authorize: Ensure the authenticated user has permission.
        // Use the existing $rental instance passed via route model binding.
        $this->authorize('rental-edit', $rental); // Assuming 'rental-edit' policy exists

        try {
            // --- Prepare Identifier for Messages (Fetch before validation) ---
            $customer = $rental->customer; // Use the relationship if defined
            $customerIdentifier = 'N/A'; // Default identifier
            if ($customer) {
                $firstName = $customer->first_name ?? '';
                $lastName = $customer->last_name ?? '';
                $full_name = trim($firstName . ' ' . $lastName);
                // Use full name if available, otherwise fallback to Customer ID
                $customerIdentifier = !empty($full_name) ? $full_name : ('Customer ID: ' . $customer->id);
            } else {
                // Fallback if customer relationship is missing or customer deleted
                $customerIdentifier = 'Rental ID: ' . $rental->id;
            }
            // --- End Prepare Identifier ---

            // 2. Validate Input with Custom Messages
            $rules = [
                // Relational Information
                'user_name' => ['required', 'string', Rule::exists('users', 'name')],
                'original_vehicle_status_name' => [
                    'required',
                    'string',
                    // Ensure the status name exists in the types table
                    Rule::exists('vehicle_statuses', 'status_name'),
                    // Custom closure to check against the vehicle's current status
                    function ($attribute, $value, $fail) use ($request) {
                        // Find the vehicle using the vehicle_no from the request
                        $vehicle = Vehicles::where('vehicle_no', $request->input('vehicle_no'))->first();

                        // Find the status ID corresponding to the submitted status_name
                        $selectedStatus = VehicleStatus::where('status_name', $value)->first();

                        // If vehicle or status type not found (should be caught by earlier rules, but good practice)
                        if (!$vehicle || !$selectedStatus) {
                            // Fail silently here as other rules should catch non-existence
                            return;
                        }

                        // Compare the vehicle's current_status_id with the ID of the selected status_name
                        if ($vehicle->current_status_id == $selectedStatus->id) {
                            $fail('The selected vehicle status (' . $value . ') is the same as its current status. Please choose a different status if you intend to change it.');
                        }
                    }
                ],
                'new_vehicle_no' => ['required', 'string', 'max:255', Rule::exists('vehicles', 'vehicle_no')], // Ensure vehicle exists
                'new_vehicle_status_name' => [
                    'required',
                    'string',
                    // Ensure the status name exists in the types table
                    Rule::exists('vehicle_statuses', 'status_name'),
                    // Custom closure to check against the vehicle's current status
                    function ($attribute, $value, $fail) use ($request) {
                        // Find the vehicle using the vehicle_no from the request
                        $vehicle = Vehicles::where('vehicle_no', $request->input('vehicle_no'))->first();

                        // Find the status ID corresponding to the submitted status_name
                        $selectedStatus = VehicleStatus::where('status_name', $value)->first();

                        // If vehicle or status type not found (should be caught by earlier rules, but good practice)
                        if (!$vehicle || !$selectedStatus) {
                            // Fail silently here as other rules should catch non-existence
                            return;
                        }

                        // Compare the vehicle's current_status_id with the ID of the selected status_name
                        if ($vehicle->current_status_id == $selectedStatus->id) {
                            $fail('The selected vehicle status (' . $value . ') is the same as its current status. Please choose a different status if you intend to change it.');
                        }
                    }
                ],
                'notes' => 'nullable|string',
            ];

            // --- Custom Error Messages ---
            $messages = [
                // Previous Vihecle Status
                'original_vehicle_status_name.required' => 'The previous vehicle status is required.',
                'original_vehicle_status_name.exists' => 'The selected status for previous vehicle is invalid.',
                // New Vihecle Status
                'new_vehicle_status_name.required' => 'The new vehicle status is required.',
                'new_vehicle_status_name.exists' => 'The selected status for new vehicle is invalid.',

                // New Vehicle
                'new_vehicle_no.required' => 'The new vehicle number is required.',
                'new_vehicle_no.string' => 'The new vehicle number must be a string.',
                'new_vehicle_no.exists' => 'The new selected vehicle does not exist.',

                // Incharger
                'user_name.required' => 'The incharge person is required.',
                'user_name.string' => 'The incharge name must be a string.',
                'user_name.exists' => 'The selected incharge person does not exist.',
            ];

            // --- Define custom attributes for better error messages ---
            $attributes = [
                'original_vehicle_status_name' => 'previous vehicle status',
                'new_vehicle_status_name' => 'new vehicle status',
                'new_vehicle_no' => 'new vehicle number',
                'user_name' => 'incharge person',
            ];

            // Use validate() which automatically handles redirection on failure
            $validatedData = $request->validate($rules, $messages, $attributes);
            // --- Start Database Transaction ---

            DB::beginTransaction();

            // --- Find related models needed for updates ---
            // Find the User model instance for the incharger using the validated name
            $incharger = User::where('name', $validatedData['user_name'])->firstOrFail();
            $pre_vehicle = Vehicles::find($rental->vehicle_id);
            $new_vehicle = Vehicles::where('vehicle_no', $validatedData['new_vehicle_no'])->first();
            $pre_vehicleStatus = VehicleStatus::where('status_name', $validatedData['original_vehicle_status_name'])->firstOrFail();
            $new_vehicleStatus = VehicleStatus::where('status_name', $validatedData['new_vehicle_status_name'])->firstOrFail();

            // --- ** NEW: Replicate the Rental Record Before Modification ** ---
            $archivedRental = $rental->replicate(); // Create a copy of the original data
            // Modify the replicated record to mark it as an archive
            $archivedRental->vehicle_id = $new_vehicle->id;
            $archivedRental->status = 'Changed Vehicle';
            $archivedRental->incharger_id = $incharger->id; // Track who processed the change vehicle
            $archivedRental->period = 0;
            $archivedRental->total_cost = 0;
            $archivedRental->user_id = $userId; // Track the user performing the action
            $archivedRental->notes = $validatedData['notes']; // Update notes
            $archivedRental->is_active = true;
            $archivedRental->created_at = now();
            $archivedRental->updated_at = now();
            // Save the archived copy.
            // Note: This assumes no unique constraints (other than PK) will conflict.
            // If conflicts exist (e.g., unique rental agreement number), adjust data or schema.
            $archivedRental->save();
            // --- ** End Replication Logic ** ---

            // --- ** MODIFIED: Process All Active Deposits for the Original Rental ** ---
            // Fetch all active deposits for the original rental
            $activeDeposits = Deposits::where('rental_id', $rental->id)
                                    ->where('is_active', true) // Corrected typo: where instead of whare
                                    ->get(); // Get a collection of deposits

            if ($activeDeposits->isNotEmpty()) {
                foreach ($activeDeposits as $originalDeposit) {
                    // Replicate the original deposit for the archived rental
                    $archivedDeposit = $originalDeposit->replicate();
                    $archivedDeposit->rental_id = $archivedRental->id; // Link to the new archived rental
                    $archivedDeposit->created_at = now(); // Set new timestamps
                    $archivedDeposit->updated_at = now();
                    // Ensure is_active is true for the new deposit record, or set as per your business logic
                    $archivedDeposit->is_active = true; 
                    $archivedDeposit->save();

                    // Deactivate the original deposit
                    $originalDeposit->is_active = false;
                    $originalDeposit->updated_at = now();
                    $originalDeposit->save();
                }
            } else {
                // Log if no active deposits were found for the original rental
                Log::info("No active deposits were found for Rental [ID: {$rental->id}] during vehicle change process by User [ID: {$userId}]. No deposits were archived or updated.");
            }
            // --- ** End Deposit Processing Logic ** ---

            // 4. Update related Vehicle
            if ($pre_vehicle) {
                // Ensure the vehicle is currently linked to *this* specific rental before clearing
                if ($pre_vehicle->current_rental_id == $rental->id) {
                    $pre_vehicle->current_location = 'With EMC';
                    $pre_vehicle->current_rental_id = null; 
                    $pre_vehicle->current_status_id = $pre_vehicleStatus->id;
                    $pre_vehicle->user_id = $userId;
                    $pre_vehicle->save();
                } else {
                    // Log if the vehicle wasn't linked to this rental as expected, but still update status
                    Log::warning("Previous vehicle [ID: {$pre_vehicle->id}] was not linked to the expected Rental [ID: {$rental->id}] during return process by User [ID: {$userId}]. Status updated anyway.");
                    // Decide if updating status is still desired in this edge case
                    $pre_vehicle->current_status_id = null;
                    $pre_vehicle->user_id = $userId;
                    $pre_vehicle->save();
                }
            } else {
                // This case should ideally not happen if rental has a valid vehicle_id, but handle defensively
                Log::error("Previous vehicle not found for Rental [ID: {$rental->id}] during return process by User [ID: {$userId}]. Vehicle ID was {$rental->vehicle_id}.");
                // Consider throwing an exception or returning an error if vehicle is critical
                 DB::rollBack(); // Rollback as a critical linked record is missing
                 return Redirect::back()
                     ->withInput() // Keep user's input
                     ->with('error', 'Associated vehicle could not be found. Cannot process return.');
            }
            if ($new_vehicle) {
                    $new_vehicle->current_location = 'With Customer';
                    $new_vehicle->current_rental_id = $archivedRental->id; 
                    $new_vehicle->current_status_id = $new_vehicleStatus->id;
                    $new_vehicle->user_id = $userId;
                    $new_vehicle->save();
            } else {
                // This case should ideally not happen if rental has a valid vehicle_id, but handle defensively
                Log::error("New vehicle not found for Rental [ID: {$rental->id}] during return process by User [ID: {$userId}]. Vehicle ID was {$rental->vehicle_id}.");
                // Consider throwing an exception or returning an error if vehicle is critical
                 DB::rollBack(); // Rollback as a critical linked record is missing
                 return Redirect::back()
                     ->withInput() // Keep user's input
                     ->with('error', 'Associated vehicle could not be found. Cannot process return.');
            }

            // 5. Update the *Original* Rental Record with Return Details
            $rental->is_latest_version = false;
            $rental->is_active = false;
            $rental->updated_at = now();

            $rental->save(); // Save the updates BEFORE soft deleting

            // 6. Perform Soft Deletion on the *updated original* rental record
            $rental->delete(); // This sets the `deleted_at` timestamp

            // 7. Commit Transaction
            DB::commit();

            // 8. Redirect on Success
            return to_route('rentals.index') // Use the correct route name for your rentals list
                   ->with('success', "Rental for {$customerIdentifier} successfully changed the vehicle, archived, and vehicle status updated.");

        } catch (AuthorizationException $e) {
            DB::rollBack(); // Rollback transaction on authorization failure
            Log::warning("Authorization failed for User [ID: {$userId}] changing vehicle of Rental [ID: {$rental->id}]: " . $e->getMessage());
            // Provide a user-friendly error message
            return Redirect::back()->with('error', 'You do not have permission to change vehicle of this rental.');
        } catch (ValidationException $e) {
            // No need to rollback here, Laravel handles this before the transaction starts
            // Log the validation errors for debugging
            Log::warning("Validation failed for User [ID: {$userId}] changing vehicle of Rental [ID: {$rental->id}].", [
                'errors' => $e->errors(),
                'request_data' => $request->except(['_token', 'password', 'password_confirmation']) // Exclude sensitive data
            ]);
            // Let Laravel handle the redirection back with errors automatically
            throw $e;
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            DB::rollBack(); // Rollback if a related model (User, Status) wasn't found during processing
            Log::error("Model not found during rental changing vehicle of for User [ID: {$userId}], Rental [ID: {$rental->id}]: " . $e->getMessage(), [
                    'request_data' => $request->except(['_token', 'password', 'password_confirmation'])
            ]);
            // Determine which model was not found if possible, or provide a general error
            $modelName = match(true) {
                // Check message content to guess the missing model
                str_contains($e->getMessage(), 'App\Models\User') => 'incharge person',
                str_contains($e->getMessage(), 'App\Models\VehicleStatus') => 'vehicle status',
                // Add other models if necessary
                default => 'required information' // Fallback message
            };
            return Redirect::back()
                ->withInput() // Keep user's input
                ->with('error', "The selected {$modelName} could not be found. Please check your selection and try again.");
        } 
        catch (\Throwable $e) { // Catch any other unexpected errors
            DB::rollBack(); // Rollback transaction on any other errors
            Log::critical("An unexpected error occurred during rental extending for User [ID: {$userId}], Rental [ID: {$rental->id}]: " . $e->getMessage(), [
                'exception' => $e,
                'request_data' => $request->except(['_token', 'password', 'password_confirmation'])
            ]);
            // Provide a generic error message to the user
            return Redirect::back()
                   ->withInput()
                   ->with('error', 'An unexpected error occurred while processing the extending. Please try again later or contact support.');
        }
    }

    public function ChangeDeposit(Request $request, Rentals $rental): RedirectResponse
    {
        // Get authenticated user's ID early for logging/tracking
        $userId = Auth::id();

        // 1. Authorize: Ensure the authenticated user has permission.
        $this->authorize('rental-edit', $rental); // Assuming 'rental-edit' policy exists

        try {
            // --- Prepare Identifier for Messages (Fetch before validation) ---
            $customer = $rental->customer;
            $customerIdentifier = 'N/A';
            if ($customer) {
                $firstName = $customer->first_name ?? '';
                $lastName = $customer->last_name ?? '';
                $full_name = trim($firstName . ' ' . $lastName);
                $customerIdentifier = !empty($full_name) ? $full_name : ('Customer ID: ' . $customer->id);
            } else {
                $customerIdentifier = 'Rental ID: ' . $rental->id;
            }
            // --- End Prepare Identifier ---

            // 2. Validate Input with Custom Messages
            $rules = [
                'user_name' => ['required', 'string', Rule::exists('users', 'name')->whereNull('deleted_at')], // Ensure incharger exists and is not soft-deleted

                // Active Deposits (Array Validation)
                'activeDeposits' => ['nullable', 'array'],
                'activeDeposits.*.deposit_type' => [
                    'required_with:activeDeposits', // Type is required if activeDeposits array has an entry
                    'string'
                ],
                'activeDeposits.*.deposit_value' => [
                    'required_with:activeDeposits',
                ],
                'activeDeposits.*.expiry_date' => [
                    'nullable',
                    'date', // Validate as date if it's a date
                    'after_or_equal:today' // Optional: if expiry should be in the future
                ],
                'activeDeposits.*.visa_type' => ['nullable', 'string', 'max:255'],
                'activeDeposits.*.is_primary' => ['nullable', 'boolean'],
                'activeDeposits.*.description' => ['nullable', 'string', 'max:1000'], // Increased max length for description

                'notes' => 'nullable|string|max:2000', // Increased max length for notes
            ];

            // --- Custom Error Messages ---
            $messages = [
                'user_name.required' => 'The incharge person is required.',
                'user_name.exists' => 'The selected incharge person does not exist or is inactive.',

                'activeDeposits.*.deposit_type.required_with' => 'The deposit type field is required for all new deposits.',
                'activeDeposits.*.deposit_value.required_with' => 'The deposit value field is required for all new deposits.',
                'activeDeposits.*.expiry_date.date' => 'The expiry date must be a valid date.',
                'activeDeposits.*.expiry_date.after_or_equal' => 'The expiry date must be today or a future date.',
            ];

            // --- Define custom attributes for better error messages ---
            $attributes = [
                'user_name' => 'incharge person',
            ];
            // Correctly add attributes for array elements
            if (is_array($request->input('activeDeposits'))) {
                foreach ($request->input('activeDeposits') as $index => $deposit) {
                    $depositNumber = $index + 1;
                    $attributes["activeDeposits.{$index}.deposit_type"] = "deposit #{$depositNumber} type";
                    $attributes["activeDeposits.{$index}.deposit_value"] = "deposit #{$depositNumber} value";
                    $attributes["activeDeposits.{$index}.description"] = "deposit #{$depositNumber} description";
                    $attributes["activeDeposits.{$index}.is_primary"] = "deposit #{$depositNumber} primary flag";
                    $attributes["activeDeposits.{$index}.expiry_date"] = "deposit #{$depositNumber} expiry date";
                    $attributes["activeDeposits.{$index}.visa_type"] = "deposit #{$depositNumber} registered number";
                }
            }

            $validatedData = $request->validate($rules, $messages, $attributes);

            DB::beginTransaction();

            // --- Find related models needed for updates ---
            $incharger = User::where('name', $validatedData['user_name'])->firstOrFail();

            // --- 1. Create an Archive/Historical record of the rental's state *before* deposit changes ---
            // This $archivedRental IS the historical record of the state BEFORE changes.
            $archivedRental = $rental->replicate(); // Create a copy of the original data

            // Modify the replicated record to mark it as an archive/snapshot
            $archivedRental->status = 'Changed Deposit'; // More descriptive status
            $archivedRental->incharger_id = $incharger->id; // Track who processed the change deposit
            $archivedRental->period = 0;
            $archivedRental->total_cost = 0;
            $archivedRental->user_id = $userId;
            $archivedRental->notes = $validatedData['notes'];
            $archivedRental->is_active = true;
            $archivedRental->created_at = now();
            $archivedRental->updated_at = now();
            $archivedRental->save();

            $rental->is_latest_version = false;
            $rental->is_active = false;
            $rental->updated_at = now();

            $rental->save(); // Save the updates BEFORE soft deleting

            $rental->delete(); // This sets the `deleted_at` timestamp

            // Manage Deposits: Remove old deposits and add new ones
            // This assumes a relationship 'deposits()' on the Rental model (e.g., public function deposits() { return $this->hasMany(Deposit::class); })
            if (method_exists($rental, 'deposits')) {
                $rental->deposits()->update([
                    'is_active' => false,
                    'end_date' => now()
                ]);

                if (!empty($validatedData['activeDeposits'])) {
                    foreach ($validatedData['activeDeposits'] as $depositData) {
                        $deposit_type_id = DepositTypes::where('name', $depositData['deposit_type'])->firstOrFail();
                        $archivedRental->deposits()->create([
                            'customer_id' => $archivedRental->id,
                            'customer_id' => $archivedRental->customer_id,
                            'type_id' => $deposit_type_id->id,
                            'deposit_value' => $depositData['deposit_value'],
                            'expiry_date' => $depositData['expiry_date'] ?? null, // Ensure Carbon instance or correct format if model casts it
                            'visa_type' => $depositData['visa_type'] ?? null,
                            'is_primary' => $depositData['is_primary'] ?? false,
                            'description' => $depositData['description'] ?? null,
                            'start_date' => now(),
                            'user_id' => $userId, // Optional: track who added this specific deposit line
                        ]);
                    }
                }
            } else {
                // Log a warning if the deposits relationship doesn't exist, as deposits can't be updated.
                Log::warning("Rental ID {$rental->id}: Attempted to update deposits, but 'deposits' relationship not found on Rental model.");
            }

            $rental->save(); // Save the updated original rental record

            // Note: The original $rental is NOT soft-deleted. It's updated to be the current version.
            // The $archivedRental is a new record acting as the historical snapshot.

            DB::commit();

            return to_route('rentals.index')
                   ->with('success', "Deposits successfully changed for rental concerning {$customerIdentifier}. Previous state archived.");

        } catch (AuthorizationException $e) {
            DB::rollBack();
            Log::warning("Authorization failed for User [ID: {$userId}] changing deposit of Rental [ID: {$rental->id}]: " . $e->getMessage());
            return Redirect::back()->with('error', 'You do not have permission to change deposits for this rental.');
        } catch (ValidationException $e) {
            // Laravel automatically redirects back with errors. No need to rollback DB as transaction hasn't started or is handled.
            Log::warning("Validation failed for User [ID: {$userId}] changing deposit of Rental [ID: {$rental->id}].", [
                'errors' => $e->errors(),
                'request_data' => $request->except(['_token', 'password', 'password_confirmation'])
            ]);
            throw $e; // Re-throw to let Laravel handle the redirect
        } catch (ModelNotFoundException $e) {
            DB::rollBack();
            Log::error("Model not found during deposit change for User [ID: {$userId}], Rental [ID: {$rental->id}]: " . $e->getMessage(), [
                'request_data' => $request->except(['_token', 'password', 'password_confirmation'])
            ]);
            $modelName = 'required information';
            if (str_contains($e->getMessage(), 'App\Models\User')) {
                $modelName = 'incharge person';
            }
            // Add other model checks if necessary
            return Redirect::back()
                ->withInput()
                ->with('error', "The selected {$modelName} could not be found. Please check your selection and try again.");
        } catch (\Throwable $e) {
            DB::rollBack();
            Log::critical("An unexpected error occurred during deposit change for User [ID: {$userId}], Rental [ID: {$rental->id}]: " . $e->getMessage(), [
                'exception' => $e,
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'request_data' => $request->except(['_token', 'password', 'password_confirmation'])
            ]);
            return Redirect::back()
                   ->withInput()
                   ->with('error', 'An unexpected error occurred while changing the deposits. Please try again later or contact support.');
        }
    }
}