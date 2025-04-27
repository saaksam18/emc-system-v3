<?php

namespace App\Http\Controllers\Internals\Vehicles;

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
use App\Models\VehicleStatus;
use App\Models\User;

class StatusController extends Controller
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
        Log::info("User [ID: {$userId}] attempting to access Vehicle Status index.");

        try {
            // Authorize before proceeding
            $this->authorize('status-list');
            Log::info("User [ID: {$userId}] authorized for contact-type-list.");

            // Fetch active Vehicle Status and eager-load creator
            $vehicleStatus = VehicleStatus::with('creator:id,name')
                                    ->orderBy('status_name', 'asc')
                                    ->get();
            Log::info("Retrieved {$vehicleStatus->count()} active Vehicle Status for User [ID: {$userId}].");

            // Map the Vehicle Status data for the frontend
            $formattedVehicleStatus = $vehicleStatus->map(function (VehicleStatus $vehicleStatus) {
                // --- Return the formatted array ---
                return [
                    'id' => $vehicleStatus->id,
                    'status_name' => $vehicleStatus->status_name ?: 'N/A',
                    'is_rentable' => $vehicleStatus->is_rentable ?: 'N/A',
                    'is_rentable_yn' => $vehicleStatus->is_rentable ? 'Yes' : 'No',
                    'description' => $vehicleStatus->description ?? 'N/A',
                    'user_name' => $vehicleStatus->creator?->name ?? 'Initial', // Use nullsafe operator consistently
                    'created_at' => $vehicleStatus->created_at?->toISOString(), // Format for JS, add nullsafe
                    'updated_at' => $vehicleStatus->updated_at?->toISOString(), // Format for JS, add nullsafe
                ];
            });

            Log::info("Successfully formatted Vehicle Status for User [ID: {$userId}]. Rendering view.");

            return Inertia::render('vehicles/settings/vehicles-setting-status', [
                'vehicleStatus' => Inertia::defer(fn () => $formattedVehicleStatus),
            ]);

        } catch (AuthorizationException $e) {
            // Log authorization failure specifically
            Log::warning("Authorization failed for User [ID: {$userId}] accessing Vehicle Status index: " . $e->getMessage());
            abort(403, 'Unauthorized action.');

        } catch (Exception $e) {
            // Catch any other unexpected errors during data fetching or processing
            Log::error("Error accessing Vehicle Status index for User [ID: {$userId}]: " . $e->getMessage(), [
                'exception' => $e
            ]);
            // Return an error view or response
            abort(500, 'Could not load Vehicle Status.'); // A common way to handle this
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
        Log::info("User [ID: {$userID}] attempting to store a new Vehicle status.");

        try {
            // Authorize action
            $this->authorize('status-create');
            Log::info("User [ID: {$userID}] authorized for status-create.");

            // 1. Define validation rules
            $rules = [
                'status_name' => 'required|string|max:255',
                'is_rentable' => 'required',
                'description' => 'nullable|string|max:1000',
            ];

            // 2. Define custom validation messages
            $messages = [
                'status_name.required' => 'Please enter a name for the Vehicle Status.',
                'status_name.string' => 'The name must be a valid string.',
                'status_name.max' => 'The name cannot be longer than :max characters.',
                'description.string' => 'The description must be a valid string.',
                'description.max' => 'The description cannot be longer than :max characters.',
            ];

            // 3. Validate the incoming request data
            Log::info("Validating request data for new Vehicle status by User [ID: {$userID}].", ['data' => $request->only(['status_name', 'description'])]);
            $validatedData = $request->validate($rules, $messages);
            Log::info("Validation successful for new Vehicle status by User [ID: {$userID}].");


            // 4. Create a new status record
            Log::info("Attempting to create Vehicle status in database by User [ID: {$userID}].", ['validated_data' => $validatedData]);
            $status = VehicleStatus::create([
                'status_name' => $validatedData['status_name'],
                'is_rentable' => $validatedData['is_rentable'],
                'description' => $validatedData['description'],
                'user_id' => $userID,
            ]);
            Log::info("Successfully created vehicle status [ID: {$status->id}] by User [ID: {$userID}].");

            // 5. Redirect back on success
            return Redirect::back()->with('success', 'Vehicle status created successfully!');

        } catch (AuthorizationException $e) {
            Log::warning("Authorization failed for User [ID: {$userID}] creating Vehicle status: " . $e->getMessage());
            return Redirect::back()->with('error', 'You do not have permission to create Vehicle Status.');
        } catch (\Illuminate\Validation\ValidationException $e) {
            // Validation exceptions are typically handled by Laravel's exception handler,
            // which redirects back with errors. Logging here can be useful for tracing.
            Log::warning("Validation failed for User [ID: {$userID}] creating Vehicle status.", [
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
     * @param  \App\Models\Contacts\Types  $class The class instance via route model binding.
     * @return \Illuminate\Http\RedirectResponse
     */
    public function update(Request $request, VehicleStatus $status): RedirectResponse
    {
        $userID = Auth::id();
        Log::info("User [ID: {$userID}] attempting to update Vehicle Status [ID: {$status->id}].");

        try {
            // Authorize action
            $this->authorize('status-edit', $status); // Pass model if policy needs it
            Log::info("User [ID: {$userID}] authorized to edit Vehicle Status [ID: {$status->id}].");

            // 1. Define validation rules for update
            $rules = [
                'status_name' => [
                    'required',
                    'string',
                    'max:255',
                ],
                'is_rentable' => 'required',
                'description' => 'nullable|string|max:1000',
            ];

            // 2. Define custom validation messages
            $messages = [
                'status_name.required' => 'Please enter a name for the Vehicle Status.',
                'status_name.string' => 'The name must be a valid string.',
                'status_name.max' => 'The name cannot be longer than :max characters.',
                'is_rentable.required' => 'Please make sure the status is rentable or not.',
                'description.string' => 'The description must be a valid string.',
                'description.max' => 'The description cannot be longer than :max characters.',
            ];

            // 3. Validate the incoming request data
            Log::info("Validating request data for updating Vehicle Status [ID: {$status->id}] by User [ID: {$userID}].", ['data' => $request->only(['name', 'description'])]);
            $validatedData = $request->validate($rules, $messages);
            Log::info("Validation successful for updating Vehicle Status [ID: {$status->id}] by User [ID: {$userID}].");

            // 4. Update the class record
            Log::info("Attempting to update Vehicle Status [ID: {$status->id}] in database by User [ID: {$userID}].", ['validated_data' => $validatedData]);
            $updated = $status->update([
                'status_name' => $validatedData['status_name'],
                'is_rentable' => $validatedData['is_rentable'],
                'description' => $validatedData['description'],
            ]);

            if ($updated) {
                Log::info("Successfully updated Vehicle Status [ID: {$status->id}] by User [ID: {$userID}].");
            } else {
                // This case is less common with Eloquent update but possible
                Log::warning("Vehicle Status [ID: {$status->id}] update operation returned false (no changes or issue?) by User [ID: {$userID}].");
            }

            // 5. Redirect back on success
            return Redirect::back()->with('success', 'Vehicle Status updated successfully!');

        } catch (AuthorizationException $e) {
            Log::warning("Authorization failed for User [ID: {$userID}] updating Vehicle Status [ID: {$status->id}]: " . $e->getMessage());
            return Redirect::back()->with('error', 'You do not have permission to edit this Vehicle Status.');
        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::warning("Validation failed for User [ID: {$userID}] updating Vehicle Status [ID: {$status->id}].", [
                'errors' => $e->errors(),
                'request_data' => $request->all()
            ]);
            throw $e; // Re-throw for Laravel's handler
        } catch (Exception $e) {
            Log::error("Error updating Vehicle Status [ID: {$status->id}] by User [ID: {$userID}]: " . $e->getMessage(), [
                'exception' => $e,
                'request_data' => $request->all()
            ]);
            // 6. Redirect back with an error message
            return Redirect::back()->with('error', 'Failed to update Vehicle Status. Please try again.');
        }
    }

    public function destroy(Request $request, User $user, VehicleStatus $status): RedirectResponse
    {
        $userId = Auth::id();
        $vehicleIdentifier = $status->name ?? $status->id;
        Log::info("User [ID: {$userId}] attempting to delete Vehicle status [ID: {$status->id}, Identifier: {$vehicleIdentifier}].");

        if (!$userId) { // Extra check
            Log::warning("Attempted to delete Vehicle [ID: {$status->id}] without authenticated user.");
            return redirect()->route('login')->with('error', 'You must be logged in to perform this action.');
       }

       try {
            // 1. Authorize: Ensure the authenticated user has permission to delete users.
            //    Throws AuthorizationException if fails.
            $this->authorize('status-delete'); // Assumes 'user-delete' policy or gate exists

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

            $status->user_id = Auth::id();
            $status->save();
            $status->delete();
            return redirect()->back();

        } catch (AuthorizationException $e) {
            Log::warning("Authorization failed for User [ID: {$userId}] deleting Vehicle Status [ID: {$status->id}]: " . $e->getMessage());
            return redirect()->back()->with('error', 'You do not have permission to delete this Vehicle Status.');
        } catch (Exception $e) {
            // Handle potential foreign key constraints or other DB errors during delete
            Log::error("Error deleting Vehicle Status [ID: {$status->id}] by User [ID: {$userId}]: " . $e->getMessage(), ['exception' => $e]);
            return redirect()->back()->with('error', 'Could not delete the Vehicle Status due to a server error. Please try again later.');
        }
    }
}
