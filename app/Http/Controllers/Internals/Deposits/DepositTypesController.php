<?php

namespace App\Http\Controllers\Internals\Deposits;

use App\Http\Controllers\Controller;
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

// Auth
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Foundation\Validation\ValidatesRequests;

// status
use App\Models\Deposits\DepositTypes;
use App\Models\User;

class DepositTypesController extends Controller
{
    use AuthorizesRequests, ValidatesRequests;

    /**
     * Display a listing of the customers.
     *
     * @return \Inertia\Response
     */
    public function index(): Response
    {
        $userId = Auth::id() ?? 'guest'; // Get user ID or 'guest' if not logged in
        Log::info("User [ID: {$userId}] attempting to access Deposit Type index.");

        try {
            // Authorize before proceeding
            $this->authorize('type-list');
            Log::info("User [ID: {$userId}] authorized for type-list.");

            // Fetch active Deposit Type and eager-load creator
            $types = DepositTypes::with('creator:id,name')
                                    ->where('is_active', true)
                                    ->orderBy('name', 'asc')
                                    ->get();
            Log::info("Retrieved {$types->count()} active Deposit Type for User [ID: {$userId}].");

            // Map the Deposit Type data for the frontend
            $formattedDepositType = $types->map(function (DepositTypes $type) {
                // --- Return the formatted array ---
                return [
                    'id' => $type->id,
                    'name' => $type->name ?: 'N/A',
                    'is_active' => $type->is_active ? 'Yes' : 'No',
                    'description' => $type->description ?? 'N/A',
                    'user_name' => $type->creator?->name ?? 'Initial',
                    'start_date' => $type->start_date?->toISOString(), // Format for JS, add nullsafe
                    'end_date' => $type->end_date?->toISOString(), // Format for JS, add nullsafe
                    'created_at' => $type->created_at?->toISOString(), // Format for JS, add nullsafe
                    'updated_at' => $type->updated_at?->toISOString(), // Format for JS, add nullsafe
                ];
            });

            Log::info("Successfully formatted Deposit type for User [ID: {$userId}]. Rendering view.");

            return Inertia::render('rentals/settings/rentals-setting-deposit-type', [
                'depositeType' => Inertia::defer(fn () => $formattedDepositType),
            ]);

        } catch (AuthorizationException $e) {
            // Log authorization failure specifically
            Log::warning("Authorization failed for User [ID: {$userId}] accessing Deposit Type index: " . $e->getMessage());
            abort(403, 'Unauthorized action.');

        } catch (Exception $e) {
            // Catch any other unexpected errors during data fetching or processing
            Log::error("Error accessing Deposit Type index for User [ID: {$userId}]: " . $e->getMessage(), [
                'exception' => $e
            ]);
            // Return an error view or response
            abort(500, 'Could not load Deposit Type.'); // A common way to handle this
        }
    }

    /**
     * Store a newly created resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\RedirectResponse
     */
    public function store(Request $request): RedirectResponse
    {
        $userID = Auth::id(); // Get authenticated user's ID
        Log::info("User [ID: {$userID}] attempting to store a new Deposit Type.");

        try {
            // Authorize action
            $this->authorize('type-create');
            Log::info("User [ID: {$userID}] authorized for type-create.");

            // 1. Define validation rules
            $rules = [
                'name' => 'required|string|max:255',
                'description' => 'nullable|string|max:1000',
            ];

            // 2. Define custom validation messages
            $messages = [
                'name.required' => 'Please enter a name for the Deposit Type.',
                'name.string' => 'The name must be a valid string.',
                'name.max' => 'The name cannot be longer than :max characters.',
                'description.string' => 'The description must be a valid string.',
                'description.max' => 'The description cannot be longer than :max characters.',
            ];

            // 3. Validate the incoming request data
            Log::info("Validating request data for new Deposit Type by User [ID: {$userID}].", ['data' => $request->only(['name', 'description'])]);
            $validatedData = $request->validate($rules, $messages);
            Log::info("Validation successful for new Deposit Type by User [ID: {$userID}].");

            // 4. Create a new status record
            Log::info("Attempting to create Deposit Type in database by User [ID: {$userID}].", ['validated_data' => $validatedData]);
            $depositType = DepositTypes::create([
                'name' => $validatedData['name'],
                'description' => $validatedData['description'],
                'user_id' => $userID,
            ]);
            Log::info("Successfully created Deposit Type [ID: {$depositType->id}] by User [ID: {$userID}].");

            // 5. Redirect back on success
            return Redirect::back()->with('success', 'Deposit type created successfully!');

        } catch (AuthorizationException $e) {
            Log::warning("Authorization failed for User [ID: {$userID}] creating Deposit Type: " . $e->getMessage());
            return Redirect::back()->with('error', 'You do not have permission to create Deposit Type.');
        } catch (\Illuminate\Validation\ValidationException $e) {
            // Validation exceptions are typically handled by Laravel's exception handler,
            // which redirects back with errors. Logging here can be useful for tracing.
            Log::warning("Validation failed for User [ID: {$userID}] creating Deposit Type.", [
                'errors' => $e->errors(),
                'request_data' => $request->all() // Log submitted data on validation failure
            ]);
            // No need to redirect here, Laravel handles it.
            throw $e; // Re-throw for Laravel's handler
        }
    }

    /**
     * Update the specified resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \App\statuss\Contacts\Types  $class The class instance via route status binding.
     * @return \Illuminate\Http\RedirectResponse
     */
    public function update(Request $request, DepositTypes $type): RedirectResponse
    {
        $userID = Auth::id();
        Log::info("User [ID: {$userID}] attempting to update Deposit Type [ID: {$type->id}].");

        try {
            // Authorize action
            $this->authorize('type-edit', $type); // Pass status if policy needs it
            Log::info("User [ID: {$userID}] authorized to edit Deposit Type [ID: {$type->id}].");

            // 1. Define validation rules for update
            $rules = [
                'name' => [
                    'required',
                    'string',
                    'max:255',
                ],
                'description' => 'nullable|string|max:1000',
            ];

            // 2. Define custom validation messages
            $messages = [
                'name.required' => 'Please enter a name for the Deposit Type.',
                'name.string' => 'The name must be a valid string.',
                'name.max' => 'The name cannot be longer than :max characters.',
                'description.string' => 'The description must be a valid string.',
                'description.max' => 'The description cannot be longer than :max characters.',
            ];

            // 3. Validate the incoming request data
            Log::info("Validating request data for updating Deposit Type [ID: {$type->id}] by User [ID: {$userID}].", ['data' => $request->only(['name', 'description'])]);
            $validatedData = $request->validate($rules, $messages);
            Log::info("Validation successful for updating Deposit Type [ID: {$type->id}] by User [ID: {$userID}].");

            // 4. Update the class record
            Log::info("Attempting to update Deposit Type [ID: {$type->id}] in database by User [ID: {$userID}].", ['validated_data' => $validatedData]);
            $updated = $type->update([
                'name' => $validatedData['name'],
                'description' => $validatedData['description'],
            ]);

            if ($updated) {
                Log::info("Successfully updated Deposit Type [ID: {$type->id}] by User [ID: {$userID}].");
            } else {
                // This case is less common with Eloquent update but possible
                Log::warning("Deposit Type [ID: {$type->id}] update operation returned false (no changes or issue?) by User [ID: {$userID}].");
            }

            // 5. Redirect back on success
            return Redirect::back()->with('success', 'Deposit Type updated successfully!');

        } catch (AuthorizationException $e) {
            Log::warning("Authorization failed for User [ID: {$userID}] updating Deposit Type [ID: {$type->id}]: " . $e->getMessage());
            return Redirect::back()->with('error', 'You do not have permission to edit this Deposit Type.');
        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::warning("Validation failed for User [ID: {$userID}] updating Deposit Type [ID: {$type->id}].", [
                'errors' => $e->errors(),
                'request_data' => $request->all()
            ]);
            throw $e; // Re-throw for Laravel's handler
        } catch (Exception $e) {
            Log::error("Error updating Deposit Type [ID: {$type->id}] by User [ID: {$userID}]: " . $e->getMessage(), [
                'exception' => $e,
                'request_data' => $request->all()
            ]);
            // 6. Redirect back with an error message
            return Redirect::back()->with('error', 'Failed to update Deposit Type. Please try again.');
        }
    }

    public function destroy(Request $request, User $user, DepositTypes $type): RedirectResponse
    {
        $userId = Auth::id();
        $vehicleIdentifier = $type->name ?? $type->id;
        Log::info("User [ID: {$userId}] attempting to delete Deposit type [ID: {$type->id}, Identifier: {$vehicleIdentifier}].");

        if (!$userId) { // Extra check
            Log::warning("Attempted to delete Deposit type [ID: {$type->id}] without authenticated user.");
            return redirect()->route('login')->with('error', 'You must be logged in to perform this action.');
       }

       try {
            // 1. Authorize: Ensure the authenticated user has permission to delete users.
            //    Throws AuthorizationException if fails.
            $this->authorize('type-delete'); // Assumes 'user-delete' policy or gate exists

            // 2. Optional: Prevent admin from deleting their own account via this method.
            if (Auth::id() === $user->id) {
                return back()->withErrors(['password' => 'Administrators cannot delete their own account through this interface.']);
            }

            // 3. Validate Input: Check if the password field exists.
            //    Using Validator facade for more control over the response.
            $validator = Validator::make($request->all(), [
                'password' => 'required|string', // Ensure password is required
            ]);

            // Check if validation fails
            if ($validator->fails()) {
                return back()->withErrors($validator)->withInput();
            }

            // 4. Verify Administrator Password: Check the submitted password against the logged-in admin's hash.
            $admin = Auth::user(); // Get the currently authenticated administrator user.

            // Ensure we have an authenticated admin user
            if (!$admin) {
                return back()->withErrors(['password' => 'Authentication error. Please log in again.']);
            }

            // Check the provided password against the admin's stored hashed password.
            if (!Hash::check($request->input('password'), $admin->password)) {
                return back()->withErrors(['password' => 'The provided administrator password does not match.'])->withInput();
            }

            $type->user_id = Auth::id();
            $type->is_active = false;
            $type->end_date = now();
            $type->save();
            return redirect()->back();

        } catch (AuthorizationException $e) {
            Log::warning("Authorization failed for User [ID: {$userId}] deleting Deposit type [ID: {$status->id}]: " . $e->getMessage());
            return redirect()->back()->with('error', 'You do not have permission to delete this Deposit type.');
        } catch (Exception $e) {
            // Handle potential foreign key constraints or other DB errors during delete
            Log::error("Error deleting Deposit type [ID: {$status->id}] by User [ID: {$userId}]: " . $e->getMessage(), ['exception' => $e]);
            return redirect()->back()->with('error', 'Could not delete the Deposit type due to a server error. Please try again later.');
        }
    }
}
