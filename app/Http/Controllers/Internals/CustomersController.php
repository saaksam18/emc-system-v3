<?php

namespace App\Http\Controllers\Internals;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Redirect;
use Inertia\Response;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Arr;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Support\Collection;
use Illuminate\Database\Eloquent\Builder;

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
        $this->authorize('customer-list');
        // Fetch customers and eager-load their active contacts
        $customers = Customers::with('activeContacts') // Use with() for cleaner eager loading
                               ->with('creator:id,name') // load creator efficiently
                               ->get();
        
        $contactTypes = Types::with('creator:id,name')
        ->where('is_active', true)
        ->orderBy('name', 'asc')
        ->get();

        $formattedContactTypes = $contactTypes->map(function (Types $contactTypes) {
            return [
                'id' => $contactTypes->id,
                'name' => $contactTypes->name,
            ];
        });

        // Map the customer data for the frontend
        $formattedCustomers = $customers->map(function (Customers $customer) {
            // Get the loaded active contacts collection
            $activeContacts = $customer->activeContacts;

            // --- Logic to find primary contacts (similar to React helper) ---

            // Find primary contact
            $primaryContact = $activeContacts->first(function ($contact) {
                return $contact->is_primary;
            });
            if (!$primaryContact) { // Fallback if no primary found
                $primaryContact = $activeContacts->firstWhere('is_primary', false);
            }
            $primaryContactType = $primaryContact ? $primaryContact->contact_type : 'N/A';
            $primaryContactValue = $primaryContact ? $primaryContact->contact_value : 'N/A';

            // Count active contacts
            $activeContactsCount = $activeContacts->count();

            // Find primary deposit
            $activeDeposits = $customer->activeDeposits;
            $primaryDeposit = $activeDeposits->first(function ($deposit) {
                return $deposit->is_primary;
            });
            if (!$primaryDeposit) { // Fallback if no primary found
                $primaryDeposit = $activeDeposits->firstWhere('is_primary', false);
            }
            $primaryDepositType = $primaryDeposit ? $primaryDeposit->type : 'N/A';
            $primaryDepositValue = $primaryDeposit ? $primaryDeposit->registered_number : 'N/A';

            // Count active deposit
            $activeDepositsCount = $activeDeposits->count();

            // --- Return the formatted array ---
            return [
                'id' => $customer->id,
                // Match fields expected by the React table
                'full_name' => $customer->full_name ?: 'N/A',
                'first_name' => $customer->first_name ?: 'N/A',
                'last_name' => $customer->last_name ?: 'N/A',

                // Add the derived contact info
                'primary_contact_type' => $primaryContactType,
                'primary_contact' => $primaryContactValue,
                'active_contacts_count' => $activeContactsCount,

                // Add the derived deposit info
                'primary_deposit_type' => $primaryDepositType,
                'primary_deposit' => $primaryDepositValue,
                'active_deposits_count' => $activeDepositsCount,

                // Include activeContacts if needed for "View Details" action on frontend
                'activeContacts' => $activeContacts,
                'activeDeposits' => $activeDeposits,

                // Address
                'address' => $customer->full_address ?: 'N/A',
                'address_line_1' => $customer->address_line_1 ?: 'N/A',
                'address_line_2' => $customer->address_line_2 ?: 'N/A',
                'commune' => $customer->commune ?: 'N/A',
                'district' => $customer->district ?: 'N/A',
                'city' => $customer->city ?: 'N/A',

                // Add other fields from your original map if needed elsewhere
                'gender' => $customer->gender ?? 'N/A',
                'nationality' => $customer->nationality ?? 'N/A',
                'date_of_birth' => $customer->date_of_birth?->toDateString() ?? 'N/A', // Format dates
                'passport_number' => $customer->passport_number ?? 'N/A',
                'passport_expiry' => $customer->passport_expiry?->toDateString() ?? 'N/A', // Format dates
                'notes' => $customer->notes  ?? 'N/A',
                'user_name' => $customer->creator?->name ?? 'Initial',
                'created_at' => $customer->created_at->toISOString(), // Format for JS
                'updated_at' => $customer->updated_at->toISOString(), // Format for JS
            ];
        });

        return Inertia::render('customers/customers-index', [
            // Use the formatted data directly
            'customers' => $formattedCustomers,
            'contactTypes' => $formattedContactTypes,
            // Or defer if it's a large dataset and you handle loading state in React
            // 'customers' => Inertia::defer(fn () => $formattedCustomers),
        ]);
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
        $this->authorize('customer-create');
        $tableName = 'customers';

        // Define common contact types - ensure these match your frontend options
        $validContactTypes = ['Email', 'Phone', 'Mobile', 'Work Phone', 'Home Phone', 'Fax', 'Other'];

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

            // --- REMOVED Primary Contact Information Rules (now part of activeContacts) ---
            // 'primary_contact_type' => [ ... ],
            // 'primary_contact' => [ ... ],

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

        // Create the validator instance
        $validator = Validator::make($request->all(), $rules, $messages, $attributes);

        // Check if validation fails
        if ($validator->fails()) {
            return back()->withErrors($validator)->withInput();
        }

        // Retrieve validated data
        $validatedData = $validator->validated();

        // --- Database Saving Logic ---
        DB::beginTransaction();
        $userID = Auth::id();

        try {
            // 1. Create the Customer (Remove primary contact fields)
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
                // 'primary_contact_type' => $validatedData['primary_contact_type'] ?? null, // REMOVED
                // 'primary_contact' => $validatedData['primary_contact'] ?? null,         // REMOVED
                'notes' => $validatedData['notes'] ?? null,
                'user_id' => $userID,
            ]);

            // 2. Create ALL Contacts (including primary) from activeContacts array
            if (!empty($validatedData['activeContacts'])) {
                $contactsToInsert = [];
                foreach ($validatedData['activeContacts'] as $contactData) {
                    $contactsToInsert[] = [
                        'customer_id' => $customer->id,
                        'contact_type' => $contactData['contact_type'],
                        'contact_value' => $contactData['contact_value'],
                        'is_primary' => $contactData['is_primary'] ?? false, // Use the flag from payload
                        'description' => $contactData['description'] ?? null,
                        'is_active' => true, // Default to active based on schema
                        'start_date' => now(), // Set start date based on schema
                        'user_id' => $userID, // Set user_id based on schema
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];
                }
                 // Use the Contacts model to insert
                 Contacts::insert($contactsToInsert);
            }

            DB::commit();

            return redirect()->route('customers.index') // Adjust route name if needed
                   ->with('success', 'Customer created successfully!');

        } catch (Exception $e) {
            DB::rollBack();

            Log::error('Error creating customer: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'request_data' => $request->except(['password', 'password_confirmation'])
            ]);

            $errorMessage = config('app.debug') ? 'Failed to create customer: ' . $e->getMessage() : 'Failed to create customer. Please try again.';
            return back()->withInput()->with('error', $errorMessage);
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
        $this->authorize('customer-edit'); // Optional: Policy check
        $tableName = 'customers';
        $contactsTableName = 'contacts'; // Make sure this matches your contacts table name

        // Define common contact types - ensure these match your frontend options
        $validContactTypes = ['Email', 'Phone', 'Mobile', 'Work Phone', 'Home Phone', 'Fax', 'Other'];

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

            // Contacts (Array Validation)
            'activeContacts' => ['present', 'array'], // Must be present, can be empty array
            'activeContacts.*.id' => ['nullable', 'integer', Rule::exists($contactsTableName, 'id')->where('customer_id', $customer->id)], // Existing IDs must belong to this customer
            'activeContacts.*.contact_type' => ['required', 'string', Rule::in($validContactTypes)],
            'activeContacts.*.contact_value' => ['required', 'string', 'max:255'],
            'activeContacts.*.is_primary' => ['nullable', 'boolean'],
            'activeContacts.*.description' => ['nullable', 'string', 'max:255'],

             // Ensure at least one contact is marked as primary IF contacts are provided
             'activeContacts' => [
                'present',
                'array',
                function ($attribute, $value, $fail) {
                    if (empty($value)) {
                        return; // Allow empty array if user removes all contacts
                    }
                    $primaryCount = 0;
                    foreach ($value as $contact) {
                        if (!empty($contact['is_primary']) && $contact['is_primary']) {
                            $primaryCount++;
                        }
                    }
                    if ($primaryCount === 0) {
                        $fail('At least one contact must be marked as primary.');
                    }
                    if ($primaryCount > 1) {
                        $fail('Only one contact can be marked as primary.');
                    }
                },
            ],

            // Meta Information
            'notes' => ['nullable', 'string', 'max:65535'],
        ];

        // Define custom messages
        $messages = [
            'activeContacts.*.contact_type.required' => 'The contact type is required for all contacts.',
            'activeContacts.*.contact_value.required' => 'The contact value is required for all contacts.',
            'activeContacts.*.contact_type.in' => 'The selected contact type is invalid.',
            'activeContacts.*.id.exists' => 'An invalid contact ID was provided.',
            'activeContacts.required' => 'Contact information is missing.', // If 'present' isn't enough
        ];

        // Define custom attributes
        $attributes = [];
        if (is_array($request->input('activeContacts'))) {
            foreach ($request->input('activeContacts') as $index => $contact) {
                $contactNumber = $index + 1;
                $attributes["activeContacts.{$index}.id"] = "contact #{$contactNumber} ID";
                $attributes["activeContacts.{$index}.contact_type"] = "contact #{$contactNumber} type";
                $attributes["activeContacts.{$index}.contact_value"] = "contact #{$contactNumber} value";
                $attributes["activeContacts.{$index}.description"] = "contact #{$contactNumber} description";
                $attributes["activeContacts.{$index}.is_primary"] = "contact #{$contactNumber} primary flag";
            }
        }

        // Create the validator instance
        $validator = Validator::make($request->all(), $rules, $messages, $attributes);

        // Check if validation fails
        if ($validator->fails()) {
            return back()->withErrors($validator)->withInput();
        }

        // Retrieve validated data
        $validatedData = $validator->validated();
        $incomingContactsData = $validatedData['activeContacts']; // Already validated

        // --- Database Saving Logic ---
        DB::beginTransaction();
        $userID = Auth::id(); // Assuming user needs to be logged in

        try {
            // 1. Update the Customer model fields
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
                // user_id is usually set on creation, not updated unless intended
            ]);

            // 2. Synchronize Contacts
            $existingContactIds = $customer->contacts()->pluck('id')->toArray();
            $incomingContactIds = collect($incomingContactsData)->pluck('id')->filter()->toArray(); // Get IDs from incoming data, filter out null/new

            // IDs to delete: exist in DB but not in incoming valid IDs
            $idsToDelete = array_diff($existingContactIds, $incomingContactIds);
            if (!empty($idsToDelete)) {
                Contacts::whereIn('id', $idsToDelete)->where('customer_id', $customer->id)->delete();
            }

            // Update existing or Create new contacts
            foreach ($incomingContactsData as $contactData) {
                 // Prepare data common to create/update
                 $contactDetails = [
                    'customer_id' => $customer->id,
                    'contact_type' => $contactData['contact_type'],
                    'contact_value' => $contactData['contact_value'],
                    'is_primary' => $contactData['is_primary'] ?? false,
                    'description' => $contactData['description'] ?? null,
                    'is_active' => true, // Assuming active by default
                    'start_date' => now(), // Or handle start/end dates if needed
                    'user_id' => $userID, // Associate with current user
                ];

                if (!empty($contactData['id']) && is_numeric($contactData['id'])) {
                    // Update existing contact - check if ID is valid first (already done by validation)
                    $contact = Contacts::find($contactData['id']);
                    if ($contact && $contact->customer_id == $customer->id) { // Double check ownership
                         // Unset fields that shouldn't be mass-assigned on update if needed
                         // unset($contactDetails['customer_id'], $contactDetails['user_id'], $contactDetails['start_date']);
                         $contact->update($contactDetails);
                    } else {
                         // Log error or handle case where ID is invalid/doesn't belong?
                         Log::warning("Attempted to update non-existent or unauthorized contact ID {$contactData['id']} for customer {$customer->id}");
                    }
                } else {
                    // Create new contact (ID is missing, null, or non-numeric like 'new_...')
                    Contacts::create($contactDetails);
                }
            }

            // Ensure only one primary contact remains (optional, belt-and-suspenders check)
            // If validation ensures only one 'is_primary' => true comes in, this might be redundant
            // $primaryContacts = $customer->contacts()->where('is_primary', true)->get();
            // if ($primaryContacts->count() > 1) {
            //     // Demote all but the first one found (or based on some logic)
            //     $primaryContacts->slice(1)->each(function ($contact) {
            //         $contact->update(['is_primary' => false]);
            //     });
            // }


            DB::commit();

            // Redirect back to index or show page
            return redirect()->route('customers.index') // Adjust route name if needed
                   ->with('success', 'Customer updated successfully!');

        } catch (Exception $e) {
            DB::rollBack();

            Log::error('Error updating customer ID ' . $customer->id . ': ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'request_data' => $request->except(['password', 'password_confirmation']) // Be careful logging sensitive data
            ]);

            $errorMessage = config('app.debug') ? 'Failed to update customer: ' . $e->getMessage() : 'Failed to update customer. Please try again.';
            // Redirect back to the edit form with errors
            return back()->withInput()->with('error', $errorMessage);
        }
    }






    public function destroy(Customers $customer): RedirectResponse
    {
        // 1. Authorize: Ensure the authenticated user has permission.
    $this->authorize('customer-delete', $customer); // Pass $customer if policy needs it

    // --- Optional: Check if a user is actually logged in ---
    if (!Auth::check()) {
        // Handle appropriately - maybe throw an exception or redirect with error
        Log::warning("Attempted to delete customer {$customer->id} without authenticated user.");
        return redirect()->back()->with('error', 'You must be logged in to perform this action.');
    }
    

    // Store identifier for success/error messages before potential deletion error
    // Note: Your comments mention 'vehicle', but code uses 'customer'. Using 'customer' here.
    $customerIdentifier = $customer->first_name ?? $customer->last_name ?? $customer->id;

    try {
        // 2. Update the user_id field BEFORE deleting
        $customer->user_id = Auth::id(); // Get the ID of the currently logged-in user
        $customer->save(); // Save the change to the database

        // 3. Delete Customer: Attempt to delete the customer record.
        $customer->delete();

        // 4. Redirect on Success: Redirect to the index page with a success message.
        // It's good practice to add a success message.
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
