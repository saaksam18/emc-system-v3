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
use App\Models\VehicleActualModel;
use App\Models\VehicleMaker;
use App\Models\User;

class ModelsController extends Controller
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
        Log::info("User [ID: {$userId}] attempting to access Vehicle model index.");

        try {
            // Authorize before proceeding
            $this->authorize('model-list');
            Log::info("User [ID: {$userId}] authorized for model-list.");

            // Fetch active Vehicle model and eager-load creator
            $VehicleActualModels = VehicleActualModel::with('creator:id,name')
                                    ->orderBy('name', 'asc')
                                    ->get();
            Log::info("Retrieved {$VehicleActualModels->count()} active Vehicle model for User [ID: {$userId}].");

            // --- Fetch Contact Types (still needed for dropdowns/filters probably) ---
            Log::info("Fetching active contact types for User [ID: {$userId}].");
            $vehicleMakers = VehicleMaker::with('creator:id,name')
                ->orderBy('name', 'asc')
                ->get();
            Log::info("Retrieved {$vehicleMakers->count()} active contact types.");

            // --- Format Data for View ---
            Log::info("Formatting customer and contact type data for view for User [ID: {$userId}].");
            $formattedVehicleMakers = $vehicleMakers->map(function (VehicleMaker $vehicleMaker) { // Changed variable name for clarity
                return [
                    'id' => $vehicleMaker->id,
                    'name' => $vehicleMaker->name,
                ];
            });

            // Map the Vehicle model data for the frontend
            $formattedVehicleActualModels = $VehicleActualModels->map(function (VehicleActualModel $VehicleActualModels) {
                // --- Return the formatted array ---
                return [
                    'id' => $VehicleActualModels->id,
                    'name' => $VehicleActualModels->name ?: 'N/A',
                    'maker_id' => $VehicleActualModels->maker_id ?: 'N/A',
                    'maker' => $VehicleActualModels->vehiclesMaker->name ?: 'N/A',
                    'user_name' => $VehicleActualModels->creator?->name ?? 'Initial',
                    'created_at' => $VehicleActualModels->created_at?->toISOString(),
                    'updated_at' => $VehicleActualModels->updated_at?->toISOString(),
                ];
            });

            Log::info("Successfully formatted Vehicle model for User [ID: {$userId}]. Rendering view.");

            return Inertia::render('vehicles/settings/vehicles-setting-models', [
                'VehicleActualModels' => Inertia::defer(fn () => $formattedVehicleActualModels),
                'vehicleMakers' => Inertia::defer(fn () => $formattedVehicleMakers),
            ]);

        } catch (AuthorizationException $e) {
            // Log authorization failure specifically
            Log::warning("Authorization failed for User [ID: {$userId}] accessing Vehicle model index: " . $e->getMessage());
            abort(403, 'Unauthorized action.');

        } catch (Exception $e) {
            // Catch any other unexpected errors during data fetching or processing
            Log::error("Error accessing Vehicle model index for User [ID: {$userId}]: " . $e->getMessage(), [
                'exception' => $e
            ]);
            // Return an error view or response
            abort(500, 'Could not load Vehicle model.'); // A common way to handle this
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
        Log::info("User [ID: {$userID}] attempting to store a new Vehicle model.");

        try {
            // Authorize action
            $this->authorize('model-create');
            Log::info("User [ID: {$userID}] authorized for model-create.");

            // 1. Define validation rules
            $rules = [
                'name' => 'required|string|max:255',
                'maker_id' => ['required', 'string', Rule::exists('vehicle_makers', 'id')],
            ];

            // 2. Define custom validation messages
            $messages = [
                'name.required' => 'Please enter a name for the Vehicle model.',
                'name.string' => 'The name must be a valid string.',
                'name.max' => 'The name cannot be longer than :max characters.',
                'maker_id.exists' => 'Invalid vehicle maker selected.',
            ];

            // 3. Validate the incoming request data
            Log::info("Validating request data for new Vehicle model by User [ID: {$userID}].", ['data' => $request->only(['name'])]);
            $validatedData = $request->validate($rules, $messages);
            Log::info("Validation successful for new Vehicle model by User [ID: {$userID}].");


            // 4. Create a new model record
            Log::info("Attempting to create Vehicle model in database by User [ID: {$userID}].", ['validated_data' => $validatedData]);
            $model = VehicleActualModel::create([
                'name' => $validatedData['name'],
                'maker_id' => $validatedData['maker_id'],
                'user_id' => $userID,
            ]);
            Log::info("Successfully created Vehicle model [ID: {$model->id}] by User [ID: {$userID}].");

            // 5. Redirect back on success
            return Redirect::back()->with('success', 'Vehicle model created successfully!');

        } catch (AuthorizationException $e) {
            Log::warning("Authorization failed for User [ID: {$userID}] creating Vehicle model: " . $e->getMessage());
            return Redirect::back()->with('error', 'You do not have permission to create Vehicle model.');
        } catch (\Illuminate\Validation\ValidationException $e) {
            // Validation exceptions are typically handled by Laravel's exception handler,
            // which redirects back with errors. Logging here can be useful for tracing.
            Log::warning("Validation failed for User [ID: {$userID}] creating Vehicle model.", [
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
    public function update(Request $request, VehicleActualModel $model): RedirectResponse
    {
        $userID = Auth::id();
        Log::info("User [ID: {$userID}] attempting to update Vehicle model [ID: {$model->id}].");

        try {
            // Authorize action
            $this->authorize('model-edit', $model); // Pass model if policy needs it
            Log::info("User [ID: {$userID}] authorized to edit Vehicle model [ID: {$model->id}].");

            // 1. Define validation rules for update
            $rules = [
                'name' => [
                    'required',
                    'string',
                    'max:255',
                ],
                'maker_id' => ['required', 'string', Rule::exists('vehicle_makers', 'id')],
            ];

            // 2. Define custom validation messages
            $messages = [
                'name.required' => 'Please enter a name for the Vehicle model.',
                'name.string' => 'The name must be a valid string.',
                'name.max' => 'The name cannot be longer than :max characters.',
                'maker_id.exists' => 'Invalid vehicle maker selected.',
            ];

            // 3. Validate the incoming request data
            Log::info("Validating request data for updating Vehicle model [ID: {$model->id}] by User [ID: {$userID}].", ['data' => $request->only(['name'])]);
            $validatedData = $request->validate($rules, $messages);
            Log::info("Validation successful for updating Vehicle model [ID: {$model->id}] by User [ID: {$userID}].");

            // 4. Update the class record
            Log::info("Attempting to update Vehicle model [ID: {$model->id}] in database by User [ID: {$userID}].", ['validated_data' => $validatedData]);
            $updated = $model->update([
                'name' => $validatedData['name'],
                'maker_id' => $validatedData['maker_id'],
                'user_id' => $userID,
            ]);

            if ($updated) {
                Log::info("Successfully updated Vehicle model [ID: {$model->id}] by User [ID: {$userID}].");
            } else {
                // This case is less common with Eloquent update but possible
                Log::warning("Vehicle model [ID: {$model->id}] update operation returned false (no changes or issue?) by User [ID: {$userID}].");
            }

            // 5. Redirect back on success
            return Redirect::back()->with('success', 'Vehicle model updated successfully!');

        } catch (AuthorizationException $e) {
            Log::warning("Authorization failed for User [ID: {$userID}] updating Vehicle model [ID: {$model->id}]: " . $e->getMessage());
            return Redirect::back()->with('error', 'You do not have permission to edit this Vehicle model.');
        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::warning("Validation failed for User [ID: {$userID}] updating Vehicle model [ID: {$model->id}].", [
                'errors' => $e->errors(),
                'request_data' => $request->all()
            ]);
            throw $e; // Re-throw for Laravel's handler
        } catch (Exception $e) {
            Log::error("Error updating Vehicle model [ID: {$model->id}] by User [ID: {$userID}]: " . $e->getMessage(), [
                'exception' => $e,
                'request_data' => $request->all()
            ]);
            // 6. Redirect back with an error message
            return Redirect::back()->with('error', 'Failed to update Vehicle model. Please try again.');
        }
    }

    public function destroy(Request $request, User $user, VehicleActualModel $model): RedirectResponse
    {
        $userId = Auth::id();
        $vehicleIdentifier = $model->name ?? $model->id;
        Log::info("User [ID: {$userId}] attempting to delete Vehicle model [ID: {$model->id}, Identifier: {$vehicleIdentifier}].");

        if (!$userId) { // Extra check
            Log::warning("Attempted to delete Vehicle model [ID: {$model->id}] without authenticated user.");
            return redirect()->route('login')->with('error', 'You must be logged in to perform this action.');
       }

       try {
            // 1. Authorize: Ensure the authenticated user has permission to delete users.
            //    Throws AuthorizationException if fails.
            $this->authorize('model-delete'); // Assumes 'user-delete' policy or gate exists

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

            $model->user_id = Auth::id();
            $model->save();
            $model->delete();
            return redirect()->back();

        } catch (AuthorizationException $e) {
            Log::warning("Authorization failed for User [ID: {$userId}] deleting Vehicle model [ID: {$model->id}]: " . $e->getMessage());
            return redirect()->back()->with('error', 'You do not have permission to delete this Vehicle model.');
        } catch (Exception $e) {
            // Handle potential foreign key constraints or other DB errors during delete
            Log::error("Error deleting Vehicle model [ID: {$model->id}] by User [ID: {$userId}]: " . $e->getMessage(), ['exception' => $e]);
            return redirect()->back()->with('error', 'Could not delete the Vehicle model due to a server error. Please try again later.');
        }
    }
}
