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
use Carbon\CarbonPeriod;
use Illuminate\Support\Collection;
use Illuminate\Database\Eloquent\Builder;
use Exception; // <-- Import base Exception
use Illuminate\Auth\Access\AuthorizationException; // <-- Import Auth Exception
use Illuminate\Validation\ValidationException; // <-- Import Validation Exception

// Model
use App\Models\User;
use App\Models\Rentals;
use App\Models\Vehicles;
use App\Models\Customers;
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
        Log::info("User [ID: {$userId}] attempting to access Vehicles index.");

        try {
            $this->authorize('vehicle-list');
            Log::info("User [ID: {$userId}] authorized for vehicle-list.");

            // --- Fetch Vehicle Classes ---
            Log::info("Fetching vehicle classes for User [ID: {$userId}].");
            $vehicleClasses = VehicleClasses::select('id', 'name')->get();
            Log::info("Retrieved {$vehicleClasses->count()} vehicle classes.");

            // --- Assign Colors & Create Map ---
            $defaultColors = ['#04a96d', '#1c3151', '#2463eb', '#ff7f0e', '#ffbb78', '#d62728', '#ff9896', '#9467bd', '#c5b0d5', '#8c564b', '#c49c94', '#e377c2', '#f7b6d2', '#7f7f7f', '#c7c7c7', '#bcbd22', '#dbdb8d', '#17becf', '#9edae5'];
            $vehicleClassesWithColors = $vehicleClasses->map(function ($class, $index) use ($defaultColors) {
                return [
                    'id' => $class->id,
                    'name' => $class->name,
                    'color' => $defaultColors[$index % count($defaultColors)],
                ];
            });
            $vehicleClassMap = $vehicleClassesWithColors->keyBy('id');
            Log::info("Assigned colors and created map for vehicle classes.");

            // --- Prepare Chart Data ---
            Log::info("Starting chart data calculation for User [ID: {$userId}].");
            $startDate = Carbon::create(2023, 1, 1)->startOfMonth();
            $endDate = Carbon::now()->startOfMonth();
            $period = CarbonPeriod::create($startDate, '1 month', $endDate);
            $chartData = [];

            foreach ($period as $date) {
                $monthStart = $date->copy()->startOfMonth();
                $monthEnd = $date->copy()->endOfMonth();
                $monthLabel = $date->format('M \'y');
                Log::debug("Calculating chart data for month: {$monthLabel}");

                $rentedvehicleIdsInMonth = Rentals::where('start_date', '<=', $monthEnd)
                    ->where(function ($query) use ($monthStart) {
                        $query->where('end_date', '>=', $monthStart)->orWhereNull('end_date');
                    })
                    ->distinct()
                    ->pluck('vehicle_id');
                Log::debug("Found {$rentedvehicleIdsInMonth->count()} distinct rented vehicles in {$monthLabel}.");

                $totalMotoCount = $this->getTotalFleetSizeForMonth($monthEnd); // Uses helper with logging
                Log::debug("Total fleet size for {$monthLabel}: {$totalMotoCount}.");

                $monthlyEntry = ['date' => $monthLabel, 'totalMoto' => $totalMotoCount];
                foreach ($vehicleClassMap as $id => $class) {
                    $monthlyEntry[(string)$id] = 0;
                }

                if ($rentedvehicleIdsInMonth->isNotEmpty()) {
                    $countsByClassId = Vehicles::whereIn('vehicles.id', $rentedvehicleIdsInMonth)
                        ->select('vehicles.vehicle_class_id', DB::raw('COUNT(vehicles.id) as count'))
                        ->groupBy('vehicles.vehicle_class_id')
                        ->pluck('count', 'vehicle_class_id');
                    Log::debug("Counts by class for {$monthLabel}: ", $countsByClassId->toArray());

                    foreach ($countsByClassId as $classId => $count) {
                        if (isset($monthlyEntry[(string)$classId])) {
                            $monthlyEntry[(string)$classId] = $count;
                        }
                    }
                }
                $chartData[] = $monthlyEntry;
            }
            Log::info("Finished chart data calculation. Generated data for " . count($chartData) . " months.");

            // --- Fetch Other Data ---
            Log::info("Fetching users, all vehicles, stock vehicles, and related data for User [ID: {$userId}].");

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
            $users = User::select('id', 'name')->get(); // Select only needed columns

            $vehicles = Vehicles::orderBy('vehicle_no', 'asc')
                              ->with(['vehicleMaker:id,name', 'vehicleModel:id,name', 'vehicleClasses:id,name', 'vehicleStatus:id,status_name', 'creator:id,name'])
                              ->get();
            Log::info("Retrieved {$vehicles->count()} total vehicles.");

            $vehicles_stock = Vehicles::orderBy('vehicle_no', 'asc')
                ->whereHas('vehicleStatus', fn ($query) => $query->where('is_rentable', 1))
                ->with(['vehicleMaker:id,name', 'vehicleModel:id,name', 'vehicleClasses:id,name', 'vehicleStatus:id,status_name,is_rentable', 'creator:id,name'])
                ->get();
            Log::info("Retrieved {$vehicles_stock->count()} stock (rentable) vehicles.");

            // Rentable counts by class
            $rentableCountsByClass = Vehicles::query()
                ->whereHas('vehicleStatus', fn (Builder $q) => $q->where('is_rentable', 1))
                ->join('vehicle_classes', 'vehicles.vehicle_class_id', '=', 'vehicle_classes.id')
                ->select('vehicle_classes.id as class_id', 'vehicle_classes.name as class_name', DB::raw('count(vehicles.id) as rentable_count'))
                ->groupBy('vehicle_classes.id', 'vehicle_classes.name')
                ->orderBy('vehicle_classes.name')
                ->get();
            $mappedCounts = $rentableCountsByClass->toArray(); // Simpler conversion
            Log::info("Calculated rentable counts for {$rentableCountsByClass->count()} classes.");

            // Rentable counts by model
            $rentableCountsByModel = Vehicles::query()
                ->whereHas('vehicleStatus', fn (Builder $q) => $q->where('is_rentable', 1))
                ->join('vehicle_actual_models', 'vehicles.vehicle_model_id', '=', 'vehicle_actual_models.id')
                ->select('vehicle_actual_models.id as model_id', 'vehicle_actual_models.name as model_name', DB::raw('count(vehicles.id) as rentable_count'))
                ->groupBy('vehicle_actual_models.id', 'vehicle_actual_models.name')
                ->orderBy('vehicle_actual_models.name')
                ->get();
            $mappedCountsByModel = $rentableCountsByModel->toArray(); // Simpler conversion
            Log::info("Calculated rentable counts for {$rentableCountsByModel->count()} models.");

            $vehicle_class = VehicleClasses::select('id', 'name')->get(); // Reuse fetched data if possible or select needed
            $vehicle_status = VehicleStatus::select('id', 'status_name', 'is_rentable')->get();
            $vehicle_models = VehicleActualModel::select('id', 'name', 'maker_id')->get();
            $vehicle_makers = VehicleMaker::with('vehiclesModel:id,name,maker_id')->select('id', 'name')->get();
            Log::info("Fetched related vehicle data (classes, statuses, models, makers).");

            $vehicleMakerData = $vehicle_makers->pluck('vehiclesModel', 'name')
                                 ->map(fn ($modelsCollection) => $modelsCollection->pluck('name')->toArray())
                                 ->toArray();

            // --- Format Data for View ---
            Log::info("Formatting vehicle data for view for User [ID: {$userId}].");
            $formattedVehicles = $vehicles->map(function (Vehicles $vehicle) {
                return [ /* ... mapping ... */
                    'id' => $vehicle->id,
                    'vehicle_no' => $vehicle->vehicle_no,
                    'make' => $vehicle->vehicleMaker?->name ?? 'N/A', // Use nullsafe
                    'model' => $vehicle->vehicleModel?->name ?? 'N/A', // Use nullsafe
                    'year' => $vehicle->year,
                    'license_plate' => $vehicle->license_plate,
                    'vin' => $vehicle->vin ?? 'N/A',
                    'color' => $vehicle->color ?? 'N/A',
                    'engine_cc' => $vehicle->engine_cc ?? 'N/A',
                    'vehicle_class_name' => $vehicle->vehicleClasses?->name ?? 'N/A', // Use nullsafe
                    'vehicle_class_id' => $vehicle->vehicle_class_id ?? 'N/A',
                    'compensation_price' => $vehicle->compensation_price ?? 'N/A',
                    'purchase_price' => $vehicle->purchase_price ?? 'N/A',
                    'purchase_date' => $vehicle->purchase_date ? Carbon::parse($vehicle->purchase_date)->toDateString() : 'N/A', // Format date
                    'daily_rental_price' => $vehicle->daily_rental_price ?? 'N/A',
                    'weekly_rental_price' => $vehicle->weekly_rental_price ?? 'N/A',
                    'monthly_rental_price' => $vehicle->monthly_rental_price ?? 'N/A',
                    'current_status_name' => $vehicle->vehicleStatus?->status_name ?? 'N/A', // Use nullsafe
                    'current_status_id' => $vehicle->current_status_id ?? 'N/A',
                    'current_location' => $vehicle->current_location ?? 'N/A',
                    'current_Rentals_id' => $vehicle->current_Rentals_id,
                    'notes' => $vehicle->notes ?? 'N/A',
                    'user_name' => $vehicle->creator?->name ?? 'Initial', // Use nullsafe
                    'created_at' => $vehicle->created_at?->toISOString(), // Use nullsafe + format
                    'updated_at' => $vehicle->updated_at?->toISOString(), // Use nullsafe + format
                ];
            });
            $formattedVehiclesStock = $vehicles_stock->map(function (Vehicles $vehicle) {
                 return [ /* ... mapping ... */
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
                    'created_at' => $vehicle->created_at?->toISOString(),
                    'updated_at' => $vehicle->updated_at?->toISOString(),
                ];
            });
            Log::info("Finished formatting data. Rendering view for User [ID: {$userId}].");
            // --- Render View ---
            return Inertia::render('vehicles/vehicles-index', [
                // Use defer for potentially large datasets
                'vehicles' => Inertia::defer(fn () => $formattedVehicles),
                'vehicles_stock' => Inertia::defer(fn () => $formattedVehiclesStock),
                'vehicles_stock_cbc' => Inertia::defer(fn () => $mappedCounts),
                'vehicles_stock_cbm' => Inertia::defer(fn () => $mappedCountsByModel),
                'users' => Inertia::defer(fn () => $users->toArray()), // Send as array
                'vehicle_class' => Inertia::defer(fn () => $vehicle_class->toArray()), // Send as array
                'vehicle_status' => Inertia::defer(fn () => $vehicle_status->toArray()), // Send as array
                'vehicle_models' => Inertia::defer(fn () => $vehicle_models->toArray()), // Send as array
                'vehicle_makers' => Inertia::defer(fn () => $vehicle_makers->toArray()), // Send as array
                'chartData' => Inertia::defer(fn () => $chartData),
                'vehicleClasses' => Inertia::defer(fn () => $vehicleClassesWithColors->toArray()), // Send as array
                'vehicleMakerData' => Inertia::defer(fn () => $vehicleMakerData), // For dropdowns etc.
                'customers' => Inertia::defer(fn () => $formattedCustomers),
            ]);

        } catch (AuthorizationException $e) {
            Log::warning("Authorization failed for User [ID: {$userId}] accessing Vehicles index: " . $e->getMessage());
            abort(403, 'Unauthorized action.');
        } catch (Exception $e) {
            Log::error("Error accessing Vehicles index for User [ID: {$userId}]: " . $e->getMessage(), ['exception' => $e]);
            // Consider returning an error view or message via Inertia
            // return Inertia::render('Error/ServerError', ['message' => 'Could not load vehicle data.'])->toResponse($request)->setStatusCode(500);
            abort(500, 'Could not load vehicle data.');
        }
    }

    // Helper function to calculate fleet size for a given month end date
    private function getTotalFleetSizeForMonth(Carbon $monthEnd): int
    {
        Log::debug("Calculating total fleet size for month ending: " . $monthEnd->toDateString());
        try {
            $count = Vehicles::where('created_at', '<=', $monthEnd)
                          ->where(function ($query) use ($monthEnd) {
                              $query->whereNull('deleted_at') // Not soft-deleted
                                    ->orWhere('deleted_at', '>', $monthEnd); // Or deleted after this month
                          })
                          ->count();
            Log::debug("Total fleet size calculated: {$count}");
            return $count;
        } catch (Exception $e) {
            Log::error("Error calculating total fleet size for month ending " . $monthEnd->toDateString() . ": " . $e->getMessage(), ['exception' => $e]);
            return 0; // Return 0 or handle error as appropriate
        }
    }

    public function store(Request $request): RedirectResponse
    {
        $userId = Auth::id();
        Log::info("User [ID: {$userId}] attempting to store a new Vehicle.");

        try {
            $this->authorize('vehicle-create');
            Log::info("User [ID: {$userId}] authorized for vehicle-create.");

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
                // Add other messages as needed
            ];

            // --- Validate the request data ---
            Log::info("Validating request data for new Vehicle by User [ID: {$userId}].", ['data' => $request->except(['_token'])]); // Avoid logging token
            $validatedData = $request->validate($rules, $messages);
            Log::info("Validation successful for new Vehicle by User [ID: {$userId}].");

            // --- Find Foreign Key IDs ---
            Log::info("Looking up foreign key IDs based on names provided by User [ID: {$userId}].");
            $vehicleClass = VehicleClasses::where('name', $validatedData['vehicle_class_id'])->firstOrFail();
            $vehicleStatus = VehicleStatus::where('status_name', $validatedData['current_status_id'])->firstOrFail();
            $vehicleMaker = VehicleMaker::where('name', $validatedData['make'])->firstOrFail();
            // Ensure model belongs to the selected maker if names aren't unique globally
            $vehicleModel = VehicleActualModel::where('name', $validatedData['model'])
                                            ->where('maker_id', $vehicleMaker->id)
                                            ->firstOrFail();
            Log::info("Successfully found foreign key IDs: Class={$vehicleClass->id}, Status={$vehicleStatus->id}, Maker={$vehicleMaker->id}, Model={$vehicleModel->id}.");


            // --- Create the Vehicle ---
            Log::info("Attempting to create Vehicle in database by User [ID: {$userId}].", ['validated_data' => $validatedData]);
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
            $vehicle->save();
            Log::info("Successfully created Vehicle [ID: {$vehicle->id}, No: {$vehicle->vehicle_no}] by User [ID: {$userId}].");

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

            $updated = $vehicle->update([ // Use mass assignment update
                'vehicle_no' => $validatedData['vehicle_no'],
                'vehicle_make_id' => $vehicleMaker->id,
                'vehicle_model_id' => $vehicleModel->id,
                'year' => $validatedData['year'],
                'license_plate' => $validatedData['license_plate'],
                'vin' => ($vinValue === 'N/A' || $vinValue === '') ? null : $vinValue,
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
                'current_location' => ($locationValue === 'N/A' || $locationValue === '') ? null : $locationValue,
                'notes' => ($notesValue === 'N/A' || $notesValue === '') ? null : $notesValue,
                // 'user_id' => $userId, // DO NOT update creator ID here. Add 'updated_by' if needed.
            ]);

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

        // 1. Authorize: Ensure the authenticated user has permission.
        // Use the existing $vehicle instance passed via route model binding.
        $this->authorize('vehicle-edit', $vehicle); // Assuming 'rental-delete' policy exists

        try {
            // --- Prepare Identifier for Messages (Fetch before validation) ---
            $customer = $vehicle->$request->customer_name; // Use the relationship if defined
            dd($customer);
            $customerIdentifier = 'N/A'; // Default identifier
            if ($customer) {
                $firstName = $customer->first_name ?? '';
                $lastName = $customer->last_name ?? '';
                $full_name = trim($firstName . ' ' . $lastName);
                // Use full name if available, otherwise fallback to Customer ID
                $customerIdentifier = !empty($full_name) ? $full_name : ('Customer ID: ' . $customer->id);
            } else {
                // Fallback if customer relationship is missing or customer deleted
                $customerIdentifier = 'Vehicle ID: ' . $vehicle->id;
            }
            // --- End Prepare Identifier ---

            // 2. Validate Input with Custom Messages
            $rules = [
                // Relational Information
                'customer_name' => ['required', 'string', Rule::exists('customers', 'fu')],
                'user_name' => ['required', 'string', Rule::exists('users', 'name')],
                'end_date' => 'required|date',
                'total_cost' => 'required|numeric|min:0',
                'notes' => 'nullable|string',
            ];

            // --- Custom Error Messages ---
            $messages = [
                // Incharger
                'user_name.required' => 'The incharge person is required.',
                'user_name.string' => 'The incharge name must be a string.',
                'user_name.exists' => 'The selected incharge person does not exist.', // Use exists message

                // Date & Pricing
                'start_date.required' => 'Start date is required.',
                'start_date.date' => 'Start date must be a valid date.',
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
                'user_name' => 'incharge person',
                'start_date' => 'start date',
                'end_date' => 'end date',
                'total_cost' => 'total cost',
            ];

            // Use validate() which automatically handles redirection on failure
            $validatedData = $request->validate($rules, $messages, $attributes);
            // --- Start Database Transaction ---

            DB::beginTransaction();

            // --- Find related models needed for updates ---
            // Find the User model instance for the incharger using the validated name
            $incharger = User::where('name', $validatedData['user_name'])->firstOrFail();
            $vehicle = Vehicles::find($vehicle->vehicle_id);

            // --- ** NEW: Replicate the Rental Record Before Modification ** ---
            $archivedRental = $vehicle->replicate(); // Create a copy of the original data
            // Modify the replicated record to mark it as an archive
            $archivedRental->status = 'Extended';
            $archivedRental->start_date = $validatedData['start_date'];
            $archivedRental->end_date = $validatedData['end_date']; // Use validated actual return date
            $archivedRental->coming_date = $validatedData['coming_date'];
            $archivedRental->notes = $validatedData['notes']; // Update notes
            $archivedRental->total_cost = $validatedData['total_cost'];
            $archivedRental->incharger_id = $incharger->id; // Track who processed the return
            $archivedRental->user_id = $userId; // Track the user performing the action
            $archivedRental->period = $validatedData['period'];
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
                if ($vehicle->current_rental_id == $vehicle->id) {
                    $vehicle->current_rental_id = $archivedRental->id; 
                    $vehicle->user_id = $userId;
                    $vehicle->save();
                } else {
                    // Log if the vehicle wasn't linked to this rental as expected, but still update status
                    Log::warning("Vehicle [ID: {$vehicle->id}] was not linked to the expected Rental [ID: {$vehicle->id}] during return process by User [ID: {$userId}]. Status updated anyway.");
                    // Decide if updating status is still desired in this edge case
                    $vehicle->current_status_id = $newStatus->id;
                    $vehicle->user_id = $userId;
                    $vehicle->save();
                }
            } else {
                // This case should ideally not happen if rental has a valid vehicle_id, but handle defensively
                Log::error("Vehicle not found for Rental [ID: {$vehicle->id}] during return process by User [ID: {$userId}]. Vehicle ID was {$vehicle->vehicle_id}.");
                // Consider throwing an exception or returning an error if vehicle is critical
                 DB::rollBack(); // Rollback as a critical linked record is missing
                 return Redirect::back()
                     ->withInput() // Keep user's input
                     ->with('error', 'Associated vehicle could not be found. Cannot process return.');
            }

            // 5. Update the *Original* Rental Record with Return Details
            $vehicle->is_latest_version = false;
            $vehicle->is_active = false;
            $vehicle->updated_at = now();

            $vehicle->save(); // Save the updates BEFORE soft deleting

            // 6. Perform Soft Deletion on the *updated original* rental record
            $vehicle->delete(); // This sets the `deleted_at` timestamp

            // 7. Commit Transaction
            DB::commit();

            // 8. Redirect on Success
            return to_route('vehicles.index') // Use the correct route name for your rentals list
                   ->with('success', "Vehicle no {$customerIdentifier} successfully extended, archived, and vehicle status updated.");

        } catch (AuthorizationException $e) {
            DB::rollBack(); // Rollback transaction on authorization failure
            Log::warning("Authorization failed for User [ID: {$userId}] extending Rental [ID: {$vehicle->id}]: " . $e->getMessage());
            // Provide a user-friendly error message
            return Redirect::back()->with('error', 'You do not have permission to extend this rental.');
        } catch (ValidationException $e) {
            // No need to rollback here, Laravel handles this before the transaction starts
            // Log the validation errors for debugging
            Log::warning("Validation failed for User [ID: {$userId}] extending Rental [ID: {$vehicle->id}].", [
                'errors' => $e->errors(),
                'request_data' => $request->except(['_token', 'password', 'password_confirmation']) // Exclude sensitive data
            ]);
            // Let Laravel handle the redirection back with errors automatically
            throw $e;
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            DB::rollBack(); // Rollback if a related model (User, Status) wasn't found during processing
            Log::error("Model not found during rental extending for User [ID: {$userId}], Rental [ID: {$vehicle->id}]: " . $e->getMessage(), [
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
            Log::critical("An unexpected error occurred during rental extending for User [ID: {$userId}], Rental [ID: {$vehicle->id}]: " . $e->getMessage(), [
                'exception' => $e,
                'request_data' => $request->except(['_token', 'password', 'password_confirmation'])
            ]);
            // Provide a generic error message to the user
            return Redirect::back()
                   ->withInput()
                   ->with('error', 'An unexpected error occurred while processing the extending. Please try again later or contact support.');
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
