<?php

namespace App\Http\Controllers\Internals;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Redirect; // Keep if used, otherwise remove
use Inertia\Response;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log; // <-- Import Log facade
use Illuminate\Support\Arr;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Carbon\Carbon;
use Carbon\CarbonPeriod; // Keep if used, otherwise remove
use Illuminate\Support\Collection;
use Illuminate\Database\Eloquent\Builder;
use Exception; // <-- Import base Exception
use Illuminate\Auth\Access\AuthorizationException; // <-- Import Auth Exception
use Illuminate\Validation\ValidationException; // <-- Import Validation Exception

// Model
use App\Models\Rentals;
use App\Models\Customers;
use App\Models\Vehicles;
use App\Models\VehicleStatus;
use App\Models\Contacts;
use App\Models\Deposits;
use App\Models\Deposits\DepositTypes;
use App\Models\User;

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
            ])->get();

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

                $deposits = Deposits::where('customer_id', $rental->customer_id)
                ->where('is_active', true)
                ->get();
                
                // Get the loaded active deposits collection
                $activeDeposits = Deposits::where('customer_id', $rental->customer_id)
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

                    // Status and Pricing
                    'status_name' => $rental->status,
                    'total_cost' => $rental->total_cost,
                    
                    // Date
                    'start_date' => $rental->start_date,
                    'end_date' => $rental->end_date,

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
                'users' => Inertia::defer(fn () => $formattedUsers),
            ]);

        } catch (AuthorizationException $e) {
            Log::warning("Authorization failed for User [ID: {$userId}] accessing Customers index: " . $e->getMessage());
            abort(403, 'Unauthorized action.');
        } 
    }

    public function store(Request $request): RedirectResponse
    {
        $userId = Auth::id();

        try {
            $this->authorize('rental-create');

            $validDepositTypes = DepositTypes::where('is_active', true)->pluck('name')->toArray();
            $fullName = $request->customer_name;

            // --- Define Validation Rules ---
            $rules = [
                // Relational Information
                'vehicle_no' => ['required', 'string', 'max:255', Rule::exists('vehicles', 'vehicle_no')], // Ensure vehicle exists
                'customer_name' => [
                    'required',
                    'string',
                    // Custom closure to check if CONCAT(first_name, ' ', last_name) exists
                    function ($attribute, $value, $fail) {
                        if (!Customers::whereRaw("CONCAT(first_name, ' ', last_name) = ?", [$value])->exists()) {
                            $fail("The selected customer does not exist.");
                        }
                    }
                ],
                'user_name' => ['required', 'string', Rule::exists('users', 'name')],

                // --- NEW: Add rule for status_name ---
                'status_name' => [
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

                // Additional Deposits (Array Validation) - Includes the primary one now
                'activeDeposits' => ['nullable', 'array'],
                'activeDeposits.*.deposit_type' => [
                    'required', // Type is required for every deposit
                    'string',
                    Rule::in($validDepositTypes)
                ],
                'activeDeposits.*.deposit_value' => [
                    'required', // Value is required for every deposit
                    'string', // Consider changing to 'numeric' if it should always be a number
                    'max:255'
                ],
                // Add validation for is_primary flag sent from frontend
                'activeDeposits.*.is_primary' => ['nullable', 'boolean'],
                'activeDeposits.*.description' => ['nullable', 'string', 'max:255'],

                'actual_start_date' => 'required|date', // Use 'date' validation
                'end_date' => 'required|date|after_or_equal:actual_start_date', // Ensure end date is not before start date
                'period' => 'required|string|max:50',
                'coming_date' => 'nullable|date', // Use 'date' validation
                'total_cost' => 'required|numeric|min:0',
                'notes' => 'nullable|string',
            ];

            // --- Custom Error Messages ---
            $messages = [
                // Vehicle
                'vehicle_no.required' => 'The vehicle number is required.',
                'vehicle_no.string' => 'The vehicle number must be a string.',
                'vehicle_no.exists' => 'The selected vehicle does not exist.', // Added exists message

                // Customer
                'customer_name.required' => 'The customer name is required.',
                'customer_name.string' => 'The customer name must be a string.',
                // Custom closure provides its own message

                // Status
                'status_name.required' => 'The vehicle status is required.',
                'status_name.exists' => 'The selected vehicle status is invalid.',

                // Deposit
                'activeDeposits.*.deposit_type.required' => 'The deposit type field is required for deposit #:position.',
                'activeDeposits.*.deposit_value.required' => 'The deposit value field is required for deposit #:position.',
                'activeDeposits.*.deposit_type.in' => 'The selected deposit type for deposit #:position is invalid.',
                'activeDeposits.*.deposit_value.numeric' => 'The deposit value for deposit #:position must be a number.', // Added if changing type

                // Incharger
                'user_name.required' => 'The incharge person is required.',
                'user_name.string' => 'The incharge name must be a string.',
                'user_name.exists' => 'The selected incharge person does not exist.', // Use exists message

                // Date & Pricing
                'actual_start_date.required' => 'Start date is required.',
                'actual_start_date.date' => 'Start date must be a valid date.',
                'end_date.required' => 'End date is required.',
                'end_date.date' => 'End date must be a valid date.',
                'end_date.after_or_equal' => 'End date must be on or after the start date.',
                'period.required' => 'Rental period is required.',
                'coming_date.date' => 'Coming date must be a valid date.',
                'total_cost.required' => 'Rental cost is required.',
                'total_cost.numeric' => 'Rental cost must be a number.',
                'total_cost.min' => 'Rental cost cannot be negative.',
            ];

            // --- Define custom attributes for better error messages ---
            $attributes = [
                'vehicle_no' => 'vehicle number',
                'customer_name' => 'customer name',
                'user_name' => 'incharge person',
                'status_name' => 'vehicle status',
                'actual_start_date' => 'start date',
                'end_date' => 'end date',
                'total_cost' => 'total cost',
            ];
            // Dynamically add attributes for array fields
            if (is_array($request->input('activeDeposits'))) {
                foreach ($request->input('activeDeposits') as $index => $deposit) {
                    $depositNumber = $index + 1;
                    $attributes["activeDeposits.{$index}.deposit_type"] = "deposit #{$depositNumber} type";
                    $attributes["activeDeposits.{$index}.deposit_value"] = "deposit #{$depositNumber} value";
                    $attributes["activeDeposits.{$index}.description"] = "deposit #{$depositNumber} description";
                    $attributes["activeDeposits.{$index}.is_primary"] = "deposit #{$depositNumber} is primary flag";
                }
            }

            // --- Validate the request data ---
            // Use validate() which automatically handles redirection on failure
            $validatedData = $request->validate($rules, $messages, $attributes);

            DB::beginTransaction();

            // --- Find Foreign Key Models ---
            // Fetch the full vehicle model, not just the ID
            $vehicle = Vehicles::where('vehicle_no', $validatedData['vehicle_no'])->firstOrFail();
            // Fetch the customer model
            $customer = Customers::whereRaw("CONCAT(first_name, ' ', last_name) = ?", [$fullName])->firstOrFail();
            // Fetch the user model
            $incharger = User::where('name', $validatedData['user_name'])->firstOrFail();
            // Fetch the new status model
            $newStatus = VehicleStatus::where('status_name', $validatedData['status_name'])->firstOrFail(); // Needed for updating vehicle status


            // --- 1. Create the Rental Record ---
            $rental = new Rentals();
            $rental->fill([
                'vehicle_id' => $vehicle->id, // Use the ID from the fetched vehicle model
                'customer_id' => $customer->id, // Use the ID from the fetched customer model
                'actual_start_date' => $validatedData['actual_start_date'],
                'start_date' => $validatedData['actual_start_date'], // Assuming start_date is same as actual_start_date initially
                'end_date' => $validatedData['end_date'],
                'period' => $validatedData['period'],
                'coming_date' => $validatedData['coming_date'] ?? null,
                'total_cost' => $validatedData['total_cost'],
                'status' => 'New Rental', // Consider a more descriptive initial status like 'Active' or 'Scheduled'
                'notes' => $validatedData['notes'] ?? null,
                'incharger_id' => $incharger->id, // Use the ID from the fetched user model
                'user_id' => $userId, // The authenticated user who created the record
            ]);
            $rental->save(); // Save the rental to get its ID

            // --- 2. Update the Vehicle Record ---
            // Update the vehicle's current_rental_id with the new rental's ID
            $vehicle->current_rental_id = $rental->id;
            // Update the vehicle's status
            $vehicle->current_status_id = $newStatus->id;
            $vehicle->save(); // Save the changes to the vehicle

            // --- 3. Create Deposits ---
            if (!empty($validatedData['activeDeposits'])) {
                $depositsToInsert = [];
                // Fetch deposit Type IDs based on names for efficiency
                $depositTypeMap = DepositTypes::whereIn('name', collect($validatedData['activeDeposits'])->pluck('deposit_type')->unique())
                                      ->pluck('id', 'name');

                foreach ($validatedData['activeDeposits'] as $depositData) {
                     $depositTypeId = $depositTypeMap[$depositData['deposit_type']] ?? null;
                     if (!$depositTypeId) {
                         // Throw an exception to rollback transaction if a type is invalid after validation (should not happen)
                         DB::rollBack();
                         Log::error("Invalid deposit type found after validation: {$depositData['deposit_type']}");
                         // Use a more specific exception if available or a generic one
                         throw new Exception("An error occurred while processing deposit types. Please check the selected types.");
                     }
                    $depositsToInsert[] = [
                        'customer_id' => $customer->id, // Use the customer ID
                        'rental_id' => $rental->id,
                        'type_id' => $depositTypeId,
                        'deposit_value' => $depositData['deposit_value'],
                        'is_primary' => $depositData['is_primary'] ?? false, // Default to false if not provided
                        'description' => $depositData['description'] ?? null,
                        'is_active' => true, // Mark new deposits as active
                        'start_date' => now(), // Set start date to now
                        'user_id' => $userId, // Log who created the deposit
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];
                }
                if (!empty($depositsToInsert)) {
                    Deposits::insert($depositsToInsert); // Bulk insert for efficiency
                }
            } else {
                // Log if needed, but generally okay if no deposits are provided
                // Log::info("No deposits provided to create for Rental [ID: {$rental->id}] / Customer [ID: {$customer->id}].");
            }

            // --- Commit Transaction ---
            DB::commit(); // Commit all changes if everything was successful

            // --- Success Response ---
            $successMessage = 'Rental of vehicle no. ' . $vehicle->vehicle_no . ' successfully registered (ID: ' . $rental->id . ').';
            // Redirect to the index page with a success message
            return to_route('rentals.index')->with('success', $successMessage);

        } catch (AuthorizationException $e) {
            DB::rollBack(); // Rollback transaction on authorization failure
            Log::warning("Authorization failed for User [ID: {$userId}] creating rental: " . $e->getMessage());
            return Redirect::back()->with('error', 'You do not have permission to create rentals.');
        } catch (ValidationException $e) {
            // No need to rollback, Laravel handles this before the transaction starts
            Log::warning("Validation failed for User [ID: {$userId}] creating rental.", [
                'errors' => $e->errors(),
                'request_data' => $request->except(['_token', 'password', 'password_confirmation']) // Exclude sensitive data
            ]);
            // Re-throw the exception to let Laravel handle the redirection back with errors
            throw $e;
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            DB::rollBack(); // Rollback if a related model (Vehicle, Customer, User, Status) wasn't found
            Log::error("Model not found during rental creation for User [ID: {$userId}]: " . $e->getMessage(), [
                 'request_data' => $request->except(['_token', 'password', 'password_confirmation'])
            ]);
            // Determine which model was not found if possible, or provide a general error
            $modelName = match(true) {
                str_contains($e->getMessage(), 'Vehicles') => 'vehicle',
                str_contains($e->getMessage(), 'Customers') => 'customer',
                str_contains($e->getMessage(), 'User') => 'incharge person', // Assuming 'User' model for incharger
                str_contains($e->getMessage(), 'VehicleStatus') => 'vehicle status',
                default => 'required information'
            };
            return Redirect::back()->withInput()->with('error', "The selected {$modelName} could not be found. Please check your selection.");
        }
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
        // 1. Authorize: Ensure the authenticated user has permission.
        $this->authorize('rental-delete', $rental);

        // --- Prepare Identifier for Messages (Fetch before validation) ---
        $customer = $rental->customer; // Use the relationship if defined
        $customerIdentifier = 'N/A'; // Default identifier
        if ($customer) {
            $firstName = $customer->first_name ?? '';
            $lastName = $customer->last_name ?? '';
            $full_name = trim($firstName . ' ' . $lastName);
            $customerIdentifier = !empty($full_name) ? $full_name : ('Customer ID: ' . $customer->id);
        } else {
            $customerIdentifier = 'Rental ID: ' . $rental->id; // Fallback if customer not found
        }
        // --- End Prepare Identifier ---

        // 2. Validate Input with Custom Messages
        $validator = Validator::make($request->all(), [
            'status_name' => [
                'required',
                'string',
                // Ensure the status name exists in the vehicle_statuses table
                Rule::exists('vehicle_statuses', 'status_name'),
                // Custom closure to check against the vehicle's current status
                function ($attribute, $value, $fail) use ($request, $rental) {
                    // Find the vehicle using the vehicle_no from the request
                    $vehicle = Vehicles::where('id', $rental->vehicle_id)->first();
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
            'password' => 'required|string', // Ensure password is required
        ], [
            // --- Custom Error Messages ---
            'status_name.required' => 'Please select a new status for the vehicle.',
            'status_name.string'   => 'The selected status must be a valid text value.',
            'status_name.exists'   => 'The selected status is invalid or does not exist.',
            // Custom message key for the closure rule (referenced in $fail above)
            'status_name.same_status' => 'The selected vehicle status (:input) is the same as its current status. Please choose a different status if you intend to change it.',
            'password.required' => 'The administrator password is required to delete this rental.',
            // You can add a custom message for password.string if needed, though it's less common
            // 'password.string' => 'The password must be a string.',
        ]);

        // Check if validation fails
        if ($validator->fails()) {
            // Redirect back with validation errors (custom messages will be used)
            return back()->withErrors($validator)->withInput()
                         ->with('error', 'Please correct the errors below.'); // General error prompt
        }

        // 3. Verify Administrator Password
        $admin = Auth::user();

        // Ensure we have an authenticated admin user
        if (!$admin) {
            Log::error("Attempted to delete rental {$rental->id} without an authenticated user session.");
            return redirect()->route('login')->with('error', 'Authentication error. Please log in again.');
        }

        // Check the provided password against the admin's stored hashed password.
        if (!Hash::check($request->input('password'), $admin->password)) {
            // Return back with a specific error for the password field
            // Use withErrors to target the 'password' field specifically
            return back()->withErrors(['password' => 'The provided administrator password does not match.'])->withInput();
            // Note: withInput() will repopulate the form *except* for the password field by default for security.
        }


        try {
            // --- Update Related Records ---

            // 4. Update related Deposits
            $deposits = Deposits::where('rental_id', $rental->id)->get();
            foreach ($deposits as $deposit) {
                $deposit->is_active = false;
                $deposit->end_date = now();
                $deposit->save();
            }

            // 5. Update related Vehicle
            $vehicle = Vehicles::where('current_rental_id', $rental->id)->first();
            if ($vehicle) {
                $vehicle->current_rental_id = null;
                // Find the status ID for the selected status_name from the request
                $newStatus = VehicleStatus::where('status_name', $request->input('status_name'))->first();
                if ($newStatus) {
                    $vehicle->current_status_id = $newStatus->id; // Update status based on validated input
                } else {
                    // Log a warning if the status somehow wasn't found despite validation
                    Log::warning("Validated status '{$request->input('status_name')}' not found when updating vehicle {$vehicle->id} during rental deletion.");
                    // Decide on fallback behavior: leave status as is, or set to a default 'available' status ID?
                    // Example: Set to a known 'Available' status ID (replace '1' with your actual ID)
                    // $availableStatus = VehicleStatus::where('status_name', 'Available')->first();
                    // if ($availableStatus) $vehicle->current_status_id = $availableStatus->id;
                }
                $vehicle->save();
            } else {
                Log::warning("No vehicle found with current_rental_id {$rental->id} during deletion.");
            }

            // --- Perform Deletion ---

            // 6. Add Deleting User ID & Actual Return Date
            $rental->actual_return_date = now();
            $rental->user_id = Auth::id(); // Track who deleted it
            $rental->save(); // Save changes before soft deleting

            // 7. Delete Rental (Soft Deletes assumed)
            $rental->delete();

            // 8. Redirect on Success
            // Use the customer identifier in the success message
            return to_route('rentals.index')->with('success', "Rental for {$customerIdentifier} successfully deleted and vehicle status updated."); // Added success message

        } catch (AuthorizationException $e) {
            Log::warning("Authorization failed during deletion process for rental {$rental->id}: " . $e->getMessage());
            return redirect()->back()->with('error', 'You do not have permission to perform this action.');

        } catch (Exception $e) {
            // 9. Handle Generic Errors
            Log::error("Error processing deletion for rental {$rental->id}: " . $e->getMessage(), [
                'exception' => $e
            ]);
            return redirect()->back()
                ->with('error', "Could not delete the rental for {$customerIdentifier} due to a server error. Please try again later or contact support.");
        }
    }
}
