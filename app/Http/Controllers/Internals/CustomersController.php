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
use App\Models\Contacts;
use App\Models\Contacts\Types;
use App\Models\Customers;
use App\Models\User;

// Auth
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Foundation\Validation\ValidatesRequests;

class CustomersController extends Controller
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
        Log::info("User [ID: {$userId}] attempting to access Customers index.");

        try {
            $this->authorize('customer-list');
            Log::info("User [ID: {$userId}] authorized for customer-list.");

            // --- Fetch Customers ---
            Log::info("Fetching customers with active contacts (and their types), active deposits, and creator for User [ID: {$userId}].");
            $customers = Customers::with([
                // Eager load active contacts AND their associated contactType relationship
                'activeContacts.contactType',
                // Eager load active deposits (assuming you might need details later)
                'activeDeposits.depositType',
                'creator:id,name' // load creator efficiently
            ])->get();

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

            // Map the customer data for the frontend
            $formattedCustomers = $customers->map(function (Customers $customer) {
                // Get the loaded active contacts collection
                $activeContacts = $customer->activeContacts;
                // Get the loaded active deposits collection
                $activeDeposits = $customer->activeDeposits; // Get loaded deposits

                // --- Logic to find primary contacts ---
                $primaryContact = $activeContacts->firstWhere('is_primary', true)
                               ?? $activeContacts->firstWhere('is_primary', false) // Fallback
                               ?? null; // Final fallback

                $primaryContactType = $primaryContact?->contactType?->name ?? 'N/A'; // Use optional() or nullsafe operator
                $primaryContactValue = $primaryContact?->contact_value ?? 'N/A';
                $activeContactsCount = $activeContacts->count();

                // --- Logic to find primary deposit ---
                $primaryDeposit = $activeDeposits->firstWhere('is_primary', true)
                               ?? $activeDeposits->firstWhere('is_primary', false) // Fallback
                               ?? null; // Final fallback

                $primaryDepositType = $primaryDeposit?->depositType?->name ?? 'N/A';
                $primaryDepositValue = $primaryDeposit?->deposit_value ?? 'N/A';
                $activeDepositsCount = $activeDeposits->count();

                // --- Format Active Contacts with Type Name ---
                // Now map the loaded active contacts to include the type name
                $formattedActiveContacts = $activeContacts->map(function ($contact) {
                    return [
                        'id' => $contact->id,
                        'contact_type_id' => $contact->contact_type_id,
                        'contact_type_name' => $contact->contactType?->name ?? 'N/A', // Get the name from the loaded relationship
                        'contact_value' => $contact->contact_value,
                        'description' => $contact->description,
                        'is_primary' => $contact->is_primary,
                        'is_active' => $contact->is_active,
                        // Add any other contact fields you need on the frontend
                         'created_at' => $contact->created_at?->toISOString(),
                         'updated_at' => $contact->updated_at?->toISOString(),
                    ];
                });

                // --- Format Active Deposits (Optional, but good practice if needed) ---
                 $formattedActiveDeposits = $activeDeposits->map(function ($deposit) {
                     return [
                         'id' => $deposit->id,
                         'customer_id' => $deposit->customer_id ?? "N/A",
                         'rental_id' => $deposit->rental_id ?? "N/A",
                         'type_name' => $deposit->depositType?->name ?? "N/A",
                         'deposit_value' => $deposit->deposit_value ?? "N/A",
                         'visa_type' => $deposit->visa_type ?? "N/A",
                         'expiry_date' => $deposit->expiry_date?->toISOString() ?? "N/A",
                         'description' => $deposit->description ?? "N/A",
                         'is_primary' => $deposit->is_primary,
                         'is_active' => $deposit->is_active,
                         'start_date' => $deposit->start_date?->toISOString(),
                         'end_date' => $deposit->end_date?->toISOString(),
                         'created_at' => $deposit->created_at?->toISOString(),
                         'updated_at' => $deposit->updated_at?->toISOString(),
                     ];
                 });


                // --- Return the formatted array ---
                return [
                    'id' => $customer->id,
                    'full_name' => $customer->full_name ?: 'N/A',
                    'first_name' => $customer->first_name ?: 'N/A',
                    'last_name' => $customer->last_name ?: 'N/A',

                    'primary_contact_type' => $primaryContactType,
                    'primary_contact' => $primaryContactValue,
                    'active_contacts_count' => $activeContactsCount,

                    'primary_deposit_type' => $primaryDepositType,
                    'primary_deposit' => $primaryDepositValue,
                    'active_deposits_count' => $activeDepositsCount,

                    // Use the newly formatted collections
                    'activeContacts' => $formattedActiveContacts,
                    'activeDeposits' => $formattedActiveDeposits, // Use formatted deposits

                    'address' => $customer->full_address ?: 'N/A',
                    'address_line_1' => $customer->address_line_1 ?: 'N/A',
                    'address_line_2' => $customer->address_line_2 ?: 'N/A',
                    'commune' => $customer->commune ?: 'N/A',
                    'district' => $customer->district ?: 'N/A',
                    'city' => $customer->city ?: 'N/A',

                    'gender' => $customer->gender ?? 'N/A',
                    'nationality' => $customer->nationality ?? 'N/A',
                    'date_of_birth' => $customer->date_of_birth?->toDateString() ?? 'N/A',
                    'passport_number' => $customer->passport_number ?? 'N/A',
                    'passport_expiry' => $customer->passport_expiry?->toDateString() ?? 'N/A',
                    'notes' => $customer->notes  ?? 'N/A',
                    'user_name' => $customer->creator?->name ?? 'Initial',
                    'created_at' => $customer->created_at->toISOString(),
                    'updated_at' => $customer->updated_at->toISOString(),
                ];
            });
            Log::info("Finished formatting data. Rendering view for User [ID: {$userId}].");
            // --- Render View ---
            return Inertia::render('customers/customers-index', [
                'customers' => Inertia::defer(fn () => $formattedCustomers),
                'contactTypes' => Inertia::defer(fn () => $formattedContactTypes),
            ]);

        } catch (AuthorizationException $e) {
            Log::warning("Authorization failed for User [ID: {$userId}] accessing Customers index: " . $e->getMessage());
            abort(403, 'Unauthorized action.');
        } catch (Exception $e) {
            Log::error("Error accessing Customers index for User [ID: {$userId}]: " . $e->getMessage(), ['exception' => $e]);
            abort(500, 'Could not load customer data.');
        }
    }

    /**
     * Store a newly created resource in storage.
     * Validation logic is included directly in this method.
     *
     * @param Request $request The incoming HTTP request.
     * @return RedirectResponse Redirects back with success or error message.
     */
    public function store(Request $request): RedirectResponse
    {
        $userId = Auth::id();
        Log::info("User [ID: {$userId}] attempting to store a new Customer.");

        try {
            $this->authorize('customer-create');
            Log::info("User [ID: {$userId}] authorized for customer-create.");

            $tableName = 'customers';
            $contactsTableName = 'contacts';

            // Fetch valid contact type names dynamically or use a config/enum
            // $validContactTypes = Types::where('is_active', true)->pluck('name')->toArray();
            // Using hardcoded list as per original code for now:
            $validContactTypes = Types::where('is_active', true)->pluck('name')->toArray();
            Log::debug("Valid contact types for validation: ", $validContactTypes);

            // Define validation rules
            $rules = [
                // Basic Information
                'first_name' => [
                    'required',
                    'string',
                    'max:255',
                    Rule::unique($tableName, 'first_name')
                        ->where(function ($query) use ($request) {
                            return $query->where('last_name', $request->input('last_name'));
                        })
                ],
                'last_name' => ['required', 'string', 'max:255'],
                'date_of_birth' => ['nullable', 'date_format:Y-m-d', 'before_or_equal:today'],
                'gender' => ['nullable', 'string', Rule::in(['Male', 'Female', 'Others'])],
                'nationality' => ['nullable', 'string', 'max:255'],

                // Address Information
                'address_line_1' => ['nullable', 'string', 'max:255'],
                'address_line_2' => ['nullable', 'string', 'max:255'],
                'commune' => ['nullable', 'string', 'max:255'],
                'district' => ['nullable', 'string', 'max:255'],
                'city' => ['nullable', 'string', 'max:255'],

                // Additional Contacts (Array Validation) - Includes the primary one now
                'activeContacts' => ['nullable', 'array'],
                'activeContacts.*.contact_type' => [
                    'required', // Type is required for every contact
                    'string',
                    Rule::in($validContactTypes)
                ],
                'activeContacts.*.contact_value' => [
                    'required', // Value is required for every contact
                    'string',
                    'max:255'
                ],
                // Add validation for is_primary flag sent from frontend
                'activeContacts.*.is_primary' => ['nullable', 'boolean'],
                'activeContacts.*.description' => ['nullable', 'string', 'max:255'],

                // Meta Information
                'notes' => ['nullable', 'string', 'max:65535'],
            ];

            // Define custom messages
            $messages = [
                'activeContacts.*.contact_type.required' => 'The contact type field is required for all contacts.',
                'activeContacts.*.contact_value.required' => 'The contact value field is required for all contacts.',
                'activeContacts.*.contact_type.in' => 'The selected contact type is invalid.',
                // Removed messages for top-level primary fields
            ];


            // Define custom attributes
            $attributes = [];
            if (is_array($request->input('activeContacts'))) {
                foreach ($request->input('activeContacts') as $index => $contact) {
                    // Adjust attribute names if needed, especially if primary is always first
                    $contactNumber = $index + 1; // Simple numbering
                    $attributes["activeContacts.{$index}.contact_type"] = "contact #{$contactNumber} type";
                    $attributes["activeContacts.{$index}.contact_value"] = "contact #{$contactNumber} value";
                    $attributes["activeContacts.{$index}.description"] = "contact #{$contactNumber} description";
                    $attributes["activeContacts.{$index}.is_primary"] = "contact #{$contactNumber} is primary flag";
                }
            }

            // --- Validate ---
            Log::info("Validating request data for new Customer by User [ID: {$userId}].", ['data' => $request->except(['_token'])]);
            // Use validate() method for automatic redirection with errors
            $validatedData = $request->validate($rules, $messages, $attributes);
            Log::info("Validation successful for new Customer by User [ID: {$userId}].");

            // --- Database Saving Logic ---
            Log::info("Starting database transaction for new Customer by User [ID: {$userId}].");
            DB::beginTransaction();

            // 1. Create the Customer (Remove primary contact fields)
            Log::info("Attempting to create Customer record in database by User [ID: {$userId}].");
            $customer = Customers::create([
                'first_name' => $validatedData['first_name'],
                'last_name' => $validatedData['last_name'],
                'date_of_birth' => $validatedData['date_of_birth'] ?? null,
                'gender' => $validatedData['gender'] ?? null,
                'nationality' => $validatedData['nationality'] ?? null,
                'address_line_1' => $validatedData['address_line_1'] ?? null,
                'address_line_2' => $validatedData['address_line_2'] ?? null,
                'commune' => $validatedData['commune'] ?? null,
                'district' => $validatedData['district'] ?? null,
                'city' => $validatedData['city'] ?? null,
                'notes' => $validatedData['notes'] ?? null,
                'user_id' => Auth::id(),
            ]);
            Log::info("Successfully created Customer [ID: {$customer->id}] by User [ID: {$userId}].");

            // 2. Create Contacts
            if (!empty($validatedData['activeContacts'])) {
                Log::info("Attempting to create " . count($validatedData['activeContacts']) . " contacts for Customer [ID: {$customer->id}] by User [ID: {$userId}].");
                $contactsToInsert = [];
                // Fetch Contact Type IDs based on names for efficiency
                $contactTypeMap = Types::whereIn('name', collect($validatedData['activeContacts'])->pluck('contact_type')->unique())
                                      ->pluck('id', 'name');

                foreach ($validatedData['activeContacts'] as $contactData) {
                     $contactTypeId = $contactTypeMap[$contactData['contact_type']] ?? null;
                     if (!$contactTypeId) {
                         Log::error("Could not find contact type ID for name: {$contactData['contact_type']}. Skipping contact insertion for this entry.");
                         // Optionally throw an exception or handle more gracefully
                         continue; // Skip this contact if type ID not found
                     }
                    $contactsToInsert[] = [
                        'customer_id' => $customer->id,
                        'contact_type_id' => $contactTypeId, // Use the ID
                        'contact_value' => $contactData['contact_value'],
                        'is_primary' => $contactData['is_primary'] ?? false,
                        'description' => $contactData['description'] ?? null,
                        'is_active' => true,
                        'start_date' => now(),
                        'user_id' => Auth::id(),
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];
                }
                if (!empty($contactsToInsert)) {
                    Contacts::insert($contactsToInsert); // Bulk insert
                    Log::info("Successfully inserted " . count($contactsToInsert) . " contacts for Customer [ID: {$customer->id}].");
                }
            } else {
                Log::info("No contacts provided to create for Customer [ID: {$customer->id}].");
            }
            
            Log::info("Committing database transaction for Customer [ID: {$customer->id}] by User [ID: {$userId}].");
            DB::commit();

            return redirect()->back()->with('success', "Customer '{$customer->first_name} {$customer->last_name}' created successfully!");

        } catch (AuthorizationException $e) {
            DB::rollBack();
            Log::warning("Authorization failed for User [ID: {$userId}] creating Customer: " . $e->getMessage());
            return Redirect::back()->with('error', 'You do not have permission to create customers.');
        } catch (ValidationException $e) {
            // This block might not be reached if using $request->validate() which handles redirection
            DB::rollBack(); // Rollback if transaction started before validation exception occurred elsewhere
            Log::warning("Validation failed during Customer creation by User [ID: {$userId}].", [
                'errors' => $e->errors(),
                'request_data' => $request->except(['_token'])
            ]);
            // Let Laravel's handler manage the redirect back with errors
            throw $e;
        } catch (Exception $e) {
            DB::rollBack();
            Log::error("Error creating customer by User [ID: {$userId}]: " . $e->getMessage(), [
                'exception' => $e,
                'request_data' => $request->except(['_token'])
            ]);
            return back()->withInput()->with('error', 'Failed to create customer due to a server error. Please try again.');
        }
    }
    /**
     * Update the specified customer in storage.
     *
     * @param Request $request
     * @param Customers $customer The customer instance via route model binding
     * @return RedirectResponse
     */
    public function update(Request $request, Customers $customer): RedirectResponse
    {
        $userId = Auth::id();
        $customerId = $customer->id; // Get customer ID for logging
        Log::info("User [ID: {$userId}] attempting to update Customer [ID: {$customerId}].");

        try {
            // Authorize the update action, passing the customer instance
            $this->authorize('customer-edit'); // Assumes 'update' policy method exists
            Log::info("User [ID: {$userId}] authorized to update Customer [ID: {$customerId}].");

            $tableName = 'customers';
            $contactsTableName = 'contacts';

            // Fetch valid contact type names dynamically or use a config/enum
            $validContactTypes = Types::where('is_active', true)->pluck('name')->toArray();
            Log::debug("Valid contact types for validation: ", $validContactTypes);

            // Define validation rules
            $rules = [
                // Basic Information
                'first_name' => [
                    'required',
                    'string',
                    'max:255',
                    Rule::unique($tableName, 'first_name')
                        ->ignore($customer->id) // Ignore the current customer's record
                        ->where(function ($query) use ($request) {
                            return $query->where('last_name', $request->input('last_name'));
                        })
                ],
                'last_name' => ['required', 'string', 'max:255'],
                'date_of_birth' => ['nullable', 'date_format:Y-m-d', 'before_or_equal:today'],
                'gender' => ['nullable', 'string', Rule::in(['Male', 'Female', 'Others'])],
                'nationality' => ['nullable', 'string', 'max:255'],

                // Address Information
                'address_line_1' => ['nullable', 'string', 'max:255'],
                'address_line_2' => ['nullable', 'string', 'max:255'],
                'commune' => ['nullable', 'string', 'max:255'],
                'district' => ['nullable', 'string', 'max:255'],
                'city' => ['nullable', 'string', 'max:255'],

                // Additional Contacts (Array Validation)
                'activeContacts' => ['nullable', 'array'],
                'activeContacts.*.contact_type' => [
                    'required', // Type is required for every contact
                    'string',
                    Rule::in($validContactTypes)
                ],
                'activeContacts.*.contact_value' => [
                    'required', // Value is required for every contact
                    'string',
                    'max:255'
                ],
                'activeContacts.*.is_primary' => ['nullable', 'boolean'],
                'activeContacts.*.description' => ['nullable', 'string', 'max:255'],

                // Meta Information
                'notes' => ['nullable', 'string', 'max:65535'],
            ];

            // Define custom messages (remain largely the same)
            $messages = [
                'activeContacts.*.contact_type.required' => 'The contact type field is required for all contacts.',
                'activeContacts.*.contact_value.required' => 'The contact value field is required for all contacts.',
                'activeContacts.*.contact_type.in' => 'The selected contact type is invalid.',
            ];

            // Define custom attributes (remain largely the same)
            $attributes = [];
            if (is_array($request->input('activeContacts'))) {
                foreach ($request->input('activeContacts') as $index => $contact) {
                    $contactNumber = $index + 1;
                    $attributes["activeContacts.{$index}.contact_type"] = "contact #{$contactNumber} type";
                    $attributes["activeContacts.{$index}.contact_value"] = "contact #{$contactNumber} value";
                    $attributes["activeContacts.{$index}.description"] = "contact #{$contactNumber} description";
                    $attributes["activeContacts.{$index}.is_primary"] = "contact #{$contactNumber} is primary flag";
                }
            }

            // --- Validate ---
            Log::info("Validating request data for updating Customer [ID: {$customerId}] by User [ID: {$userId}].", ['data' => $request->except(['_token', '_method'])]); // Exclude method spoofing field if used
            $validatedData = $request->validate($rules, $messages, $attributes);
            Log::info("Validation successful for updating Customer [ID: {$customerId}] by User [ID: {$userId}].");

            // --- Database Saving Logic ---
            Log::info("Starting database transaction for updating Customer [ID: {$customerId}] by User [ID: {$userId}].");
            DB::beginTransaction();

            // 1. Update the Customer record
            Log::info("Attempting to update Customer [ID: {$customerId}] record in database by User [ID: {$userId}].");
            $customer->update([
                'first_name' => $validatedData['first_name'],
                'last_name' => $validatedData['last_name'],
                'date_of_birth' => $validatedData['date_of_birth'] ?? null,
                'gender' => $validatedData['gender'] ?? null,
                'nationality' => $validatedData['nationality'] ?? null,
                'address_line_1' => $validatedData['address_line_1'] ?? null,
                'address_line_2' => $validatedData['address_line_2'] ?? null,
                'commune' => $validatedData['commune'] ?? null,
                'district' => $validatedData['district'] ?? null,
                'city' => $validatedData['city'] ?? null,
                'notes' => $validatedData['notes'] ?? null,
                // 'user_id' is typically NOT updated - it tracks the creator
            ]);
            Log::info("Successfully updated Customer [ID: {$customerId}] by User [ID: {$userId}].");

            // 2. Synchronize Contacts (Delete existing and insert new ones)
            // This is a common strategy for simplicity. If you need to preserve contact IDs
            // or perform more granular updates, the logic here would be more complex,
            // involving matching existing contacts with incoming data.

            Log::info("Deleting existing contacts for Customer [ID: {$customerId}] before inserting updated list.");
            Contacts::where('customer_id', $customer->id)->delete(); // Or mark as inactive: ->update(['is_active' => false, 'end_date' => now()])

            if (!empty($validatedData['activeContacts'])) {
                Log::info("Attempting to insert " . count($validatedData['activeContacts']) . " contacts for Customer [ID: {$customerId}] by User [ID: {$userId}].");
                $contactsToInsert = [];
                // Fetch Contact Type IDs based on names for efficiency
                $contactTypeMap = Types::whereIn('name', collect($validatedData['activeContacts'])->pluck('contact_type')->unique())
                                      ->pluck('id', 'name');

                foreach ($validatedData['activeContacts'] as $contactData) {
                     $contactTypeId = $contactTypeMap[$contactData['contact_type']] ?? null;
                     if (!$contactTypeId) {
                         Log::error("Could not find contact type ID for name: {$contactData['contact_type']} during update. Skipping contact insertion for this entry.");
                         // Consider throwing an exception or adding a validation error if a type is missing
                         continue; // Skip this contact if type ID not found
                     }
                    $contactsToInsert[] = [
                        'customer_id' => $customer->id, // Use the existing customer's ID
                        'contact_type_id' => $contactTypeId,
                        'contact_value' => $contactData['contact_value'],
                        'is_primary' => $contactData['is_primary'] ?? false,
                        'description' => $contactData['description'] ?? null,
                        'is_active' => true,
                        'start_date' => now(), // Or maybe keep original start_date if updating? Depends on requirements.
                        'user_id' => Auth::id(), // Record who last updated the contacts
                        'created_at' => now(), // Set creation timestamp for new records
                        'updated_at' => now(), // Set update timestamp
                    ];
                }
                if (!empty($contactsToInsert)) {
                    Contacts::insert($contactsToInsert); // Bulk insert the new/updated contacts
                    Log::info("Successfully inserted " . count($contactsToInsert) . " contacts for Customer [ID: {$customerId}].");
                }
            } else {
                Log::info("No active contacts provided; all existing contacts (if any) were removed for Customer [ID: {$customerId}].");
            }

            Log::info("Committing database transaction for Customer [ID: {$customerId}] update by User [ID: {$userId}].");
            DB::commit();

            return redirect()->back()->with('success', "Customer '{$customer->first_name} {$customer->last_name}' updated successfully!");

        } catch (AuthorizationException $e) {
            DB::rollBack(); // Rollback transaction if started
            Log::warning("Authorization failed for User [ID: {$userId}] updating Customer [ID: {$customerId}]: " . $e->getMessage());
            // Redirect back to the edit form with an error
            return redirect()->route('customers.index', $customer)->with('error', 'You do not have permission to update this customer.');
        } catch (ValidationException $e) {
            // Validation errors: Laravel automatically redirects back with errors.
            // Log the validation failure. No need to manually redirect.
            DB::rollBack(); // Rollback if transaction started before validation exception occurred elsewhere
            Log::warning("Validation failed during Customer [ID: {$customerId}] update by User [ID: {$userId}].", [
                'errors' => $e->errors(),
                'request_data' => $request->except(['_token', '_method'])
            ]);
            // Rethrow is not needed as Laravel's handler manages it.
            // Just ensure the view correctly displays old input and errors.
             return redirect()->route('customers.index', $customer)
                    ->withErrors($e->validator)
                    ->withInput();
        } catch (Exception $e) {
            DB::rollBack(); // Rollback transaction
            Log::error("Error updating Customer [ID: {$customerId}] by User [ID: {$userId}]: " . $e->getMessage(), [
                'exception' => $e,
                'request_data' => $request->except(['_token', '_method'])
            ]);
            // Redirect back to the edit form with a generic error
             return redirect()->route('customers.index', $customer)
                    ->withInput() // Keep user's input
                    ->with('error', 'Failed to update customer due to a server error. Please try again.');
        }
    }






    public function destroy(Request $request, Customers $customer): RedirectResponse
    {
        // 1. Authorize: Ensure the authenticated user has permission.
        $this->authorize('customer-delete', $customer); // Pass $customer if policy needs it

        $validator = Validator::make($request->all(), [
            'password' => 'required|string', // Ensure password is required
        ]);

        // Check if validation fails
        if ($validator->fails()) {
            Log::warning("Attempted to delete customer {$customer->id} without authenticated user.");
            return back()->withErrors($validator)->withInput();
        }

        // 4. Verify Administrator Password: Check the submitted password against the logged-in admin's hash.
        $admin = Auth::user();

        // Ensure we have an authenticated admin user
        if (!$admin) {
            Log::warning("Attempted to delete customer {$customer->id} without permissions.");
            return back()->withErrors(['password' => 'Authentication error. Please log in again.']);
        }

        // Check the provided password against the admin's stored hashed password.
        if (!Hash::check($request->input('password'), $admin->password)) {
            return back()->withErrors(['password' => 'The provided administrator password does not match.'])->withInput();
        }
        

        // Store identifier for success/error messages before potential deletion error
        $customerIdentifier = $customer->first_name ?? $customer->last_name ?? $customer->id;

        try {
            // 2. Update the user_id field BEFORE deleting
            $customer->user_id = Auth::id(); // Get the ID of the currently logged-in user
            $customer->save(); // Save the change to the database

            // 3. Delete Customer: Attempt to delete the customer record.
            $customer->delete();
            return to_route('customers.index');

        } catch (AuthorizationException $e) {
            // Optional: Catch authorization exceptions separately if needed
            Log::warning("Authorization failed for deleting customer {$customer->id}: " . $e->getMessage());
            // You might want to redirect differently or show a specific message
            return redirect()->back()->with('error', 'You do not have permission to delete this customer.');

        } catch (Exception $e) {
            // 5. Handle Update/Deletion Errors:
            // Log the specific exception.
            Log::error("Error processing customer {$customer->id} (update or delete): " . $e->getMessage());

            // Redirect back with a generic error message.
            // Corrected the error message context from 'vehicle' to 'customer'
            return redirect()->back()
                ->with('error', 'Could not delete the customer due to a server error. Please try again later.');
            // Alternative: return to_route('customers.index')->with('error', 'Could not delete the customer...');
        }
    }
}
