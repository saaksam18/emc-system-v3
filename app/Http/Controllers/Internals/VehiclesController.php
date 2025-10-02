<?php

namespace App\Http\Controllers\Internals;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Redirect;
use Inertia\Response;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log; // <-- Import Log facade
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Exception; // <-- Import base Exception
use Illuminate\Auth\Access\AuthorizationException; // <-- Import Auth Exception
use Illuminate\Validation\ValidationException; // <-- Import Validation Exception
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Hash;

// Model
use App\Models\User;
use App\Models\Vehicles;
use App\Models\Customers;
use App\Models\Rentals;
use App\Models\VehicleClasses;
use App\Models\VehicleStatus;
use App\Models\VehicleActualModel;
use App\Models\VehicleMaker;

// Auth
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Foundation\Validation\ValidatesRequests;

class VehiclesController extends Controller
{
    use AuthorizesRequests, ValidatesRequests;

    public function index(): Response
    {
        $userId = Auth::id() ?? 'guest';

        try {
            $this->authorize('vehicle-list');
            Log::info("User [ID: {$userId}] authorized to view Vehicle.");

            // --- Fetch Other Data ---
            // Get all customers
            $customers = Customers::select('id', 'first_name', 'last_name')->get();

            // --- Format Customer Data for View ---
            $formattedCustomers = $customers->map(function (Customers $customer) {
                $firstName = $customer->first_name ?? '';
                $lastName = $customer->last_name ?? '';
                $full_name = trim($firstName . ' ' . $lastName);
                if (empty($full_name)) {
                    $full_name = 'N/A';
                }
                return [
                    'id' => $customer->id,
                    'name' => $customer->full_name,
                ];
            });
            $users = User::select('id', 'name')->get();

            $vehicles = Vehicles::orderBy('vehicle_no', 'asc')
                                ->with(['vehicleMaker:id,name', 'vehicleModel:id,name', 'vehicleClasses:id,name', 'vehicleStatus:id,status_name', 'creator:id,name'])
                                ->withTrashed()
                                ->get();

            $vehicles_stock = Vehicles::orderBy('vehicle_no', 'asc')
                ->whereHas('vehicleStatus', fn ($query) => $query->where('is_rentable', 1))
                ->with(['vehicleMaker:id,name', 'vehicleModel:id,name', 'vehicleClasses:id,name', 'vehicleStatus:id,status_name,is_rentable', 'creator:id,name'])
                ->get();

            // Rentable counts by class
            $rentableCountsByClass = Vehicles::query()
                ->whereHas('vehicleStatus', fn (Builder $q) => $q->where('is_rentable', 1))
                ->join('vehicle_classes', 'vehicles.vehicle_class_id', '=', 'vehicle_classes.id')
                ->select('vehicle_classes.id as class_id', 'vehicle_classes.name as class_name', DB::raw('count(vehicles.id) as rentable_count'))
                ->groupBy('vehicle_classes.id', 'vehicle_classes.name')
                ->orderBy('vehicle_classes.name')
                ->get();
            $mappedCounts = $rentableCountsByClass->toArray();

            // Rentable counts by model
            $rentableCountsByModel = Vehicles::query()
                ->whereHas('vehicleStatus', fn (Builder $q) => $q->where('is_rentable', 1))
                ->join('vehicle_actual_models', 'vehicles.vehicle_model_id', '=', 'vehicle_actual_models.id')
                ->select('vehicle_actual_models.id as model_id', 'vehicle_actual_models.name as model_name', DB::raw('count(vehicles.id) as rentable_count'))
                ->groupBy('vehicle_actual_models.id', 'vehicle_actual_models.name')
                ->orderBy('vehicle_actual_models.name')
                ->get();
            $mappedCountsByModel = $rentableCountsByModel->toArray();

            $vehicle_class = VehicleClasses::select('id', 'name')->get();
            $vehicle_status = VehicleStatus::select('id', 'status_name', 'is_rentable')->get();
            $vehicle_models = VehicleActualModel::select('id', 'name', 'maker_id')->get();
            $vehicle_makers = VehicleMaker::with('vehiclesModel:id,name,maker_id')->select('id', 'name')->get();

            $vehicleMakerData = $vehicle_makers->pluck('vehiclesModel', 'name')
                                 ->map(fn ($modelsCollection) => $modelsCollection->pluck('name')->toArray())
                                 ->toArray();

            // --- Format Vehicle Data for View ---
            $formattedVehicles = $vehicles->map(function (Vehicles $vehicle) {
                return [
                    'id' => $vehicle->id,
                    'vehicle_no' => $vehicle->vehicle_no,
                    'make' => $vehicle->vehicleMaker?->name ?? 'N/A',
                    'model' => $vehicle->vehicleModel?->name ?? 'N/A',
                    'year' => $vehicle->year,
                    'license_plate' => $vehicle->license_plate,
                    'vin' => $vehicle->vin ?? 'N/A',
                    'color' => $vehicle->color ?? 'N/A',
                    'engine_cc' => $vehicle->engine_cc ?? 'N/A',
                    'vehicle_class_name' => $vehicle->vehicleClasses?->name ?? 'N/A',
                    'vehicle_class_id' => $vehicle->vehicle_class_id ?? 'N/A',
                    'compensation_price' => $vehicle->compensation_price ?? 'N/A',
                    'purchase_price' => $vehicle->purchase_price ?? 'N/A',
                    'purchase_date' => $vehicle->purchase_date ? Carbon::parse($vehicle->purchase_date)->toDateString() : 'N/A',
                    'daily_rental_price' => $vehicle->daily_rental_price ?? 'N/A',
                    'weekly_rental_price' => $vehicle->weekly_rental_price ?? 'N/A',
                    'monthly_rental_price' => $vehicle->monthly_rental_price ?? 'N/A',
                    'current_status_name' => $vehicle->vehicleStatus?->status_name ?? 'N/A',
                    'current_status_id' => $vehicle->current_status_id ?? 'N/A',
                    'current_location' => $vehicle->current_location ?? 'N/A',
                    'current_Rentals_id' => $vehicle->current_Rentals_id,
                    'notes' => $vehicle->notes ?? 'N/A',
                    'user_name' => $vehicle->creator?->name ?? 'Initial',
                    'photo_path' => $vehicle->photo_path ? Storage::url($vehicle->photo_path) : null,
                    'created_at' => $vehicle->created_at?->toISOString(),
                    'updated_at' => $vehicle->updated_at?->toISOString(),
                ];
            });
            $formattedVehiclesStock = $vehicles_stock->map(function (Vehicles $vehicle) {
                 return [
                    'id' => $vehicle->id,
                    'vehicle_no' => $vehicle->vehicle_no,
                    'make' => $vehicle->vehicleMaker?->name ?? 'N/A',
                    'model' => $vehicle->vehicleModel?->name ?? 'N/A',
                    'year' => $vehicle->year,
                    'license_plate' => $vehicle->license_plate,
                    'vin' => $vehicle->vin ?? 'N/A',
                    'color' => $vehicle->color ?? 'N/A',
                    'engine_cc' => $vehicle->engine_cc ?? 'N/A',
                    'vehicle_class_id' => $vehicle->vehicleClasses?->name ?? 'N/A',
                    'compensation_price' => $vehicle->compensation_price ?? 'N/A',
                    'purchase_price' => $vehicle->purchase_price ?? 'N/A',
                    'purchase_date' => $vehicle->purchase_date ? Carbon::parse($vehicle->purchase_date)->toDateString() : 'N/A',
                    'daily_rental_price' => $vehicle->daily_rental_price ?? 'N/A',
                    'weekly_rental_price' => $vehicle->weekly_rental_price ?? 'N/A',
                    'monthly_rental_price' => $vehicle->monthly_rental_price ?? 'N/A',
                    'current_status_id' => $vehicle->vehicleStatus?->status_name ?? 'N/A',
                    'current_location' => $vehicle->current_location ?? 'N/A',
                    'current_Rentals_id' => $vehicle->current_Rentals_id,
                    'notes' => $vehicle->notes ?? 'N/A',
                    'user_name' => $vehicle->creator?->name ?? 'Initial',
                    'photo_path' => $vehicle->photo_path ? Storage::url($vehicle->photo_path) : null,
                    'created_at' => $vehicle->created_at?->toISOString(),
                    'updated_at' => $vehicle->updated_at?->toISOString(),
                ];
            });
            // --- Render View ---
            return Inertia::render('vehicles/vehicles-index', [
                // Use defer for potentially large datasets
                'vehicles' => Inertia::defer(fn () => $formattedVehicles),
                'vehicles_stock' => Inertia::defer(fn () => $formattedVehiclesStock),
                'vehicles_stock_cbc' => Inertia::defer(fn () => $mappedCounts),
                'vehicles_stock_cbm' => Inertia::defer(fn () => $mappedCountsByModel),
                'users' => Inertia::defer(fn () => $users->toArray()),
                'vehicle_class' => Inertia::defer(fn () => $vehicle_class->toArray()),
                'vehicle_status' => Inertia::defer(fn () => $vehicle_status->toArray()),
                'vehicle_models' => Inertia::defer(fn () => $vehicle_models->toArray()),
                'vehicle_makers' => Inertia::defer(fn () => $vehicle_makers->toArray()),
                'vehicleMakerData' => Inertia::defer(fn () => $vehicleMakerData),
                'customers' => Inertia::defer(fn () => $formattedCustomers),
            ]);

        } catch (AuthorizationException $e) {
            Log::warning("Authorization failed for User [ID: {$userId}] accessing Vehicles index: " . $e->getMessage());
            abort(403, 'Unauthorized action.');
        } catch (Exception $e) {
            Log::error("Error accessing Vehicles index for User [ID: {$userId}]: " . $e->getMessage(), ['exception' => $e]);
            abort(500, 'Could not load vehicle data.');
        }
    }

    public function store(Request $request): RedirectResponse
    {
        $userId = Auth::id();

        try {
            $this->authorize('vehicle-create');
            Log::info("User [ID: {$userId}] authorized to create Vehicle [ID: {$request->vehicle_no}].");

            // --- Define Validation Rules ---
            $rules = [
                'vehicle_no' => ['required', 'string', 'max:255', Rule::unique('vehicles', 'vehicle_no')], // Ensure unique vehicle_no
                'make' => ['required', 'string', Rule::exists('vehicle_makers', 'name')],
                'model' => ['required', 'string', Rule::exists('vehicle_actual_models', 'name')],
                'year' => 'required|integer|digits:4|min:1900|max:' . (date('Y') + 1), // Add max year
                'license_plate' => ['required', 'string', 'max:20', Rule::unique('vehicles', 'license_plate')], // Ensure unique license plate
                'vin' => ['nullable', 'string', 'max:255', Rule::unique('vehicles', 'vin')->whereNotNull('vin')], // Unique VIN if provided
                'color' => 'required|string|max:50',
                'engine_cc' => 'required|integer|min:0',
                'vehicle_class_id' => ['required', 'string', Rule::exists('vehicle_classes', 'name')], // Validate NAME exists
                'compensation_price' => 'required|numeric|min:0',
                'purchase_price' => 'required|numeric|min:0',
                'purchase_date' => 'required|date_format:Y-m-d|before_or_equal:today', // Ensure date is not in future
                'daily_rental_price' => 'required|numeric|min:0',
                'weekly_rental_price' => 'required|numeric|min:0',
                'monthly_rental_price' => 'required|numeric|min:0',
                'current_status_id' => ['required', 'string', Rule::exists('vehicle_statuses', 'status_name')], // Validate NAME exists
                'current_location' => 'nullable|string|max:255',
                'notes' => 'nullable|string',
                'photo' => ['nullable', 'image', 'mimes:png', 'max:10240'], // 10MB max
            ];

            // --- Custom Error Messages ---
            $messages = [ /* ... messages ... */
                'vehicle_no.unique' => 'This vehicle number is already registered.',
                'license_plate.unique' => 'This license plate is already registered.',
                'vin.unique' => 'This VIN is already registered.',
                'make.exists' => 'Invalid vehicle maker selected.',
                'model.exists' => 'Invalid vehicle model selected.',
                'vehicle_class_id.exists' => 'Invalid vehicle class selected.',
                'current_status_id.exists' => 'Invalid vehicle status selected.',
                'purchase_date.before_or_equal' => 'Purchase date cannot be in the future.',
                'photo.image' => 'The uploaded file must be an image.',
                'photo.mimes' => 'The photo must be a PNG file.',
                'photo.max' => 'The photo may not be greater than 10MB.',
            ];

            // --- Validate the request data ---
            $validatedData = $request->validate($rules, $messages);

            // --- Handle Photo Upload ---
            $photoPath = null;
            if ($request->hasFile('photo') && $request->file('photo')->isValid()) {
                $photoPath = $request->file('photo')->store('photos/vehicles', 'public');
            }

            // --- Find Foreign Key IDs ---
            $vehicleClass = VehicleClasses::where('name', $validatedData['vehicle_class_id'])->firstOrFail();
            $vehicleStatus = VehicleStatus::where('status_name', $validatedData['current_status_id'])->firstOrFail();
            $vehicleMaker = VehicleMaker::where('name', $validatedData['make'])->firstOrFail();
            // Ensure model belongs to the selected maker if names aren't unique globally
            $vehicleModel = VehicleActualModel::where('name', $validatedData['model'])
                                            ->where('maker_id', $vehicleMaker->id)
                                            ->firstOrFail();


            // --- Create the Vehicle ---
            $vehicle = new Vehicles();
            $vehicle->fill([ // Use fillable assignment if configured in model
                'vehicle_no' => $validatedData['vehicle_no'],
                'vehicle_make_id' => $vehicleMaker->id,
                'vehicle_model_id' => $vehicleModel->id,
                'year' => $validatedData['year'],
                'license_plate' => $validatedData['license_plate'],
                'vin' => $validatedData['vin'] ?? null,
                'color' => $validatedData['color'],
                'engine_cc' => $validatedData['engine_cc'],
                'vehicle_class_id' => $vehicleClass->id,
                'compensation_price' => $validatedData['compensation_price'],
                'purchase_price' => $validatedData['purchase_price'],
                'purchase_date' => $validatedData['purchase_date'],
                'daily_rental_price' => $validatedData['daily_rental_price'],
                'weekly_rental_price' => $validatedData['weekly_rental_price'],
                'monthly_rental_price' => $validatedData['monthly_rental_price'],
                'current_status_id' => $vehicleStatus->id,
                'current_location' => $validatedData['current_location'] ?? null,
                'notes' => $validatedData['notes'] ?? null,
                'user_id' => $userId, // Assign creator ID
            ]);

            if ($photoPath) {
                $vehicle->photo_path = $photoPath;
            }

            $vehicle->save();

            // --- Success Response ---
            $successMessage = 'Vehicle no. ' . $validatedData['vehicle_no'] . ' successfully registered.';
            return to_route('vehicles.index')->with('success', $successMessage);

        } catch (AuthorizationException $e) {
            Log::warning("Authorization failed for User [ID: {$userId}] creating Vehicle: " . $e->getMessage());
            return Redirect::back()->with('error', 'You do not have permission to create vehicles.');
        } catch (ValidationException $e) {
            Log::warning("Validation failed for User [ID: {$userId}] creating Vehicle.", [
                'errors' => $e->errors(),
                'request_data' => $request->except(['_token'])
            ]);
            throw $e; // Re-throw for Laravel's handler
        } catch (Exception $e) {
            Log::error("Error creating vehicle by User [ID: {$userId}]: " . $e->getMessage(), [
                'exception' => $e,
                'request_data' => $request->except(['_token'])
            ]);
            return Redirect::back()->with('error', 'Failed to create vehicle. Please try again.');
        }
    }

    public function update(Request $request, Vehicles $vehicle): RedirectResponse
    {
        $userId = Auth::id();
        Log::info("User [ID: {$userId}] attempting to update Vehicle [ID: {$vehicle->id}].");

        try {
            $this->authorize('vehicle-edit', $vehicle); // Pass model if policy needs it
            Log::info("User [ID: {$userId}] authorized to edit Vehicle [ID: {$vehicle->id}].");

            // --- Define Validation Rules ---
            $rules = [
                'vehicle_no' => ['required', 'string', 'max:255', Rule::unique('vehicles', 'vehicle_no')->ignore($vehicle->id)],
                'make' => ['required', 'string', Rule::exists('vehicle_makers', 'name')],
                'model' => ['required', 'string', Rule::exists('vehicle_actual_models', 'name')],
                'year' => 'required|integer|digits:4|min:1900|max:' . (date('Y') + 1),
                'license_plate' => ['required', 'string', 'max:20', Rule::unique('vehicles', 'license_plate')->ignore($vehicle->id)],
                'vin' => ['nullable', 'string', 'max:255', Rule::unique('vehicles', 'vin')->ignore($vehicle->id)->whereNotNull('vin')],
                'color' => 'required|string|max:50',
                'engine_cc' => 'required|integer|min:0',
                'vehicle_class_id' => ['required', 'string', Rule::exists('vehicle_classes', 'id')],
                'compensation_price' => 'required|numeric|min:0',
                'purchase_price' => 'required|numeric|min:0',
                'purchase_date' => 'required|date_format:Y-m-d|before_or_equal:today',
                'daily_rental_price' => 'required|numeric|min:0',
                'weekly_rental_price' => 'required|numeric|min:0',
                'monthly_rental_price' => 'required|numeric|min:0',
                'current_status_id' => ['required', 'string', Rule::exists('vehicle_statuses', 'id')],
                'current_location' => 'nullable|string|max:255',
                'notes' => 'nullable|string',
                'photo' => ['nullable', 'image', 'mimes:png', 'max:10240'], // 10MB max
            ];

            // --- Custom Error Messages ---
            $messages = [ /* ... messages ... */ ]; // Reuse or customize messages from store

            // --- Validate the request data ---
            Log::info("Validating request data for updating Vehicle [ID: {$vehicle->id}] by User [ID: {$userId}].", ['data' => $request->except(['_token'])]);
            $validatedData = $request->validate($rules, $messages);
            Log::info("Validation successful for updating Vehicle [ID: {$vehicle->id}] by User [ID: {$userId}].");

            // --- Find Foreign Key IDs ---
            Log::info("Looking up foreign key IDs for update based on names provided by User [ID: {$userId}].");
            $vehicleClass = VehicleClasses::where('id', $validatedData['vehicle_class_id'])->firstOrFail();
            $vehicleStatus = VehicleStatus::where('id', $validatedData['current_status_id'])->firstOrFail();
            $vehicleMaker = VehicleMaker::where('name', $validatedData['make'])->firstOrFail();
            $vehicleModel = VehicleActualModel::where('name', $validatedData['model'])
                                            ->where('maker_id', $vehicleMaker->id)
                                            ->firstOrFail();
            Log::info("Successfully found foreign key IDs for update: Class={$vehicleClass->id}, Status={$vehicleStatus->id}, Maker={$vehicleMaker->id}, Model={$vehicleModel->id}.");

            // --- Update the Vehicle ---
            Log::info("Attempting to update Vehicle [ID: {$vehicle->id}] in database by User [ID: {$userId}].", ['validated_data' => $validatedData]);

            // Handle 'N/A' or empty strings explicitly for nullable fields if needed
            $vinValue = $validatedData['vin'] ?? null;
            $locationValue = $validatedData['current_location'] ?? null;
            $notesValue = $validatedData['notes'] ?? null;

            $vehicle->vehicle_no = $validatedData['vehicle_no'];
            $vehicle->vehicle_make_id = $vehicleMaker->id;
            $vehicle->vehicle_model_id = $vehicleModel->id;
            $vehicle->year = $validatedData['year'];
            $vehicle->license_plate = $validatedData['license_plate'];
            $vehicle->vin = ($vinValue === 'N/A' || $vinValue === '') ? null : $vinValue;
            $vehicle->color = $validatedData['color'];
            $vehicle->engine_cc = $validatedData['engine_cc'];
            $vehicle->vehicle_class_id = $vehicleClass->id;
            $vehicle->compensation_price = $validatedData['compensation_price'];
            $vehicle->purchase_price = $validatedData['purchase_price'];
            $vehicle->purchase_date = $validatedData['purchase_date'];
            $vehicle->daily_rental_price = $validatedData['daily_rental_price'];
            $vehicle->weekly_rental_price = $validatedData['weekly_rental_price'];
            $vehicle->monthly_rental_price = $validatedData['monthly_rental_price'];
            $vehicle->current_status_id = $vehicleStatus->id;
            $vehicle->current_location = ($locationValue === 'N/A' || $locationValue === '') ? null : $locationValue;
            $vehicle->notes = ($notesValue === 'N/A' || $notesValue === '') ? null : $notesValue;

            if ($request->hasFile('photo') && $request->file('photo')->isValid()) {
                // Delete old photo if it exists
                if ($vehicle->photo_path) {
                    Storage::disk('public')->delete($vehicle->photo_path);
                }
                // Store new photo
                $path = $request->file('photo')->store('photos/vehicles', 'public');
                $vehicle->photo_path = $path;
            }

            $updated = $vehicle->save();

            if ($updated) {
                Log::info("Successfully updated Vehicle [ID: {$vehicle->id}] by User [ID: {$userId}].");
            } else {
                Log::warning("Vehicle [ID: {$vehicle->id}] update operation returned false (no changes or issue?) by User [ID: {$userId}].");
            }

            // --- Success Response ---
            $successMessage = 'Vehicle no. ' . $validatedData['vehicle_no'] . ' successfully updated.';
            return to_route('vehicles.index')->with('success', $successMessage);

        } catch (AuthorizationException $e) {
            Log::warning("Authorization failed for User [ID: {$userId}] updating Vehicle [ID: {$vehicle->id}]: " . $e->getMessage());
            return Redirect::back()->with('error', 'You do not have permission to edit this vehicle.');
        } catch (ValidationException $e) {
            Log::warning("Validation failed for User [ID: {$userId}] updating Vehicle [ID: {$vehicle->id}].", [
                'errors' => $e->errors(),
                'request_data' => $request->except(['_token'])
            ]);
            throw $e; // Re-throw for Laravel's handler
        } catch (Exception $e) {
            Log::error("Error updating vehicle [ID: {$vehicle->id}] by User [ID: {$userId}]: " . $e->getMessage(), [
                'exception' => $e,
                'request_data' => $request->except(['_token'])
            ]);
            return Redirect::back()->with('error', 'Failed to update vehicle. Please try again.');
        }
    }

    public function soldOrStolen(Request $request, Vehicles $vehicle): RedirectResponse
    {
        // Get authenticated user's ID early for logging/tracking
        $userId = Auth::id();
        $this->authorize('vehicle-edit', $vehicle);

        try {
            // 1. Prepare Identifier for Messages (Fetch before validation)
            $fullName = $request->customer_name;
            // End Prepare Identifier

            // 2. Validate Input with Custom Messages
            $rules = [
                'vehicle_id' => ['required', 'max:255', Rule::exists('vehicles', 'id')],
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
                'status_name' => [
                    'required',
                    'string',
                    // Ensure the status name exists in the types table
                    Rule::exists('vehicle_statuses', 'status_name'),
                    // Custom closure to check against the vehicle's current status
                    function ($attribute, $value, $fail) use ($request) {
                        // Find the vehicle using the vehicle_no from the request
                        $vehicle = Vehicles::where('id', $request->input('vehicle_id'))->first();

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
                'user_name' => ['required', 'string', Rule::exists('users', 'name')],
                'end_date' => 'required|date',
                'total_cost' => 'required|numeric|min:0',
                'notes' => 'nullable|string',
            ];

            // --- Custom Error Messages ---
            $messages = [
                // Customer
                'customer_name.required' => 'The customer name is required.',
                'customer_name.string' => 'The customer name must be a string.',
                // Vehicle
                'vehicle_id.required' => 'The vehicle number is required.',
                'vehicle_id.exists' => 'The selected vehicle does not exist.',
                // Status
                'status_name.required' => 'The vehicle status is required.',
                'status_name.exists' => 'The selected vehicle status is invalid.',
                // Incharger
                'user_name.required' => 'The incharge person is required.',
                'user_name.string' => 'The incharge name must be a string.',
                'user_name.exists' => 'The selected incharge person does not exist.', // Use exists message

                // Date & Pricing
                'end_date.required' => 'End date is required.',
                'end_date.date' => 'End date must be a valid date.',
                'end_date.after_or_equal' => 'End date must be on or after the start date.',
                'total_cost.required' => 'Rental cost is required.',
                'total_cost.numeric' => 'Rental cost must be a number.',
                'total_cost.min' => 'Rental cost cannot be negative.',
            ];

            // --- Define custom attributes for better error messages ---
            $attributes = [
                'vehicle_id' => 'vehicle number',
                'customer_name' => 'customer name',
                'user_name' => 'incharge person',
                'status_name' => 'vehicle status',
                'end_date' => 'end date',
                'total_cost' => 'total cost',
            ];

            // Use validate() which automatically handles redirection on failure
            $validatedData = $request->validate($rules, $messages, $attributes);

            $rental = Rentals::where('vehicle_id', $vehicle->id)
            ->where('status', '!=', 'Return')
            ->where('is_active', true)
            ->first();

            if (!$rental) {
                // --- Start Database Transaction ---
                DB::beginTransaction();

                // --- Find related models needed for updates ---
                // Find the User model instance for the incharger using the validated name
                $vehicle = Vehicles::find($vehicle->id);
                $customer = Customers::whereRaw("CONCAT(first_name, ' ', last_name) = ?", [$fullName])->firstOrFail();
                $incharger = User::where('name', $validatedData['user_name'])->firstOrFail();
                $newStatus = VehicleStatus::where('status_name', $validatedData['status_name'])->firstOrFail();

                // Create new Rentals() transaction
                $sold = new Rentals();
                $sold->fill([
                    'vehicle_id' => $vehicle->id,
                    'customer_id' => $customer->id, // Use the ID from the fetched customer model
                    'actual_start_date' => Carbon::now(),
                    'start_date' => Carbon::now(),
                    'end_date' => $validatedData['end_date'],
                    'period' => 0,
                    'total_cost' => $validatedData['total_cost'],
                    'status' => $validatedData['status_name'],
                    'notes' => $validatedData['notes'] ?? null,
                    'is_active' => true,
                    'incharger_id' => $incharger->id,
                    'user_id' => $userId,
                ]);
                $sold->save();

                // 4. Update Vehicle
                $vehicle->current_rental_id = $sold->id; 
                $vehicle->current_location = 'With customer';
                $vehicle->current_status_id = $newStatus->id;
                $vehicle->user_id = $userId;
                $vehicle->save();

                // 6. Perform Soft Deletion on the *updated original* rental record
                $vehicle->delete(); // This sets the `deleted_at` timestamp

                // 7. Commit Transaction
                DB::commit();

                // 8. Redirect on Success
                return to_route('vehicles.index') // Use the correct route name for your rentals list
                    ->with('success', "Vehicle no {$vehicle->vehicle_no} successfully marked as sold, archived, and saved new transaction.");

            } else {
                Log::error("Rental is found for vehicle [ID: {$vehicle->id}] during sold process by User [ID: {$userId}].");
                return Redirect::back()->withInput()->with('error', "The selected {$vehicle->vehicle_no} is currently unavailable. Please make sure the vehicle is available (In Stock, etc...).");
            }
            
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
            return Redirect::back()->withInput()->with('error', "Model not found during rental creation for User [ID: {$userId}]: " . $e->getMessage());
        }
    }

    public function destroy(Request $request, Vehicles $vehicle): RedirectResponse
    {
        $userId = Auth::id();
        $vehicleIdentifier = $vehicle->vehicle_no ?? $vehicle->license_plate ?? $vehicle->id;
        Log::info("User [ID: {$userId}] attempting to delete Vehicle [ID: {$vehicle->id}, Identifier: {$vehicleIdentifier}].");

        if (!$userId) { // Extra check
             Log::warning("Attempted to delete Vehicle [ID: {$vehicle->id}] without authenticated user.");
             return redirect()->route('login')->with('error', 'You must be logged in to perform this action.');
        }

        try {
            $this->authorize('vehicle-delete');
            Log::info("User [ID: {$userId}] authorized to delete Vehicle [ID: {$vehicle->id}].");

            $validator = Validator::make($request->all(), [
                'password' => 'required|string', // Ensure password is required
            ]);
        
            // Check if validation fails
            if ($validator->fails()) {
                Log::warning("Attempted to delete vehicle {$vehicle->id} without authenticated user.");
                return back()->withErrors($validator)->withInput();
            }
        
            $admin = Auth::user();
        
            // Ensure we have an authenticated admin user
            if (!$admin) {
                Log::warning("Attempted to delete vehicle {$vehicle->id} without permissions.");
                 return back()->withErrors(['password' => 'Authentication error. Please log in again.']);
            }
        
            // Check the provided password against the admin's stored hashed password.
            if (!Hash::check($request->input('password'), $admin->password)) {
                return back()->withErrors(['password' => 'The provided administrator password does not match.'])->withInput();
            }

            // Attempt to delete the vehicle record.
            Log::info("Attempting database delete for Vehicle [ID: {$vehicle->id}] by User [ID: {$userId}].");
            $deleted = $vehicle->delete(); // Use delete() for soft deletes if enabled, or permanent delete otherwise

            if ($deleted) {
                Log::info("Successfully deleted Vehicle [ID: {$vehicle->id}] by User [ID: {$userId}].");
                return to_route('vehicles.index')->with('success', "Vehicle '{$vehicleIdentifier}' successfully deleted.");
            } else {
                // This case is less common for delete but possible with model events preventing it
                Log::error("Failed to delete Vehicle [ID: {$vehicle->id}] by User [ID: {$userId}]. Delete() returned false.");
                return redirect()->back()->with('error', 'Could not delete the vehicle. An unexpected issue occurred.');
            }

        } catch (AuthorizationException $e) {
            Log::warning("Authorization failed for User [ID: {$userId}] deleting Vehicle [ID: {$vehicle->id}]: " . $e->getMessage());
            return redirect()->back()->with('error', 'You do not have permission to delete this vehicle.');
        } catch (Exception $e) {
            // Handle potential foreign key constraints or other DB errors during delete
            Log::error("Error deleting vehicle [ID: {$vehicle->id}] by User [ID: {$userId}]: " . $e->getMessage(), ['exception' => $e]);
            // Check for specific constraint violation if needed (might require checking exception code or message)
            // if (str_contains($e->getMessage(), 'constraint violation')) {
            //     return redirect()->back()->with('error', "Cannot delete vehicle '{$vehicleIdentifier}' because it has associated records (e.g., rentals).");
            // }
            return redirect()->back()->with('error', 'Could not delete the vehicle due to a server error. Please try again later.');
        }
    }
}
