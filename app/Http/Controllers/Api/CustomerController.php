<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Customers;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class CustomerController extends Controller
{
    public function showCustomerDetail(Customers $customer): JsonResponse
    {
        $userId = Auth::id() ?? 'guest';
        Log::info("User [ID: {$userId}] attempting to fetch details for Customer ID: {$customer->id}.");

        try {
                // --- 1. Eager Load Relations on the SINGLE Customer ---
            // This is necessary because the route model binding only fetches the base customer data.
            $customer->load([
                'activeContacts.contactType',
                'activeDeposits.depositType',
                'creator:id,name'
            ]);
            // --- 2. Format the Customer Data (Reuse your logic) ---
            // The formatting logic is identical to what you did for a single customer in index().
            $formattedCustomer = $this->formatCustomerForFrontend($customer);
            Log::info("Successfully fetched and formatted details for Customer ID: {$customer->id}.");
            // --- 3. Return as a JSON Response ---
            return response()->json([
                'customer' => $formattedCustomer,
                // You can add other related data here if needed (e.g., all deposit types)
            ]);

        } catch (\Illuminate\Auth\Access\AuthorizationException $e) {
            Log::warning("Authorization failed for User [ID: {$userId}] fetching Customer ID: {$customer->id}.");
            return response()->json(['error' => 'Unauthorized action.'], 403);
        } catch (\Exception $e) {
            Log::error("Error fetching details for Customer ID: {$customer->id}: " . $e->getMessage(), ['exception' => $e]);
            return response()->json(['error' => 'Could not load customer data.'], 500);
        }
    }

    /**
     * Helper function to format a single customer model for the frontend.
     * You should refactor the formatting logic from your index() function into this private method.
     * This ensures DRY (Don't Repeat Yourself) code.
     *
     * @param Customers $customer
     * @return array
     */
    private function formatCustomerForFrontend(Customers $customer): array
    {
        // --- START: Replicate your existing formatting logic here ---

        $activeContacts = $customer->activeContacts;
        $activeDeposits = $customer->activeDeposits;

        $primaryContact = $activeContacts->firstWhere('is_primary', true) ?? $activeContacts->firstWhere('is_primary', false) ?? null;
        $primaryContactType = $primaryContact?->contactType?->name ?? 'N/A';
        $primaryContactValue = $primaryContact?->contact_value ?? 'N/A';

        $primaryDeposit = $activeDeposits->firstWhere('is_primary', true) ?? $activeDeposits->firstWhere('is_primary', false) ?? null;
        $primaryDepositType = $primaryDeposit?->depositType?->name ?? 'N/A';
        $primaryDepositValue = $primaryDeposit?->deposit_value ?? 'N/A';

        $formattedActiveContacts = $activeContacts->map(function ($contact) {
            return [
                'id' => $contact->id,
                'contact_type_id' => $contact->contact_type_id,
                'contact_type_name' => $contact->contactType?->name ?? 'N/A',
                'contact_value' => $contact->contact_value,
                'description' => $contact->description,
                'is_primary' => $contact->is_primary,
                'is_active' => $contact->is_active,
            ];
        })->toArray(); // Convert Collection to Array for JSON

        $formattedActiveDeposits = $activeDeposits->map(function ($deposit) {
            return [
                'id' => $deposit->id,
                'customer_id' => $deposit->customer_id ?? "N/A",
                'rental_id' => $deposit->rental_id ?? "N/A",
                'type_name' => $deposit->depositType?->name ?? "N/A",
                'deposit_value' => $deposit->deposit_value ?? "N/A",
                'visa_type' => $deposit->visa_type ?? "N/A",
                'expiry_date' => $deposit->expiry_date?->toISOString() ?? "N/A",
                'description' => $deposit->description ?? "N/A",
                'is_primary' => $deposit->is_primary,
                'is_active' => $deposit->is_active,
                'start_date' => $deposit->start_date?->toISOString(),
                'end_date' => $deposit->end_date?->toISOString(),
                // ... include other deposit fields
            ];
        })->toArray(); // Convert Collection to Array for JSON

        return [
            'id' => $customer->id,
            'full_name' => $customer->full_name ?: 'N/A',
            'first_name' => $customer->first_name ?: 'N/A',
            'last_name' => $customer->last_name ?: 'N/A',
            'primary_contact' => $primaryContactValue,
            'primary_contact_type' => $primaryContactType,
            'primary_deposit_type' => $primaryDepositType ?: 'N/A',
            'primary_deposit' => $primaryDepositValue,
            'address' => $customer->full_address ?: 'N/A',
            'gender' => $customer->gender ?? 'N/A',
            'date_of_birth' => $customer->date_of_birth?->toDateString() ?? 'N/A',
            'passport_number' => $customer->passport_number ?? 'N/A',
            'notes' => $customer->notes  ?? 'N/A',

            // Critical data for display
            'activeContacts' => $formattedActiveContacts,
            'activeDeposits' => $formattedActiveDeposits,
            
            'address' => $customer->full_address ?: 'N/A',
            'address_line_1' => $customer->address_line_1 ?: 'N/A',
            'address_line_2' => $customer->address_line_2 ?: 'N/A',
            'commune' => $customer->commune ?: 'N/A',
            'district' => $customer->district ?: 'N/A',
            'city' => $customer->city ?: 'N/A',

            'gender' => $customer->gender ?? 'N/A',
            'nationality' => $customer->nationality ?? 'N/A',
            'date_of_birth' => $customer->date_of_birth?->toDateString() ?? 'N/A',
            'passport_number' => $customer->passport_number ?? 'N/A',
            'passport_expiry' => $customer->passport_expiry?->toDateString() ?? 'N/A',
            'notes' => $customer->notes  ?? 'N/A',
        ];
        // --- END: Replicate your existing formatting logic here ---
    }
}
