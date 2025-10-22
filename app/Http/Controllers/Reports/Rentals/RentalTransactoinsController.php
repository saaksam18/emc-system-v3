<?php

namespace App\Http\Controllers\Reports\Rentals;

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
use App\Models\Rentals;
use App\Models\Customers;
use App\Models\Vehicles;
use App\Models\VehicleStatus;
use App\Models\VehicleClasses;
use App\Models\Contacts;
use App\Models\Deposits;
use App\Models\Deposits\DepositTypes;
use App\Models\User;

class RentalTransactoinsController extends Controller
{
    use AuthorizesRequests, ValidatesRequests;

    /**
     * Display a listing of the customers.
     *
     * @return \Inertia\Response
     */
    public function index(Request $request): Response
    {
        $userId = Auth::id() ?? 'guest';
        Log::info("User [ID: {$userId}] attempting to access Rentals index.");

        try {
            $this->authorize('rental-list');
            Log::info("User [ID: {$userId}] authorized for rental-list.");

            $selectedDate = $request->input('date');
            $selectedDate = $request->input('date');

            // Parse the incoming date string. If it's an ISO string, Carbon will handle it.
            $carbonDate = Carbon::parse($selectedDate);

            // Convert to the application's timezone (or a specific timezone like 'Asia/Phnom_Penh')
            // This is crucial if your frontend sends UTC and you want to interpret it locally.
            $dateToFilter = $carbonDate->setTimezone(config('app.timezone'))->startOfDay(); // Or a specific timezone 'Asia/Phnom_Penh'

            Log::info("Date to filter after timezone adjustment: " . $dateToFilter->toDateString());

            // --- Fetch Rentals (Apply the date filter) ---
            Log::info("Fetching rentals, and creator for User [ID: {$userId}] on date: {$dateToFilter->toDateString()}.");
            $rentalsQuery = Rentals::with([
                'vehicle:id,vehicle_no',
                'customer:id,first_name,last_name',
                'incharger:id,name',
                'creator:id,name',
                'status'
            ])
            ->withTrashed()
            ->whereDate('created_at', $dateToFilter) // <--- APPLY DATE FILTER HERE
            ->orderBy('id', 'desc');

            $rentals = $rentalsQuery->get();
            Log::info("Retrieved {$rentals->count()} rentals.");

            // Map the customer data for the frontend
            $formattedRentals = $rentals->map(function (Rentals $rental) {
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
                ->get();

                // Get the loaded active deposits collection
                $activeDeposits = Deposits::where('rental_id', $rental->id)
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
                        'visa_type' => $deposit->visa_type,
                        'expiry_date' => $deposit->expiry_date?->toISOString(),
                        'description' => $deposit->description,
                        'is_primary' => $deposit->is_primary,
                        'is_active' => $deposit->is_active ? 'Yes' : 'No',
                         'created_at' => $deposit->created_at?->toISOString(),
                         'updated_at' => $deposit->updated_at?->toISOString(),
                    ];
                });

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
                    'period' => $rental->period,

                    // Additional Info
                    'notes' => $rental->notes ?? 'N/A', // Null coalescing for notes
                    'incharger_name' => $rental->incharger?->name ?? 'Initial', // Optional chaining for creator name
                    'user_name' => $rental->creator?->name ?? 'Initial', // Optional chaining for creator name
                    'created_at' => $rental->created_at?->toISOString() ?? 'N/A', // Optional chaining for dates
                    'updated_at' => $rental->updated_at?->toISOString() ?? 'N/A', // Optional chaining for dates
                ];
            });

            // Get transaction counts by status (Apply the date filter here)
            $transactionCounts = Rentals::select('status', DB::raw('count(*) as total'))
                                        ->withTrashed()
                                        ->whereDate('created_at', $dateToFilter) // <--- APPLY DATE FILTER HERE
                                        ->groupBy('status')
                                        ->pluck('total', 'status'); // Pluck status as key and total as value

            // Total transaction counts for the selected date (Apply the date filter here)
            $totalTransactionCounts = Rentals::withTrashed()
                                        ->whereDate('created_at', $dateToFilter) // <--- APPLY DATE FILTER HERE
                                        ->count(); // Corrected to count all for the date

            Log::info("Fetching vehicle counts per class.");

            // Fetch all vehicle classes and eager load their vehicles relationship
            // Then, for each class, count the number of associated vehicles.
            $vehicleClasses = VehicleClasses::withCount('vehicles')->get();

            // Map the collection to return only the class name and the count of vehicles
            // Call the new function to get vehicle class counts
            $vehicleClassCounts = $this->getVehicleClassCounts();

            // Get the grand total number of vehicles across all classes
            $grandTotalVehicles = Vehicles::count();
            // Call the new function to get vehicle class counts and overall status percentages
            $vehicleReportData = $this->getVehicleReportData($grandTotalVehicles);
            //dd($vehicleReportData);
            Log::info("Retrieved vehicle class counts: " . json_encode($vehicleClassCounts));

            Log::info("Finished formatting data. Rendering view for User [ID: {$userId}].");
            // --- Render View ---
            return Inertia::render('reports/rentals/rentals-report-index', [
                'rentals' => Inertia::defer(fn () => $formattedRentals),
                'transactionCounts' => Inertia::defer(fn () => $transactionCounts), // Pass the dynamic counts to the frontend
                'totalTransactionCounts' => Inertia::defer(fn () => $totalTransactionCounts),
                'vehicleClassCounts' => Inertia::defer(fn () => $vehicleClassCounts),
                'vehicleReportData' => Inertia::defer(fn () => $vehicleReportData),
                'date' => $dateToFilter->toDateString(), // Pass the actual date used for filtering
            ]);

        } catch (AuthorizationException $e) {
            Log::warning("Authorization failed for User [ID: {$userId}] accessing Customers index: " . $e->getMessage());
            abort(403, 'Unauthorized action.');
        }
    }

    // ... (rest of your getVehicleClassCounts and getVehicleReportData methods remain unchanged)
    /**
     * Get the count of vehicles for each vehicle class, separated by vehicle status.
     *
     * @return \Illuminate\Support\Collection
     */
    public function getVehicleClassCounts(): Collection
    {
        Log::info("Fetching vehicle counts per class and status with percentages.");

        // Get the grand total number of vehicles across all classes
        $grandTotalVehicles = Vehicles::count();

        // Fetch all vehicle classes and eager load their vehicles and each vehicle's status.
        $vehicleClasses = VehicleClasses::with(['vehicles.vehicleStatus'])->get();

        // Map the collection to return the class name as key and an array of status counts as value.
        $formattedCounts = $vehicleClasses->mapWithKeys(function ($class) use ($grandTotalVehicles) {
            $statusBreakdown = [];
            $totalVehiclesInClass = $class->vehicles->count();

            // Iterate through each vehicle belonging to the current class.
            $class->vehicles->each(function ($vehicle) use (&$statusBreakdown) {
                // Check if the vehicle has an associated status.
                if ($vehicle->vehicleStatus) {
                    $statusName = $vehicle->vehicleStatus->status_name;
                    // Initialize or increment the count for the specific status.
                    $statusBreakdown[$statusName] = ($statusBreakdown[$statusName] ?? 0) + 1;
                }
            });

            // Convert status counts to an array of objects with percentages
            $detailedStatusBreakdown = collect($statusBreakdown)->map(function ($count, $statusName) use ($totalVehiclesInClass) {
                $percentageInClass = $totalVehiclesInClass > 0 ? round(($count / $totalVehiclesInClass) * 100, 2) : 0;
                return [
                    'statusName' => $statusName,
                    'count' => $count,
                    'percentageInClass' => $percentageInClass,
                ];
            })->values(); // Reset keys to be a simple array

            // Calculate the percentage of this class's vehicles relative to the grand total
            $classPercentageOfTotal = $grandTotalVehicles > 0 ? round(($totalVehiclesInClass / $grandTotalVehicles) * 100, 2) : 0;

            // Return the class name as the main key, and the aggregated data as its value.
            return [
                $class->name => [
                    'totalVehiclesInClass' => $totalVehiclesInClass,
                    'classPercentageOfTotal' => $classPercentageOfTotal,
                    'statusBreakdown' => $detailedStatusBreakdown,
                ]
            ];
        });

        Log::info("Retrieved vehicle class and status counts with percentages: " . json_encode($formattedCounts));
        return $formattedCounts;
    }

    /**
     * Get the count of vehicles for each vehicle class, separated by vehicle status,
     * and overall vehicle status percentages.
     *
     * @param int $grandTotalVehicles The total number of vehicles across all classes.
     * @return array
     */
    public function getVehicleReportData(int $grandTotalVehicles): array
    {
        Log::info("Fetching vehicle counts per class and status with percentages.");

        // --- 1. Calculate Overall Status Percentages ---
        $overallStatusPercentages = [];
        $allVehicleStatuses = VehicleStatus::all();

        foreach ($allVehicleStatuses as $status) {
            $count = Vehicles::where('current_status_id', $status->id)->count();
            $percentageOfTotal = $grandTotalVehicles > 0 ? round(($count / $grandTotalVehicles) * 100, 2) : 0;
            $overallStatusPercentages[] = [
                'statusName' => $status->status_name,
                'count' => $count,
                'percentageOfTotal' => $percentageOfTotal,
            ];
        }

        // --- 2. Calculate Class-wise Breakdown ---
        $vehicleClasses = VehicleClasses::with(['vehicles.vehicleStatus'])->get();

        $classBreakdown = $vehicleClasses->mapWithKeys(function ($class) {
            $statusBreakdown = [];
            $totalVehiclesInClass = $class->vehicles->count();
            $totalVehicleCounts = Vehicles::count();
            $class->vehicles->each(function ($vehicle) use (&$statusBreakdown) {
                if ($vehicle->vehicleStatus) {
                    $statusName = $vehicle->vehicleStatus->status_name;
                    $statusBreakdown[$statusName] = ($statusBreakdown[$statusName] ?? 0) + 1;
                }
            });

            $detailedStatusBreakdown = collect($statusBreakdown)->map(function ($count, $statusName) use ($totalVehiclesInClass) {
                $percentageInClass = $totalVehiclesInClass > 0 ? round(($count / $totalVehiclesInClass) * 100, 2) : 0;
                return [
                    'statusName' => $statusName,
                    'count' => $count,
                    'percentageInClass' => $percentageInClass,
                ];
            })->values();

            // Calculate the percentage of this class's vehicles relative to the grand total
            $classPercentageOfTotal = $totalVehicleCounts > 0 ? round(($totalVehiclesInClass / $totalVehicleCounts) * 100, 2) : 0;

            return [
                $class->name => [
                    'totalVehiclesInClass' => $totalVehiclesInClass,
                    'classPercentageOfTotal' => $classPercentageOfTotal,
                    'statusBreakdown' => $detailedStatusBreakdown,
                ]
            ];
        });

        Log::info("Retrieved vehicle report data: " . json_encode(['classBreakdown' => $classBreakdown, 'overallStatusPercentages' => $overallStatusPercentages]));

        return [
            'classBreakdown' => $classBreakdown,
            'overallStatusPercentages' => $overallStatusPercentages,
        ];
    }
}