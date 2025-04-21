<?php

namespace App\Http\Controllers\Internals;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
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
use App\Models\Motorbikes;
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

                $rentedMotorbikeIdsInMonth = Rentals::where('start_date', '<=', $monthEnd)
                    ->where(function ($query) use ($monthStart) {
                        $query->where('end_date', '>=', $monthStart)->orWhereNull('end_date');
                    })
                    ->distinct()
                    ->pluck('motorbike_id');
                Log::debug("Found {$rentedMotorbikeIdsInMonth->count()} distinct rented motorbikes in {$monthLabel}.");

                $totalMotoCount = $this->getTotalFleetSizeForMonth($monthEnd); // Uses helper with logging
                Log::debug("Total fleet size for {$monthLabel}: {$totalMotoCount}.");

                $monthlyEntry = ['date' => $monthLabel, 'totalMoto' => $totalMotoCount];
                foreach ($vehicleClassMap as $id => $class) {
                    $monthlyEntry[(string)$id] = 0;
                }

                if ($rentedMotorbikeIdsInMonth->isNotEmpty()) {
                    $countsByClassId = Motorbikes::whereIn('motorbikes.id', $rentedMotorbikeIdsInMonth)
                        ->select('motorbikes.vehicle_class_id', DB::raw('COUNT(motorbikes.id) as count'))
                        ->groupBy('motorbikes.vehicle_class_id')
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
            $users = User::select('id', 'name')->get(); // Select only needed columns

            $vehicles = Motorbikes::orderBy('vehicle_no', 'asc')
                              ->with(['vehicleMaker:id,name', 'vehicleModel:id,name', 'vehicleClasses:id,name', 'vehicleStatus:id,status_name', 'creator:id,name'])
                              ->get();
            Log::info("Retrieved {$vehicles->count()} total vehicles.");

            $vehicles_stock = Motorbikes::orderBy('vehicle_no', 'asc')
                ->whereHas('vehicleStatus', fn ($query) => $query->where('is_rentable', 1))
                ->with(['vehicleMaker:id,name', 'vehicleModel:id,name', 'vehicleClasses:id,name', 'vehicleStatus:id,status_name,is_rentable', 'creator:id,name'])
                ->get();
            Log::info("Retrieved {$vehicles_stock->count()} stock (rentable) vehicles.");

            // Rentable counts by class
            $rentableCountsByClass = Motorbikes::query()
                ->whereHas('vehicleStatus', fn (Builder $q) => $q->where('is_rentable', 1))
                ->join('vehicle_classes', 'motorbikes.vehicle_class_id', '=', 'vehicle_classes.id')
                ->select('vehicle_classes.id as class_id', 'vehicle_classes.name as class_name', DB::raw('count(motorbikes.id) as rentable_count'))
                ->groupBy('vehicle_classes.id', 'vehicle_classes.name')
                ->orderBy('vehicle_classes.name')
                ->get();
            $mappedCounts = $rentableCountsByClass->toArray(); // Simpler conversion
            Log::info("Calculated rentable counts for {$rentableCountsByClass->count()} classes.");

            // Rentable counts by model
            $rentableCountsByModel = Motorbikes::query()
                ->whereHas('vehicleStatus', fn (Builder $q) => $q->where('is_rentable', 1))
                ->join('vehicle_actual_models', 'motorbikes.vehicle_model_id', '=', 'vehicle_actual_models.id')
                ->select('vehicle_actual_models.id as model_id', 'vehicle_actual_models.name as model_name', DB::raw('count(motorbikes.id) as rentable_count'))
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
            $formattedVehicles = $vehicles->map(function (Motorbikes $vehicle) {
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
                    'vehicle_class_id' => $vehicle->vehicleClasses?->name ?? 'N/A', // Use nullsafe
                    'compensation_price' => $vehicle->compensation_price ?? 'N/A',
                    'purchase_price' => $vehicle->purchase_price ?? 'N/A',
                    'purchase_date' => $vehicle->purchase_date ? Carbon::parse($vehicle->purchase_date)->toDateString() : 'N/A', // Format date
                    'daily_rental_price' => $vehicle->daily_rental_price ?? 'N/A',
                    'weekly_rental_price' => $vehicle->weekly_rental_price ?? 'N/A',
                    'monthly_rental_price' => $vehicle->monthly_rental_price ?? 'N/A',
                    'current_status_id' => $vehicle->vehicleStatus?->status_name ?? 'N/A', // Use nullsafe
                    'current_location' => $vehicle->current_location ?? 'N/A',
                    'current_Rentals_id' => $vehicle->current_Rentals_id,
                    'notes' => $vehicle->notes ?? 'N/A',
                    'user_name' => $vehicle->creator?->name ?? 'Initial', // Use nullsafe
                    'created_at' => $vehicle->created_at?->toISOString(), // Use nullsafe + format
                    'updated_at' => $vehicle->updated_at?->toISOString(), // Use nullsafe + format
                ];
            });
            $formattedVehiclesStock = $vehicles_stock->map(function (Motorbikes $vehicle) {
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
            $count = Motorbikes::where('created_at', '<=', $monthEnd)
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
                'vehicle_no' => ['required', 'string', 'max:255', Rule::unique('motorbikes', 'vehicle_no')], // Ensure unique vehicle_no
                'make' => ['required', 'string', Rule::exists('vehicle_makers', 'name')],
                'model' => ['required', 'string', Rule::exists('vehicle_actual_models', 'name')],
                'year' => 'required|integer|digits:4|min:1900|max:' . (date('Y') + 1), // Add max year
                'license_plate' => ['required', 'string', 'max:20', Rule::unique('motorbikes', 'license_plate')], // Ensure unique license plate
                'vin' => ['nullable', 'string', 'max:255', Rule::unique('motorbikes', 'vin')->whereNotNull('vin')], // Unique VIN if provided
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
            $vehicle = new Motorbikes();
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

    public function update(Request $request, Motorbikes $vehicle): RedirectResponse
    {
        $userId = Auth::id();
        Log::info("User [ID: {$userId}] attempting to update Vehicle [ID: {$vehicle->id}].");

        try {
            $this->authorize('vehicle-edit', $vehicle); // Pass model if policy needs it
            Log::info("User [ID: {$userId}] authorized to edit Vehicle [ID: {$vehicle->id}].");

            // --- Define Validation Rules ---
            $rules = [
                'vehicle_no' => ['required', 'string', 'max:255', Rule::unique('motorbikes', 'vehicle_no')->ignore($vehicle->id)],
                'make' => ['required', 'string', Rule::exists('vehicle_makers', 'name')],
                'model' => ['required', 'string', Rule::exists('vehicle_actual_models', 'name')],
                'year' => 'required|integer|digits:4|min:1900|max:' . (date('Y') + 1),
                'license_plate' => ['required', 'string', 'max:20', Rule::unique('motorbikes', 'license_plate')->ignore($vehicle->id)],
                'vin' => ['nullable', 'string', 'max:255', Rule::unique('motorbikes', 'vin')->ignore($vehicle->id)->whereNotNull('vin')],
                'color' => 'required|string|max:50',
                'engine_cc' => 'required|integer|min:0',
                'vehicle_class_id' => ['required', 'string', Rule::exists('vehicle_classes', 'name')],
                'compensation_price' => 'required|numeric|min:0',
                'purchase_price' => 'required|numeric|min:0',
                'purchase_date' => 'required|date_format:Y-m-d|before_or_equal:today',
                'daily_rental_price' => 'required|numeric|min:0',
                'weekly_rental_price' => 'required|numeric|min:0',
                'monthly_rental_price' => 'required|numeric|min:0',
                'current_status_id' => ['required', 'string', Rule::exists('vehicle_statuses', 'status_name')],
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
            $vehicleClass = VehicleClasses::where('name', $validatedData['vehicle_class_id'])->firstOrFail();
            $vehicleStatus = VehicleStatus::where('status_name', $validatedData['current_status_id'])->firstOrFail();
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

    public function destroy(Motorbikes $vehicle): RedirectResponse
    {
        $userId = Auth::id();
        $vehicleIdentifier = $vehicle->vehicle_no ?? $vehicle->license_plate ?? $vehicle->id;
        Log::info("User [ID: {$userId}] attempting to delete Vehicle [ID: {$vehicle->id}, Identifier: {$vehicleIdentifier}].");

        if (!$userId) { // Extra check
             Log::warning("Attempted to delete Vehicle [ID: {$vehicle->id}] without authenticated user.");
             return redirect()->route('login')->with('error', 'You must be logged in to perform this action.');
        }

        try {
            $this->authorize('vehicle-delete', $vehicle);
            Log::info("User [ID: {$userId}] authorized to delete Vehicle [ID: {$vehicle->id}].");

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
