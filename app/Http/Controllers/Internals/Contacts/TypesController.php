<?php

namespace App\Http\Controllers\Internals\Contacts;

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
use App\Models\Contacts; // Assuming this might be needed elsewhere, keep if used
use App\Models\Contacts\Types;
use App\Models\User;

class TypesController extends Controller
{
    use AuthorizesRequests, ValidatesRequests;

    /**
     * Display a listing of the contact types.
     *
     * @return \Inertia\Response
     */
    public function index(): Response
    {
        $userId = Auth::id() ?? 'guest'; // Get user ID or 'guest' if not logged in
        Log::info("User [ID: {$userId}] attempting to access Contact Types index.");

        try {
            // Authorize before proceeding
            $this->authorize('contact-type-list');
            Log::info("User [ID: {$userId}] authorized for contact-type-list.");

            // Fetch active contact types and eager-load creator
            $contactTypes = Types::with('creator:id,name')
                                    ->where('is_active', true)
                                    ->orderBy('name', 'asc')
                                    ->get();
            Log::info("Retrieved {$contactTypes->count()} active contact types for User [ID: {$userId}].");

            // Map the contact type data for the frontend
            $formattedContactTypes = $contactTypes->map(function (Types $contactType) {
                // --- Return the formatted array ---
                return [
                    'id' => $contactType->id,
                    'name' => $contactType->name ?: 'N/A',
                    'is_active' => $contactType->is_active ? 'Active' : 'Inactive', // Simplified ternary
                    'description' => $contactType->description ?? 'N/A',
                    'user_name' => $contactType->creator?->name ?? 'Initial', // Use nullsafe operator consistently
                    'created_at' => $contactType->created_at?->toISOString(), // Format for JS, add nullsafe
                    'updated_at' => $contactType->updated_at?->toISOString(), // Format for JS, add nullsafe
                ];
            });

            Log::info("Successfully formatted contact types for User [ID: {$userId}]. Rendering view.");

            return Inertia::render('customers/settings/settings-index', [
                'contactTypes' => $formattedContactTypes,
            ]);

        } catch (AuthorizationException $e) {
            // Log authorization failure specifically
            Log::warning("Authorization failed for User [ID: {$userId}] accessing Contact Types index: " . $e->getMessage());
            // Re-throw or handle as appropriate for your app's authorization flow
            // Depending on Inertia setup, this might automatically redirect or show an error page.
            // If not, you might need to return an error response:
            // return Inertia::render('Error/Unauthorized', ['message' => 'You are not authorized to view this page.'])->toResponse($request)->setStatusCode(403);
            abort(403, 'Unauthorized action.'); // A common way to handle this

        } catch (Exception $e) {
            // Catch any other unexpected errors during data fetching or processing
            Log::error("Error accessing Contact Types index for User [ID: {$userId}]: " . $e->getMessage(), [
                'exception' => $e
            ]);
            // Return an error view or response
            // return Inertia::render('Error/ServerError', ['message' => 'Could not load contact types.'])->toResponse($request)->setStatusCode(500);
            abort(500, 'Could not load contact types.'); // A common way to handle this
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
        Log::info("User [ID: {$userID}] attempting to store a new Contact Type.");

        try {
            // Authorize action
            $this->authorize('contact-type-create');
            Log::info("User [ID: {$userID}] authorized for contact-type-create.");

            // 1. Define validation rules
            $rules = [
                'name' => 'required|string|max:255', // Added unique rule here
                'description' => 'nullable|string|max:1000',
            ];

            // 2. Define custom validation messages
            $messages = [
                'name.required' => 'Please enter a name for the contact type.',
                'name.string' => 'The name must be a valid string.',
                'name.max' => 'The name cannot be longer than :max characters.',
                'description.string' => 'The description must be a valid string.',
                'description.max' => 'The description cannot be longer than :max characters.',
            ];

            // 3. Validate the incoming request data
            Log::info("Validating request data for new Contact Type by User [ID: {$userID}].", ['data' => $request->only(['name', 'description'])]);
            $validatedData = $request->validate($rules, $messages);
            Log::info("Validation successful for new Contact Type by User [ID: {$userID}].");


            // 4. Create a new ContactType record
            Log::info("Attempting to create Contact Type in database by User [ID: {$userID}].", ['validated_data' => $validatedData]);
            $contactType = Types::create([
                'name' => $validatedData['name'],
                'description' => $validatedData['description'],
                'start_date' => now(), // Use Carbon helper for current timestamp
                'is_active' => true,
                'user_id' => $userID, // Assign the authenticated user's ID
            ]);
            Log::info("Successfully created Contact Type [ID: {$contactType->id}] by User [ID: {$userID}].");

            // 5. Redirect back on success
            return Redirect::back()->with('success', 'Contact Type created successfully!');

        } catch (AuthorizationException $e) {
            Log::warning("Authorization failed for User [ID: {$userID}] creating Contact Type: " . $e->getMessage());
            return Redirect::back()->with('error', 'You do not have permission to create contact types.');
        } catch (\Illuminate\Validation\ValidationException $e) {
            // Validation exceptions are typically handled by Laravel's exception handler,
            // which redirects back with errors. Logging here can be useful for tracing.
            Log::warning("Validation failed for User [ID: {$userID}] creating Contact Type.", [
                'errors' => $e->errors(),
                'request_data' => $request->all() // Log submitted data on validation failure
            ]);
            // No need to redirect here, Laravel handles it.
            throw $e; // Re-throw for Laravel's handler
        } catch (Exception $e) {
            // Catch other potential exceptions during creation
            Log::error("Error creating contact type by User [ID: {$userID}]: " . $e->getMessage(), [
                'exception' => $e,
                'request_data' => $request->all() // Log submitted data on error
            ]);

            // 6. Redirect back with a generic error message
            return Redirect::back()->with('error', 'Failed to create contact type. Please try again.');
        }
    }

    /**
     * Update the specified resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \App\Models\Contacts\Types  $contactType The ContactType instance via route model binding.
     * @return \Illuminate\Http\RedirectResponse
     */
    public function update(Request $request, Types $contactType): RedirectResponse
    {
        $userID = Auth::id();
        Log::info("User [ID: {$userID}] attempting to update Contact Type [ID: {$contactType->id}].");

        try {
            // Authorize action
            $this->authorize('contact-type-edit', $contactType); // Pass model if policy needs it
            Log::info("User [ID: {$userID}] authorized to edit Contact Type [ID: {$contactType->id}].");

            // 1. Define validation rules for update
            $rules = [
                'name' => [
                    'required',
                    'string',
                    'max:255',
                    Rule::unique('types', 'name')->ignore($contactType->id), // Correct table name 'types'
                ],
                'description' => 'nullable|string|max:1000',
            ];

            // 2. Define custom validation messages
            $messages = [
                'name.required' => 'Please enter a name for the contact type.',
                'name.string' => 'The name must be a valid string.',
                'name.max' => 'The name cannot be longer than :max characters.',
                'name.unique' => 'This contact type name already exists. Please choose another.',
                'description.string' => 'The description must be a valid string.',
                'description.max' => 'The description cannot be longer than :max characters.',
            ];

            // 3. Validate the incoming request data
            Log::info("Validating request data for updating Contact Type [ID: {$contactType->id}] by User [ID: {$userID}].", ['data' => $request->only(['name', 'description'])]);
            $validatedData = $request->validate($rules, $messages);
            Log::info("Validation successful for updating Contact Type [ID: {$contactType->id}] by User [ID: {$userID}].");

            // 4. Update the ContactType record
            Log::info("Attempting to update Contact Type [ID: {$contactType->id}] in database by User [ID: {$userID}].", ['validated_data' => $validatedData]);
            $updated = $contactType->update([
                'name' => $validatedData['name'],
                'description' => $validatedData['description'],
                // NOTE: user_id is typically NOT updated here. It should reflect the creator.
                // If you want to track the *last editor*, add a separate 'updated_by' field.
                // 'user_id' => $userID, // Removed this - usually incorrect logic
            ]);

            if ($updated) {
                Log::info("Successfully updated Contact Type [ID: {$contactType->id}] by User [ID: {$userID}].");
            } else {
                // This case is less common with Eloquent update but possible
                Log::warning("Contact Type [ID: {$contactType->id}] update operation returned false (no changes or issue?) by User [ID: {$userID}].");
            }

            // 5. Redirect back on success
            return Redirect::back()->with('success', 'Contact Type updated successfully!');

        } catch (AuthorizationException $e) {
            Log::warning("Authorization failed for User [ID: {$userID}] updating Contact Type [ID: {$contactType->id}]: " . $e->getMessage());
            return Redirect::back()->with('error', 'You do not have permission to edit this contact type.');
        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::warning("Validation failed for User [ID: {$userID}] updating Contact Type [ID: {$contactType->id}].", [
                'errors' => $e->errors(),
                'request_data' => $request->all()
            ]);
            throw $e; // Re-throw for Laravel's handler
        } catch (Exception $e) {
            Log::error("Error updating contact type [ID: {$contactType->id}] by User [ID: {$userID}]: " . $e->getMessage(), [
                'exception' => $e,
                'request_data' => $request->all()
            ]);
            // 6. Redirect back with an error message
            return Redirect::back()->with('error', 'Failed to update contact type. Please try again.');
        }
    }

    /**
     * Soft delete (deactivate) the specified resource in storage.
     *
     * @param  \App\Models\Contacts\Types  $contactType The ContactType instance via route model binding.
     * @return \Illuminate\Http\RedirectResponse
     */
    public function destroy(Request $request, Types $contactType): RedirectResponse
    {
        $userId = Auth::id();
        $vehicleIdentifier = $contactType->name ?? $contactType->id;
        Log::info("User [ID: {$userId}] attempting to delete Vehicle [ID: {$contactType->id}, Identifier: {$vehicleIdentifier}].");

        if (!$userId) { // Extra check
            Log::warning("Attempted to delete contact type [ID: {$contactType->id}] without authenticated user.");
            return redirect()->route('login')->with('error', 'You must be logged in to perform this action.');
       }

       try {
            $this->authorize('contact-type-delete'); // Assumes 'user-delete' policy or gate exists

            $validator = Validator::make($request->all(), [
                'password' => 'required|string', // Ensure password is required
            ]);
        
            if ($validator->fails()) {
                Log::warning("Attempted to delete contact type {$contactType->id} without authenticated user.");
                return back()->withErrors($validator)->withInput();
            }
        
            $admin = Auth::user();
        
            if (!$admin) {
                Log::warning("Attempted to delete contact type {$contactType->id} without permissions.");
                return back()->withErrors(['password' => 'Authentication error. Please log in again.']);
            }
        
            if (!Hash::check($request->input('password'), $admin->password)) {
                return back()->withErrors(['password' => 'The provided administrator password does not match.'])->withInput();
            }
            $contactType->is_active = false;
            $contactType->end_date = now();
            $contactType->user_id = Auth::id();
            $contactType->save();
            return redirect()->back();

        } catch (AuthorizationException $e) {
            Log::warning("Authorization failed for User [ID: {$userId}] deleting contact type [ID: {$contactType->id}]: " . $e->getMessage());
            return redirect()->back()->with('error', 'You do not have permission to delete this vehicle class.');
        } catch (Exception $e) {
            Log::error("Error deleting contact type [ID: {$contactType->id}] by User [ID: {$userId}]: " . $e->getMessage(), ['exception' => $e]);
            return redirect()->back()->with('error', 'Could not delete the vehicle class due to a server error. Please try again later.');
        }
    }
}
