<?php

namespace App\Http\Controllers\Internals;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Response;
use Inertia\Inertia;
use Exception;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Validation\ValidationException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Redirect;

// Auth
use Illuminate\Support\Facades\Auth;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Foundation\Validation\ValidatesRequests;

// Model
use App\Models\User;
use App\Models\Customers;
use App\Models\Visa;

class VisaController extends Controller
{
    use AuthorizesRequests, ValidatesRequests;

    public function index(): Response
    {
        $userId = Auth::id() ?? 'guest';

        try {
            $this->authorize('visa-list');
            Log::info("User [ID: {$userId}] authorized to view visa.");

            $customers = Customers::select('id', 'first_name', 'last_name')->get();
            // --- Format Customer for View ---
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

            $users = User::select('id', 'name', 'email')->get();

            return Inertia::render('visa/visa-index', [
                'customers' => $formattedCustomers,
                'users' => $users,
            ]);

        } catch (AuthorizationException $e) {
            Log::warning("Authorization failed for User [ID: {$userId}] fetching chart data: " . $e->getMessage());
            abort(403, 'Unauthorized action.');
        } catch (\Exception $e) { // Catch generic Exception
            Log::error("Error fetching chart data for User [ID: {$userId}]: " . $e->getMessage(), ['exception' => $e]);
            abort(500, 'Could not load chart data.');
        }
    }

    public function store(Request $request): RedirectResponse
    {
        $userId = Auth::id() ?? 'guest';
        Log::info("User [ID: {$userId}] attempting to store a new visa.");

        try {
            $this->authorize('visa-create');

            // --- Define Validation Rules ---
            $rules = [
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
                'incharger_name' => ['required', 'string', Rule::exists('users', 'name')],
                'passport_number' => 'nullable|string|max:255',
                'visa_type' => 'required|string|max:255',
                'expiration_date' => 'required|date',
                'notes' => 'nullable|string',
            ];

            // --- Custom Error Messages ---
            $messages = [
                // Customer
                'customer_name.required' => 'The customer name is required.',
                'customer_name.string' => 'The customer name must be a string.',
                // Custom closure provides its own message

                // Incharger
                'incharger_name.required' => 'The incharge person is required.',
                'incharger_name.string' => 'The incharge name must be a string.',
                'incharger_name.exists' => 'The selected incharge person does not exist.', // Use exists message

                // Passport and Visa Data
                'visa_type.required' => 'The visa type is required.'
            ];

            // --- Define custom attributes for better error messages ---
            $attributes = [
                'customer_name' => 'customer name',
                'incharger_name' => 'incharge person',
                'visa_type' => 'visa type',
            ];

            // --- Validate the request data ---
            $validatedData = $request->validate($rules, $messages, $attributes);

            Visa::create([
                'customer_id' => $customer->id,
                'passport_number' => $validated['passport_number'],
                'visa_type' => $validated['visa_type'],
                'expiration_date' => $validated['expiration_date'],
                'incharger_id' => $incharger->id,
                'notes' => $validated['notes'],
                'created_by' => Auth::id(),
            ]);

            Log::info("User [ID: {$userId}] successfully created a new visa for customer [ID: {$customer->id}].");

            return Redirect::route('visa.index')->with('success', 'Visa created successfully.');

        } catch (AuthorizationException $e) {
            Log::warning("Authorization failed for User [ID: {$userId}] to create visa: " . $e->getMessage());
            abort(403, 'Unauthorized action.');
        } catch (ValidationException $e) {
            Log::error("Validation failed for User [ID: {$userId}] during visa creation: " . json_encode($e->errors()));
            return back()->withErrors($e->errors())->withInput();
        } catch (\Exception $e) {
            Log::error("Error creating visa for User [ID: {$userId}]: " . $e->getMessage(), ['exception' => $e]);
            return back()->with('error', 'There was a problem creating the visa.');
        }
    }
}
