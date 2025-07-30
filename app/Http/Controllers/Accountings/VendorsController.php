<?php

namespace App\Http\Controllers\Accountings;

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
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Hash;
// Auth
use Illuminate\Support\Facades\Auth;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Foundation\Validation\ValidatesRequests;

// Model
use App\Models\Accountings\Vendor;
use App\Models\User;

class VendorsController extends Controller
{
    use AuthorizesRequests, ValidatesRequests;

    public function index(Request $request)
    {
        $userId = Auth::id() ?? 'guest';
        Log::info("User [ID: {$userId}] attempting to accessing Vendors page from VendorsController.");

        try {
            // Assuming 'dashboard-list' is the permission needed for this data
            $this->authorize('vendor-list');
            Log::info("User [ID: {$userId}] authorized for accessing vendors.");

            // Fetch existing transactions with their related debit/credit accounts
            $vendors = Vendor::with('creator')->withTrashed()->get();

            $formattedVendors = $vendors->map(function ($vendor) {
                return [
                    'id' => $vendor->id,
                    'name' => $vendor->name ?? 'N/A',
                    'email' => $vendor->email ?? 'N/A',
                    'phone' => $vendor->phone ?? 'N/A',
                    'address' => $vendor->address ?? 'N/A',
                    'notes' => $vendor->notes ?? 'N/A',
                    'user_name' => $vendor->user->name ?? 'N/A',
                    'created_at' => $vendor->created_at?->toISOString(),
                    'updated_at' => $vendor->updated_at?->toISOString(),
                ];
            });

            return Inertia::render('accountings/settings/vendors', [
                'vendors' => Inertia::defer(fn () => $formattedVendors),

            ]);

        } catch (AuthorizationException $e) {
            Log::warning("Authorization failed for User [ID: {$userId}] accessing Vendors: " . $e->getMessage()); // Changed from Sales Entry
            abort(403, 'Unauthorized action.');
        } catch (Exception $e) {
            Log::error("Error accessing Vendors for User [ID: {$userId}]: " . $e->getMessage(), ['exception' => $e]); // Changed from Sales Entry
            abort(500, 'Could not load vendors data.');
        }
    }

    public function store(Request $request): RedirectResponse
    {
        $userId = Auth::id() ?? 'guest';
        Log::info("User [ID: {$userId}] is attempting to create a new vendor.");

        try {
            $this->authorize('vendor-create');
            Log::info("User [ID: {$userId}] is authorized to create a vendor.");

            $validated = $request->validate([
                'name' => 'required|string|max:255',
                'email' => 'nullable|email|max:255',
                'phone' => 'nullable|string|max:20',
                'address' => 'nullable|string|max:500',
                'notes' => 'nullable|string',
            ]);

            Vendor::create([
                'name' => $validated['name'],
                'email' => $validated['email'],
                'phone' => $validated['phone'],
                'address' => $validated['address'],
                'notes' => $validated['notes'],
                'user_id' => $userId,
            ]);

            Log::info("User [ID: {$userId}] successfully created a new vendor: {$validated['name']}");

            return Redirect::route('settings.vendors.index')->with('success', 'Vendor created successfully.');

        } catch (AuthorizationException $e) {
            Log::warning("Authorization failed for User [ID: {$userId}] to create a vendor: " . $e->getMessage());
            return back()->withErrors(['error' => 'You are not authorized to create a vendor.'])->withInput();
        } catch (ValidationException $e) {
            Log::error("Validation failed for User [ID: {$userId}] during vendor creation: " . $e->getMessage());
            return back()->withErrors($e->errors())->withInput();
        } catch (Exception $e) {
            Log::error("An unexpected error occurred for User [ID: {$userId}] during vendor creation: " . $e->getMessage(), ['exception' => $e]);
            return back()->withErrors(['error' => 'An unexpected error occurred. Please try again.'])->withInput();
        }
    }

    public function update(Request $request, Vendor $vendor): RedirectResponse
    {
        $userId = Auth::id() ?? 'guest';
        Log::info("User [ID: {$userId}] is attempting to update vendor [ID: {$vendor->id}].");

        try {
            $this->authorize('vendor-edit');
            Log::info("User [ID: {$userId}] is authorized to update vendor [ID: {$vendor->id}].");

            $validated = $request->validate([
                'name' => 'required|string|max:255',
                'email' => 'nullable|email|max:255',
                'phone' => 'nullable|string|max:20',
                'address' => 'nullable|string|max:500',
                'notes' => 'nullable|string',
            ]);

            $vendor->update($validated);

            Log::info("User [ID: {$userId}] successfully updated vendor [ID: {$vendor->id}]: {$validated['name']}");

            return Redirect::route('settings.vendors.index')->with('success', 'Vendor updated successfully.');

        } catch (AuthorizationException $e) {
            Log::warning("Authorization failed for User [ID: {$userId}] to update vendor [ID: {$vendor->id}]: " . $e->getMessage());
            return back()->withErrors(['error' => 'You are not authorized to update this vendor.'])->withInput();
        } catch (ValidationException $e) {
            Log::error("Validation failed for User [ID: {$userId}] during vendor [ID: {$vendor->id}] update: " . $e->getMessage());
            return back()->withErrors($e->errors())->withInput();
        } catch (Exception $e) {
            Log::error("An unexpected error occurred for User [ID: {$userId}] during vendor [ID: {$vendor->id}] update: " . $e->getMessage(), ['exception' => $e]);
            return back()->withErrors(['error' => 'An unexpected error occurred. Please try again.'])->withInput();
        }
    }

    public function destroy(Request $request, Vendor $vendor): RedirectResponse
    {
        $userId = Auth::id();
        $vendorIdentifier = $vendor->name ?? $vendor->id;
        Log::info("User [ID: {$userId}] attempting to delete Vendor [ID: {$vendor->id}, Identifier: {$vendorIdentifier}].");

        if (!$userId) { // Extra check
             Log::warning("Attempted to delete Vendor [ID: {$vendor->id}] without authenticated user.");
             return redirect()->route('login')->with('error', 'You must be logged in to perform this action.');
        }

        try {
            $this->authorize('vendor-delete');
            Log::info("User [ID: {$userId}] authorized to delete Vendor [ID: {$vendor->id}].");

            $validator = Validator::make($request->all(), [
                'password' => 'required|string',
            ]);

            if ($validator->fails()) {
                Log::warning("Attempted to delete vendor {$vendor->id} without providing a password.");
                return back()->withErrors($validator)->withInput();
            }

            $admin = Auth::user();

            if (!$admin) {
                Log::warning("Attempted to delete vendor {$vendor->id} without being authenticated.");
                 return back()->withErrors(['password' => 'Authentication error. Please log in again.']);
            }

            if (!Hash::check($request->input('password'), $admin->password)) {
                return back()->withErrors(['password' => 'The provided administrator password does not match.'])->withInput();
            }

            $vendor->delete();

            Log::info("Successfully soft-deleted Vendor [ID: {$vendor->id}] by User [ID: {$userId}].");
            return Redirect::route('settings.vendors.index')->with('success', "{$vendorIdentifier} successfully deleted.");

        } catch (AuthorizationException $e) {
            Log::warning("Authorization failed for User [ID: {$userId}] deleting Vendor [ID: {$vendor->id}]: " . $e->getMessage());
            return redirect()->back()->with('error', 'You do not have permission to delete this vendor.');
        } catch (Exception $e) {
            Log::error("Error deleting vendor [ID: {$vendor->id}] by User [ID: {$userId}]: " . $e->getMessage(), ['exception' => $e]);
            return redirect()->back()->with('error', 'Could not delete the vendor due to a server error. Please try again later.');
        }
    }
}
