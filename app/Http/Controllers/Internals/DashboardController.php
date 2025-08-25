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

// Import your new service
use App\Services\ChartDataService;

// Import models still needed for index() method
use App\Models\Rentals;
use App\Models\User;
use App\Models\Vehicles;
use App\Models\Contacts;
use App\Models\Deposits;

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
        $userId = Auth::id() ?? 'guest';
        Log::info("User [ID: {$userId}] attempting to access Dashboard.");

        try {
            $this->authorize('dashboard-list');
            Log::info("User [ID: {$userId}] authorized for dashboard-list.");

            // Fetch overdue rentals data for the dashboard
            $overdueRentals = $this->getOverdueRentalsData();

            // Fetch overdue rentals data for the dashboard
            $users = $this->getUsers();

            // Call the new method to get deposit and overdue counts
            $depositAndOverdueData = $this->getDepositAndOverdueCount();

            //dd($depositAndOverdueData);

            return Inertia::render('dashboard', [
                'rentals' => Inertia::defer(fn () => $overdueRentals),
                'users' => Inertia::defer(fn () => $users),
                'depositAndOverdueData' => Inertia::defer(fn () => $depositAndOverdueData),

            ]);

        } catch (AuthorizationException $e) {
            Log::warning("Authorization failed for User [ID: {$userId}] accessing Dashboard: " . $e->getMessage());
            abort(403, 'Unauthorized action.');
        } catch (Exception $e) {
            Log::error("Error accessing Dashboard for User [ID: {$userId}]: " . $e->getMessage(), ['exception' => $e]);
            abort(500, 'Could not load dashboard data.');
        }
    }

    protected function getDepositAndOverdueCount()
    {
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

        return [
            'numericDepositSum' => $numericDepositSum,
            'textDepositCount' => $textDepositCount,
            'textDepositValues' => $textDepositValues,
            'overdueRentalsCount' => $overdueRentalsCount,
        ];
    }

    /**
     * Fetches overdue rental data and calculates overdue duration.
     * This method can be called internally by other controller methods.
     *
     * @return \Illuminate\Support\Collection
     */
    protected function getOverdueRentalsData()
    {

        $rentals = Rentals::overdue()
        ->whereNull('actual_return_date')
        ->where('end_date', '<', now())
        ->get();

        // Map the customer data for the frontend
        $formattedRentals = $rentals->map(function (Rentals $rental) use ($rentals) { // Added $rentals to use()
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
            ->where('is_active', true)
            ->get();

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
            // This loop was calculating overdue days for ALL rentals in the outer collection
            // inside each individual rental's map callback, which is incorrect and redundant.
            // It should be applied to the current $rental being mapped.
            if ($rental->end_date instanceof Carbon) {
                $overdueDays = $rental->end_date->diffInDays(Carbon::now());
                $overdueHuman = $rental->end_date->diffForHumans(Carbon::now(), true);

                $rental->overdue_duration_days = $overdueDays;
                $rental->overdue_duration_human = $overdueHuman;
            } else {
                $rental->overdue_duration_days = null;
                $rental->overdue_duration_human = 'N/A';
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
                'coming_date' => $rental->coming_date,
                'period' => $rental->period,
                'overdue' => $rental->overdue_duration_human, // Use the human readable value

                // Additional Info
                'notes' => $rental->notes ?? 'N/A', // Null coalescing for notes
                'incharger_name' => $rental->incharger?->name ?? 'Initial', // Optional chaining for creator name
                'user_name' => $rental->creator?->name ?? 'Initial', // Optional chaining for creator name
                'created_at' => $rental->created_at?->toISOString() ?? 'N/A', // Optional chaining for dates
                'updated_at' => $rental->updated_at?->toISOString() ?? 'N/A', // Optional chaining for dates
            ];
        });

        // Finally, return the modified collection
        return $formattedRentals;
    }

    /**
     * Fetches overdue rental data and calculates overdue duration.
     * This method can be called internally by other controller methods.
     *
     * @return \Illuminate\Support\Collection
     */
    protected function getUsers()
    {
        $users = User::all();

        // --- Format Data for View ---
        $formattedUsers = $users->map(function (User $user) {
            return [
                'id' => $user->id,
                'name' => $user->name,
            ];
        });

        // Finally, return the modified collection
        return $formattedUsers;
    }


    public function addComingDate(Request $request, Rentals $rental): RedirectResponse
    {

        // Get authenticated user's ID early for logging/tracking
        $userId = Auth::id();

        // 1. Authorize: Ensure the authenticated user has permission.
        // Use the existing $rental instance passed via route model binding.
        $this->authorize('rental-edit', $rental); // Assuming 'rental-delete' policy exists

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
                'coming_date' => 'required|date',
                'notes' => 'nullable|string',
            ];

            // --- Custom Error Messages ---
            $messages = [
                // Incharger
                'user_name.required' => 'The incharge person is required.',
                'user_name.string' => 'The incharge name must be a string.',
                'user_name.exists' => 'The selected incharge person does not exist.', // Use exists message

                // Date & Pricing
                'coming_date.required' => 'Start date is required.',
                'coming_date.date' => 'Start date must be a valid date.',
            ];

            // --- Define custom attributes for better error messages ---
            $attributes = [
                'user_name' => 'incharge person',
                'coming_date' => 'coming date',
            ];

            // Use validate() which automatically handles redirection on failure
            $validatedData = $request->validate($rules, $messages, $attributes);
            // --- Start Database Transaction ---

            //dd($validatedData);
            DB::beginTransaction();

            // --- Find related models needed for updates ---
            // Find the User model instance for the incharger using the validated name
            $incharger = User::where('name', $validatedData['user_name'])->firstOrFail();
            $vehicle = Vehicles::find($rental->vehicle_id);

            // --- ** NEW: Replicate the Rental Record Before Modification ** ---
            $archivedRental = $rental->replicate(); // Create a copy of the original data
            // Modify the replicated record to mark it as an archive
            $archivedRental->status = 'Added Coming Date';
            $archivedRental->coming_date = $validatedData['coming_date'];
            $archivedRental->notes = $validatedData['notes'];
            $archivedRental->incharger_id = $incharger->id;
            $archivedRental->user_id = $userId;
            $archivedRental->is_active = true;
            $archivedRental->created_at = now();
            $archivedRental->updated_at = now();
            // Save the archived copy.
            // Note: This assumes no unique constraints (other than PK) will conflict.
            // If conflicts exist (e.g., unique rental agreement number), adjust data or schema.
            $archivedRental->save();
            // --- ** End Replication Logic ** ---

            // 4. Update related Vehicle
            if ($vehicle) {
                // Ensure the vehicle is currently linked to *this* specific rental before clearing
                if ($vehicle->current_rental_id == $rental->id) {
                    $vehicle->current_rental_id = $archivedRental->id; 
                    $vehicle->user_id = $userId;
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
            // --- ** End Deposit Processing Logic ** ---

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
            return to_route('dashboard') // Use the correct route name for your rentals list
                   ->with('success', "Rental for {$customerIdentifier} successfully added coming date, archived, and vehicle status updated.");

        } catch (AuthorizationException $e) {
            DB::rollBack(); // Rollback transaction on authorization failure
            Log::warning("Authorization failed for User [ID: {$userId}] adding coming date Rental [ID: {$rental->id}]: " . $e->getMessage());
            // Provide a user-friendly error message
            return Redirect::back()->with('error', 'You do not have permission to extend this rental.');
        } catch (ValidationException $e) {
            // No need to rollback here, Laravel handles this before the transaction starts
            // Log the validation errors for debugging
            Log::warning("Validation failed for User [ID: {$userId}] adding coming date Rental [ID: {$rental->id}].", [
                'errors' => $e->errors(),
                'request_data' => $request->except(['_token', 'password', 'password_confirmation']) // Exclude sensitive data
            ]);
            // Let Laravel handle the redirection back with errors automatically
            throw $e;
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            DB::rollBack(); // Rollback if a related model (User, Status) wasn't found during processing
            Log::error("Model not found during rental adding coming date for User [ID: {$userId}], Rental [ID: {$rental->id}]: " . $e->getMessage(), [
                    'request_data' => $request->except(['_token', 'password', 'password_confirmation'])
            ]);
            // Determine which model was not found if possible, or provide a general error
            $modelName = match(true) {
                // Check message content to guess the missing model
                str_contains($e->getMessage(), 'App\\Models\\User') => 'incharge person',
                str_contains($e->getMessage(), 'App\\Models\\VehicleStatus') => 'vehicle status',
                // Add other models if necessary
                default => 'required information' // Fallback message
            };
            return Redirect::back()
                ->withInput() // Keep user's input
                ->with('error', "The selected {$modelName} could not be found. Please check your selection and try again.");
        } catch (\Throwable $e) { // Catch any other unexpected errors
            DB::rollBack(); // Rollback transaction on any other errors
            Log::critical("An unexpected error occurred during rental adding coming date for User [ID: {$userId}], Rental [ID: {$rental->id}]: " . $e->getMessage(), [
                'exception' => $e,
                'request_data' => $request->except(['_token', 'password', 'password_confirmation'])
            ]);
            // Provide a generic error message to the user
            return Redirect::back()
                   ->withInput()
                   ->with('error', 'An unexpected error occurred while processing the adding coming date. Please try again later or contact support.');
        }
    }
}