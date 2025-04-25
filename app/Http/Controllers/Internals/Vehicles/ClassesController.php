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
use App\Models\VehicleClasses;
use App\Models\User;

class ClassesController extends Controller
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
        Log::info("User [ID: {$userId}] attempting to access Vehicle Classs index.");

        try {
            // Authorize before proceeding
            $this->authorize('class-list');
            Log::info("User [ID: {$userId}] authorized for contact-type-list.");

            // Fetch active Vehicle Classs and eager-load creator
            $vehicleClasses = VehicleClasses::with('creator:id,name')
                                    ->orderBy('name', 'asc')
                                    ->get();
            Log::info("Retrieved {$vehicleClasses->count()} active Vehicle Classs for User [ID: {$userId}].");

            // Map the Vehicle Class data for the frontend
            $formattedVehicleClasses = $vehicleClasses->map(function (VehicleClasses $vehicleClasses) {
                // --- Return the formatted array ---
                return [
                    'id' => $vehicleClasses->id,
                    'name' => $vehicleClasses->name ?: 'N/A',
                    'description' => $vehicleClasses->description ?? 'N/A',
                    'user_name' => $vehicleClasses->creator?->name ?? 'Initial', // Use nullsafe operator consistently
                    'created_at' => $vehicleClasses->created_at?->toISOString(), // Format for JS, add nullsafe
                    'updated_at' => $vehicleClasses->updated_at?->toISOString(), // Format for JS, add nullsafe
                ];
            });

            Log::info("Successfully formatted Vehicle Classs for User [ID: {$userId}]. Rendering view.");

            return Inertia::render('vehicles/settings/vehicles-setting-classes', [
                'vehicleClasses' => Inertia::defer(fn () => $formattedVehicleClasses),
            ]);

        } catch (AuthorizationException $e) {
            // Log authorization failure specifically
            Log::warning("Authorization failed for User [ID: {$userId}] accessing Vehicle Classs index: " . $e->getMessage());
            // Re-throw or handle as appropriate for your app's authorization flow
            // Depending on Inertia setup, this might automatically redirect or show an error page.
            // If not, you might need to return an error response:
            // return Inertia::render('Error/Unauthorized', ['message' => 'You are not authorized to view this page.'])->toResponse($request)->setStatusCode(403);
            abort(403, 'Unauthorized action.'); // A common way to handle this

        } catch (Exception $e) {
            // Catch any other unexpected errors during data fetching or processing
            Log::error("Error accessing Vehicle Classs index for User [ID: {$userId}]: " . $e->getMessage(), [
                'exception' => $e
            ]);
            // Return an error view or response
            // return Inertia::render('Error/ServerError', ['message' => 'Could not load Vehicle Classs.'])->toResponse($request)->setStatusCode(500);
            abort(500, 'Could not load Vehicle Classs.'); // A common way to handle this
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
        Log::info("User [ID: {$userID}] attempting to store a new Vehicle Class.");

        try {
            // Authorize action
            $this->authorize('class-create');
            Log::info("User [ID: {$userID}] authorized for class-create.");

            // 1. Define validation rules
            $rules = [
                'name' => 'required|string|max:255',
                'description' => 'nullable|string|max:1000',
            ];

            // 2. Define custom validation messages
            $messages = [
                'name.required' => 'Please enter a name for the Vehicle Class.',
                'name.string' => 'The name must be a valid string.',
                'name.max' => 'The name cannot be longer than :max characters.',
                'description.string' => 'The description must be a valid string.',
                'description.max' => 'The description cannot be longer than :max characters.',
            ];

            // 3. Validate the incoming request data
            Log::info("Validating request data for new Vehicle Class by User [ID: {$userID}].", ['data' => $request->only(['name', 'description'])]);
            $validatedData = $request->validate($rules, $messages);
            Log::info("Validation successful for new Vehicle Class by User [ID: {$userID}].");


            // 4. Create a new class record
            Log::info("Attempting to create Vehicle Class in database by User [ID: {$userID}].", ['validated_data' => $validatedData]);
            $class = VehicleClasses::create([
                'name' => $validatedData['name'],
                'description' => $validatedData['description'],
                'user_id' => $userID, // Assign the authenticated user's ID
            ]);
            Log::info("Successfully created vehicle class [ID: {$class->id}] by User [ID: {$userID}].");

            // 5. Redirect back on success
            return Redirect::back()->with('success', 'Vehicle class created successfully!');

        } catch (AuthorizationException $e) {
            Log::warning("Authorization failed for User [ID: {$userID}] creating Vehicle Class: " . $e->getMessage());
            return Redirect::back()->with('error', 'You do not have permission to create Vehicle Classs.');
        } catch (\Illuminate\Validation\ValidationException $e) {
            // Validation exceptions are typically handled by Laravel's exception handler,
            // which redirects back with errors. Logging here can be useful for tracing.
            Log::warning("Validation failed for User [ID: {$userID}] creating Vehicle Class.", [
                'errors' => $e->errors(),
                'request_data' => $request->all() // Log submitted data on validation failure
            ]);
            // No need to redirect here, Laravel handles it.
            throw $e; // Re-throw for Laravel's handler
        } catch (Exception $e) {
            // Catch other potential exceptions during creation
            Log::error("Error creating Vehicle Class by User [ID: {$userID}]: " . $e->getMessage(), [
                'exception' => $e,
                'request_data' => $request->all() // Log submitted data on error
            ]);

            // 6. Redirect back with a generic error message
            return Redirect::back()->with('error', 'Failed to create Vehicle Class. Please try again.');
        }
    }

    /**
     * Update the specified resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \App\Models\Contacts\Types  $class The class instance via route model binding.
     * @return \Illuminate\Http\RedirectResponse
     */
    public function update(Request $request, VehicleClasses $class): RedirectResponse
    {
        $userID = Auth::id();
        Log::info("User [ID: {$userID}] attempting to update Vehicle Class [ID: {$class->id}].");

        try {
            // Authorize action
            $this->authorize('class-edit', $class); // Pass model if policy needs it
            Log::info("User [ID: {$userID}] authorized to edit Vehicle Class [ID: {$class->id}].");

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
                'name.required' => 'Please enter a name for the Vehicle Class.',
                'name.string' => 'The name must be a valid string.',
                'name.max' => 'The name cannot be longer than :max characters.',
                'description.string' => 'The description must be a valid string.',
                'description.max' => 'The description cannot be longer than :max characters.',
            ];

            // 3. Validate the incoming request data
            Log::info("Validating request data for updating Vehicle Class [ID: {$class->id}] by User [ID: {$userID}].", ['data' => $request->only(['name', 'description'])]);
            $validatedData = $request->validate($rules, $messages);
            Log::info("Validation successful for updating Vehicle Class [ID: {$class->id}] by User [ID: {$userID}].");

            // 4. Update the class record
            Log::info("Attempting to update Vehicle Class [ID: {$class->id}] in database by User [ID: {$userID}].", ['validated_data' => $validatedData]);
            $updated = $class->update([
                'name' => $validatedData['name'],
                'description' => $validatedData['description'],
            ]);

            if ($updated) {
                Log::info("Successfully updated Vehicle Class [ID: {$class->id}] by User [ID: {$userID}].");
            } else {
                // This case is less common with Eloquent update but possible
                Log::warning("Vehicle Class [ID: {$class->id}] update operation returned false (no changes or issue?) by User [ID: {$userID}].");
            }

            // 5. Redirect back on success
            return Redirect::back()->with('success', 'Vehicle class updated successfully!');

        } catch (AuthorizationException $e) {
            Log::warning("Authorization failed for User [ID: {$userID}] updating Vehicle Class [ID: {$class->id}]: " . $e->getMessage());
            return Redirect::back()->with('error', 'You do not have permission to edit this Vehicle Class.');
        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::warning("Validation failed for User [ID: {$userID}] updating Vehicle Class [ID: {$class->id}].", [
                'errors' => $e->errors(),
                'request_data' => $request->all()
            ]);
            throw $e; // Re-throw for Laravel's handler
        } catch (Exception $e) {
            Log::error("Error updating Vehicle Class [ID: {$class->id}] by User [ID: {$userID}]: " . $e->getMessage(), [
                'exception' => $e,
                'request_data' => $request->all()
            ]);
            // 6. Redirect back with an error message
            return Redirect::back()->with('error', 'Failed to update Vehicle Class. Please try again.');
        }
    }

    public function destroy(Request $request, User $user, VehicleClasses $class): RedirectResponse
    {
        $userId = Auth::id();
        $vehicleIdentifier = $class->name ?? $class->id;
        Log::info("User [ID: {$userId}] attempting to delete Vehicle [ID: {$class->id}, Identifier: {$vehicleIdentifier}].");

        if (!$userId) { // Extra check
            Log::warning("Attempted to delete Vehicle [ID: {$class->id}] without authenticated user.");
            return redirect()->route('login')->with('error', 'You must be logged in to perform this action.');
       }

       try {
            // 1. Authorize: Ensure the authenticated user has permission to delete users.
            //    Throws AuthorizationException if fails.
            $this->authorize('class-delete'); // Assumes 'user-delete' policy or gate exists

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

            $class->user_id = Auth::id();
            $class->save();
            $class->delete();
            return redirect()->back();

        } catch (AuthorizationException $e) {
            Log::warning("Authorization failed for User [ID: {$userId}] deleting Vehicle Class [ID: {$class->id}]: " . $e->getMessage());
            return redirect()->back()->with('error', 'You do not have permission to delete this vehicle class.');
        } catch (Exception $e) {
            // Handle potential foreign key constraints or other DB errors during delete
            Log::error("Error deleting vehicle class [ID: {$class->id}] by User [ID: {$userId}]: " . $e->getMessage(), ['exception' => $e]);
            // Check for specific constraint violation if needed (might require checking exception code or message)
            // if (str_contains($e->getMessage(), 'constraint violation')) {
            //     return redirect()->back()->with('error', "Cannot delete vehicle '{$vehicleIdentifier}' because it has associated records (e.g., rentals).");
            // }
            return redirect()->back()->with('error', 'Could not delete the vehicle class due to a server error. Please try again later.');
        }
    }
}
