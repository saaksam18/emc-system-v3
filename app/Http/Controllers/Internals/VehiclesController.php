<?php

namespace App\Http\Controllers\Internals;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Inertia\Response;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Support\Collection;

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
        $this->authorize('vehicle-list');

        $vehicleClasses = VehicleClasses::select('id', 'name')
                                      // ->where('is_active', true) // Optional filter
                                      ->get();

        // Assign colors (Example using a predefined palette - adjust as needed)
        $defaultColors = ['#04a96d', '#1c3151', '#2463eb', '#ff7f0e', '#ffbb78', '#d62728', '#ff9896', '#9467bd', '#c5b0d5', '#8c564b', '#c49c94', '#e377c2', '#f7b6d2', '#7f7f7f', '#c7c7c7', '#bcbd22', '#dbdb8d', '#17becf', '#9edae5'];
        $vehicleClassesWithColors = $vehicleClasses->map(function ($class, $index) use ($defaultColors) {
            return [
                'id' => $class->id,
                'name' => $class->name,
                'color' => $defaultColors[$index % count($defaultColors)],
            ];
        });
        $vehicleClassMap = $vehicleClassesWithColors->keyBy('id'); // For easy lookup later

        
        // --- Define Date Range ---
        $startDate = Carbon::create(2023, 1, 1)->startOfMonth();
        $endDate = Carbon::now()->startOfMonth();
        $period = CarbonPeriod::create($startDate, '1 month', $endDate);

        $chartData = [];

        // --- Query for each month ---
        foreach ($period as $date) {
            $monthStart = $date->copy()->startOfMonth();
            $monthEnd = $date->copy()->endOfMonth();
            $monthLabel = $date->format('M \'y');

            // Find distinct motorbike IDs rented in this month
            $rentedMotorbikeIdsInMonth = Rentals::where('start_date', '<=', $monthEnd)
                ->where(function ($query) use ($monthStart) {
                    $query->where('end_date', '>=', $monthStart)
                          ->orWhereNull('end_date');
                })
                ->distinct()
                ->pluck('motorbike_id');

             // Calculate Total Fleet Size for the month
            $totalMotoCount = $this->getTotalFleetSizeForMonth($monthEnd);

            // Initialize monthly data with date and total
            $monthlyEntry = [
                'date' => $monthLabel,
                'totalMoto' => $totalMotoCount,
            ];
            // Initialize counts for all classes to 0
            foreach ($vehicleClassMap as $id => $class) {
                 // Use class ID as the key for counts
                $monthlyEntry[(string)$id] = 0;
            }


            // If rentals exist, get counts by class
            if ($rentedMotorbikeIdsInMonth->isNotEmpty()) {
                $countsByClassId = Motorbikes::whereIn('motorbikes.id', $rentedMotorbikeIdsInMonth)
                    // No need to join vehicle_classes here if we group by ID
                    ->select(
                        'motorbikes.vehicle_class_id', // Select the class ID
                        DB::raw('COUNT(motorbikes.id) as count')
                    )
                    ->groupBy('motorbikes.vehicle_class_id')
                    ->pluck('count', 'vehicle_class_id'); // Result: [class_id => count]

                 // Update the counts in the monthly entry
                foreach ($countsByClassId as $classId => $count) {
                    if (isset($monthlyEntry[(string)$classId])) { // Check if it's a class we're tracking
                         $monthlyEntry[(string)$classId] = $count;
                    }
                }
            }

            $chartData[] = $monthlyEntry;
        }


        $users = User::all();
        $vehicles = Motorbikes::orderBy('vehicle_no', 'asc') // Order by vehicle_no ascending
                          ->with([
                              'vehicleMaker',
                              'vehicleModel',
                              'vehicleClasses',
                              'vehicleStatus',
                              'creator'
                          ])
                          ->get();
        $vehicle_class = VehicleClasses::all();
        $vehicle_status = VehicleStatus::all();
        $vehicle_models = VehicleActualModel::all();
        $vehicle_makers = VehicleMaker::with('vehiclesModel')->get();

        $vehicleMakerData = $vehicle_makers->pluck('vehiclesModel', 'name') // Group models by make name
                             ->map(function ($modelsCollection) {
                                 // For each make, pluck just the names of its models
                                 return $modelsCollection->pluck('name')->toArray();
                             })
                             ->toArray(); // Convert the final collection to an array

        // Map the collection to the desired format for the view
        $formattedVehicles = $vehicles->map(function (Motorbikes $vehicle) { // Map the retrieved collection
            return [
                'id' => $vehicle->id,
                'vehicle_no' => $vehicle->vehicle_no,
                'make' => $vehicle->vehicleMaker->name ?? 'N/A',
                'model' => $vehicle->vehicleModel->name ?? 'N/A',
                'year' => $vehicle->year,
                'license_plate' => $vehicle->license_plate,
                'vin' => $vehicle->vin  ?? 'N/A',
                'color' => $vehicle->color ?? 'N/A',
                'engine_cc' => $vehicle->engine_cc ?? 'N/A',
                'vehicle_class_id' => $vehicle->vehicleClasses->name ?? 'N/A',
                'compensation_price' => $vehicle->compensation_price ?? 'N/A',
                'purchase_price' => $vehicle->purchase_price ?? 'N/A',
                'daily_rental_price' => $vehicle->daily_rental_price ?? 'N/A',
                'weekly_rental_price' => $vehicle->weekly_rental_price ?? 'N/A',
                'monthly_rental_price' => $vehicle->monthly_rental_price ?? 'N/A',
                'current_status_id' => $vehicle->vehicleStatus->status_name ?? 'N/A',
                'current_location' => $vehicle->current_location ?? 'N/A',
                'current_Rentals_id' => $vehicle->current_Rentals_id,
                'notes' => $vehicle->notes ?? 'N/A',
                'user_name' => $vehicle->creator?->name ?? 'Initial',
                'created_at' => $vehicle->created_at,
                'updated_at' => $vehicle->updated_at,
            ];
        });

        return Inertia::render('vehicles/vehicles-index', [
            'vehicles' => Inertia::defer(fn () => $formattedVehicles),
            'users' => Inertia::defer(fn () => $users),
            'vehicle_class' => Inertia::defer(fn () => $vehicle_class),
            'vehicle_status' => Inertia::defer(fn () => $vehicle_status),
            'vehicle_models' => Inertia::defer(fn () => $vehicle_models),
            'vehicle_makers' => Inertia::defer(fn () => $vehicle_makers),
            'chartData' => Inertia::defer(fn () => $chartData),
            'vehicleClasses' => Inertia::defer(fn () => $vehicleClassesWithColors->toArray()),
        ]);
    }
    // Helper function (same as before)
    private function getTotalFleetSizeForMonth(Carbon $monthEnd): int
    {
        return Motorbikes::where('created_at', '<=', $monthEnd)
                      ->where(function ($query) use ($monthEnd) {
                          $query->whereNull('deleted_at')
                                ->orWhere('deleted_at', '>', $monthEnd);
                      })
                      ->count();
    }

    public function store(Request $request)
    {
        $this->authorize('vehicle-create');
        // Define the validation rules based on the Vehicle interface
        $rules = [
            'vehicle_no' => [
                'required',
                'string',
                'max:255',
            ],
            'make' => [
                'required',
                'string',
                 // Ensure the submitted name exists in the 'name' column of 'vehicle_classes' table
                Rule::exists('vehicle_makers', 'name')
            ],
            'model' => [
                'required',
                'string',
                 // Ensure the submitted name exists in the 'name' column of 'vehicle_classes' table
                Rule::exists('vehicle_actual_models', 'name')
            ],
            'year' => 'required|integer|digits:4|min:1900', // Better validation for year
            'license_plate' => 'required|string|max:20',
            'vin' => 'nullable|string|max:255', // Frontend doesn't require it, make nullable
            'color' => 'required|string|max:50',  // Frontend doesn't require it, make nullable
            'engine_cc' => 'required|integer|min:0', // Integer, nullable as not required in frontend
            // --- Rule for Vehicle Class (Assuming frontend sends NAME) ---
            'vehicle_class' => [
                'required',
                'string',
                 // Ensure the submitted name exists in the 'name' column of 'vehicle_classes' table
                Rule::exists('vehicle_classes', 'name')
            ],
            'compensation_price' => 'required|numeric|min:0', // Use numeric, nullable
            'purchase_price' => 'required|numeric|min:0',    // Use numeric, nullable
            'daily_rental_price' => 'required|numeric|min:0',  // Use numeric
            'weekly_rental_price' => 'required|numeric|min:0', // Use numeric
            'monthly_rental_price' => 'required|numeric|min:0',// Use numeric
            // --- Rule for Status (Assuming frontend sends NAME - data.current_status_id holds the name) ---
            'current_status_id' => [ // The key matches the frontend: data.current_status_id
                'required',
                'string',
                 // Ensure the submitted status_name exists in the 'status_name' column of 'vehicle_statuses' table
                 // Adjust 'status_name' if your column name is different
                Rule::exists('vehicle_statuses', 'status_name')
            ],
            'current_location' => 'nullable|string|max:255', // Nullable as not required in frontend
            'notes' => 'nullable|string',
        ];

        // Custom error messages
        $messages = [
            'vehicle_no.required' => 'The vehicle number is required.',
            'make.required' => 'Please select a vehicle maker.',
            'make.exists' => 'Invalid vehicle maker selected.',
            'model.required' => 'Please select a vehicle model.',
            'model.exists' => 'Invalid vehicle model selected.',
            'year.*' => 'Please enter a valid 4-digit year (e.g., 2023).',
            'color.required' => 'Please enter vehicle color.',
            'license_plate.required' => 'The license plate is required.',
            'vehicle_class.required' => 'Please select a vehicle class.',
            'vehicle_class.exists' => 'Invalid vehicle class selected.', // Error for exists rule
            '*.numeric' => 'The :attribute must be a valid number.',
            '*.integer' => 'The :attribute must be a whole number.',
            '*.min' => 'The :attribute must be zero or greater.',
            'daily_rental_price.required' => 'The daily rental price is required.',
            'weekly_rental_price.required' => 'The weekly rental price is required.',
            'monthly_rental_price.required' => 'The monthly rental price is required.',
            'current_status_id.required' => 'Please select the current status.',
            'current_status_id.exists' => 'Invalid vehicle status selected.', // Error for exists rule
        ];

        // Validate the request data
        $validatedData = $request->validate($rules, $messages);

        // --- Find Foreign Key IDs ---
        // Your frontend sends names for class and status, but your DB likely stores IDs.
        // Find the corresponding records based on the validated names.
        // Using firstOrFail will automatically throw an error if not found (which is good).
        $vehicleClass = VehicleClasses::where('name', $validatedData['vehicle_class'])->firstOrFail();

        // Adjust 'status_name' if the column in your vehicle_statuses table is different
        $vehicleStatus = VehicleStatus::where('status_name', $validatedData['current_status_id'])->firstOrFail();
        $vehicleModels = VehicleActualModel::where('name', $validatedData['model'])->firstOrFail();
        $vehicleMakers = VehicleMaker::where('name', $validatedData['make'])->firstOrFail();

        // --- If validation passes, create the Vehicle ---
        $vehicle = new Motorbikes(); // Or your Vehicle model name
        $vehicle->vehicle_no = $validatedData['vehicle_no'];
        $vehicle->vehicle_make_id = $vehicleMakers->id;
        $vehicle->vehicle_model_id = $vehicleModels->id;
        $vehicle->year = $validatedData['year'];
        $vehicle->license_plate = $validatedData['license_plate'];
        $vehicle->vin = $validatedData['vin'] ?? null; // Use validated data, default to null if not present
        $vehicle->color = $validatedData['color'] ?? null;
        $vehicle->engine_cc = $validatedData['engine_cc'] ?? null;
        // *** IMPORTANT: Assign the ID, not the name ***
        // Ensure your 'motorbikes' table has columns like 'vehicle_class_id' and 'current_status_id' (or similar)
        $vehicle->vehicle_class_id = $vehicleClass->id; // Assign the foreign key ID
        $vehicle->compensation_price = $validatedData['compensation_price'] ?? null;
        $vehicle->purchase_price = $validatedData['purchase_price'] ?? null;
        $vehicle->daily_rental_price = $validatedData['daily_rental_price'];
        $vehicle->weekly_rental_price = $validatedData['weekly_rental_price'];
        $vehicle->monthly_rental_price = $validatedData['monthly_rental_price'];
        // *** IMPORTANT: Assign the ID, not the name ***
        $vehicle->current_status_id = $vehicleStatus->id; // Assign the foreign key ID
        $vehicle->current_location = $validatedData['current_location'] ?? null;
        $vehicle->notes = $validatedData['notes'] ?? null;
        $vehicle->user_id = Auth::id(); // Example if assigning logged-in user

        $vehicle->save();

        // --- Success Response ---
        // This redirect works correctly with Inertia AFTER a successful POST/PUT/DELETE
        $successMessage = 'Vehicle ' . $validatedData['vehicle_no'] . ' successfully registered.';
        return to_route('vehicles.index')->with('success', $successMessage);
    }

    public function update(Request $request, Motorbikes $vehicle): RedirectResponse
    {
        // Authorize the update action (ensure you have a 'vehicle-update' or 'vehicle-edit' policy/gate)
        $this->authorize('vehicle-edit'); // Or 'vehicle-edit' based on your policy

        // Define the validation rules for UPDATE
        $rules = [
            'vehicle_no' => [
                'required',
                'integer',
                'max:255',
            ],
            'make' => [
                'required',
                'string',
                Rule::exists('vehicle_makers', 'name')
            ],
            'model' => [
                'required',
                'string',
                Rule::exists('vehicle_actual_models', 'name')
            ],
            'year' => 'required|integer|digits:4|min:1900',
            'license_plate' => [
                'required',
                'string',
                'max:20',
                Rule::unique('motorbikes', 'license_plate')->ignore($vehicle->id),
            ],
            'vin' => [
                'nullable', // Allows empty input
                'string',
                'max:255',
            ],
            'color' => 'required|string|max:50',
            'engine_cc' => 'required|integer|min:0',
            'vehicle_class' => [
                'required',
                'string',
                Rule::exists('vehicle_classes', 'name')
            ],
            'compensation_price' => 'required|numeric|min:0',
            'purchase_price' => 'required|numeric|min:0',
            'daily_rental_price' => 'required|numeric|min:0',
            'weekly_rental_price' => 'required|numeric|min:0',
            'monthly_rental_price' => 'required|numeric|min:0',
            'current_status_id' => [
                'required',
                'string',
                Rule::exists('vehicle_statuses', 'status_name') // Adjust 'status_name' if your column is different
            ],
            'current_location' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
        ];

        // Custom error messages
        $messages = [
            'vehicle_no.required' => 'The vehicle number is required.',
            'vehicle_no.unique' => 'This vehicle number is already registered.',
            'make.required' => 'Please select a vehicle maker.',
            'make.exists' => 'Invalid vehicle maker selected.',
            'model.required' => 'Please select a vehicle model.',
            'model.exists' => 'Invalid vehicle model selected.',
            'year.*' => 'Please enter a valid 4-digit year (e.g., 2023).',
            'color.required' => 'Please enter vehicle color.',
            'license_plate.required' => 'The license plate is required.',
            'license_plate.unique' => 'This license plate is already registered.',
            'vin.unique' => 'This VIN is already registered to another vehicle.', // Message for unique VIN rule
            'vehicle_class.required' => 'Please select a vehicle class.',
            'vehicle_class.exists' => 'Invalid vehicle class selected.',
            '*.numeric' => 'The :attribute must be a valid number.',
            '*.integer' => 'The :attribute must be a whole number.',
            '*.min' => 'The :attribute must be zero or greater.',
            'daily_rental_price.required' => 'The daily rental price is required.',
            'weekly_rental_price.required' => 'The weekly rental price is required.',
            'monthly_rental_price.required' => 'The monthly rental price is required.',
            'current_status_id.required' => 'Please select the current status.',
            'current_status_id.exists' => 'Invalid vehicle status selected.',
        ];

        // Validate the request data
        $validatedData = $request->validate($rules, $messages);

        // --- Find Foreign Key IDs ---
        $vehicleClass = VehicleClasses::where('name', $validatedData['vehicle_class'])->firstOrFail();
        $vehicleStatus = VehicleStatus::where('status_name', $validatedData['current_status_id'])->firstOrFail(); // Adjust 'status_name' if needed
        $vehicleModels = VehicleActualModel::where('name', $validatedData['model'])->firstOrFail();
        $vehicleMakers = VehicleMaker::where('name', $validatedData['make'])->firstOrFail();

        // --- Update the Vehicle ---
        $vehicle->vehicle_no = $validatedData['vehicle_no'];
        $vehicle->vehicle_make_id = $vehicleMakers->id;
        $vehicle->vehicle_model_id = $vehicleModels->id;
        $vehicle->year = $validatedData['year'];
        $vehicle->license_plate = $validatedData['license_plate'];

        // ** FIX: Convert 'N/A' or empty string for VIN to null **
        $vinValue = $validatedData['vin'] ?? null;
        $vehicle->vin = ($vinValue === 'N/A' || $vinValue === '') ? null : $vinValue;

        $vehicle->color = $validatedData['color'] ?? null; // Already handles null if not required/provided correctly
        $vehicle->engine_cc = $validatedData['engine_cc'] ?? null; // Already handles null if not required/provided correctly
        $vehicle->vehicle_class_id = $vehicleClass->id;
        $vehicle->compensation_price = $validatedData['compensation_price'] ?? null;
        $vehicle->purchase_price = $validatedData['purchase_price'] ?? null;
        $vehicle->daily_rental_price = $validatedData['daily_rental_price'];
        $vehicle->weekly_rental_price = $validatedData['weekly_rental_price'];
        $vehicle->monthly_rental_price = $validatedData['monthly_rental_price'];
        $vehicle->current_status_id = $vehicleStatus->id;

         // ** FIX: Convert 'N/A' or empty string for current_location to null **
        $locationValue = $validatedData['current_location'] ?? null;
        $vehicle->current_location = ($locationValue === 'N/A' || $locationValue === '') ? null : $locationValue;

         // ** FIX: Convert 'N/A' or empty string for notes to null **
        $notesValue = $validatedData['notes'] ?? null;
        $vehicle->notes = ($notesValue === 'N/A' || $notesValue === '') ? null : $notesValue;

        // Assign the logged-in user's ID (ensure Auth facade is imported)
        $vehicle->user_id = Auth::id();

        // Save the changes to the existing record
        $vehicle->save();

        // --- Success Response ---
        $successMessage = 'Vehicle ' . $validatedData['vehicle_no'] . ' successfully updated.';
        return to_route('vehicles.index')->with('success', $successMessage);
    }

    public function destroy(Motorbikes $vehicle): RedirectResponse
    {
        // 1. Authorize: Ensure the authenticated user has permission to delete this vehicle.
        //    Throws AuthorizationException if fails.
        //    Ensure you have a 'vehicle-delete' policy or gate.
        //    Pass the $vehicle instance if the policy needs to check ownership, etc.
        $this->authorize('vehicle-delete');

        // Store identifier for success message before potential deletion error
        $vehicleIdentifier = $vehicle->vehicle_no ?? $vehicle->license_plate ?? $vehicle->id;

        // 2. Delete User: Attempt to delete the vehicle record.
        try {
            $vehicle->delete();

            // 3. Redirect to Index on Success:
            //    Redirect to the vehicle list page with a success message.
            $successMessage = "Vehicle '{$vehicleIdentifier}' deleted successfully.";
            return to_route('vehicles.index')->with('success', $successMessage);

        } catch (Exception $e) {
            // 4. Handle Deletion Errors:
            //    Log the exception for debugging purposes.
            Log::error("Error deleting vehicle ID {$vehicle->id}: " . $e->getMessage());

            // Redirect back (or to index) with a generic error message.
            // Avoid revealing specific database errors to the user.
            return redirect()->back()->with('error', 'Could not delete the vehicle due to a server error. Please try again later.');
            // Alternatively, redirect to index:
            // return to_route('vehicles.index')->with('error', 'Could not delete the vehicle due to a server error.');
        }
    }
}
