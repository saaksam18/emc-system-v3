<?php

namespace App\Http\Controllers\Internals;

use App\Http\Controllers\Controller;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;

use App\Models\Rentals;
use Barryvdh\DomPDF\Facade\Pdf;

class PrintController extends Controller
{
    /**
     * Private helper method to handle data loading and formatting, 
     * reusable for both the Inertia preview and PDF generation.
     */
    private function getFormattedRentalData(Rentals $rental): array
    {
        // 1. Eager Load Data
        $rental->load([
            'vehicle.vehicleMaker:id,name',
            'vehicle.vehicleModel:id,name',
            'vehicle.vehicleClasses:id,name',
            'customer:id,first_name,last_name,gender,nationality,address_line_1,address_line_2,commune,district,city',
            'incharger:id,name',
            'creator:id,name',
            'status',
            'deposits' => function ($query) {
                $query->where('is_active', true)->with('depositType:id,name');
            },
            'customer.contacts' => function ($query) {
                $query->where('is_active', true)->with('contactType:id,name');
            }
        ]);

        $activeDeposits = $rental->deposits;
        $contacts = $rental->customer->contacts ?? collect();

        // --- Customer Full Name ---
        $firstName = $rental->customer->first_name ?? '';
        $lastName = $rental->customer->last_name ?? '';
        $full_name = trim($firstName . ' ' . $lastName) ?: 'N/A';

        // Customer Full Address line
        $firstAddressLine = $rental->customer->address_line_1 ?? '';
        $secondAddressLine = $rental->customer->address_line_2 ?? '';
        $commune = $rental->customer->commune ?? '';
        $district = $rental->customer->district ?? '';
        $city = $rental->customer->city ?? '';
        $full_address = trim($firstAddressLine . ' ' . $secondAddressLine. ' ' . $commune. ' '. $district. ' '. $city) ?: 'N/A';

        // --- Primary Contact ---
        $primaryContact = $contacts->firstWhere('is_primary', true) ?? $contacts->first();
        $primaryContactType = $primaryContact?->contactType?->name ?? 'N/A';
        $primaryContactValue = $primaryContact?->contact_value ?? 'N/A';
        $activeContactCount = $contacts->count();

        // --- Primary Deposit ---
        $primaryDeposit = $activeDeposits->firstWhere('is_primary', true) ?? $activeDeposits->first();
        $primaryDepositType = $primaryDeposit?->depositType?->name ?? 'N/A';
        $primaryDepositValue = $primaryDeposit?->deposit_value ?? 'N/A';
        $activeDepositsCount = $activeDeposits->count();

        // --- Format Contacts ---
        $formattedActiveContacts = $contacts->map(function ($contact) {
            return [
                'id' => $contact->id,
                'contact_type_name' => $contact->contactType?->name ?? 'N/A',
                'contact_value' => $contact->contact_value,
                'is_primary' => $contact->is_primary,
            ];
        });

        // --- Format Deposits ---
        $formattedActiveDeposits = $activeDeposits->map(function ($deposit) {
            return [
                'id' => $deposit->id,
                'type_name' => $deposit->depositType?->name ?? 'N/A',
                'deposit_value' => $deposit->deposit_value,
                'is_primary' => $deposit->is_primary,
            ];
        });

        // --- Overdue Logic ---
        $overdueHuman = 'N/A';
        if (is_null($rental->actual_return_date) && $rental->end_date && $rental->end_date->isPast()) {
            if ($rental->end_date instanceof Carbon) {
                $overdueHuman = $rental->end_date->diffForHumans(Carbon::now(), true);
            }
        }

        // --- Return the formatted array ---
        return [
            'id' => $rental->id,

            'vehicle_no' => $rental->vehicle?->vehicle_no ?? 'N/A',
            'license_plate' => $rental->vehicle?->license_plate ?? 'N/A',
            'make' => $rental->vehicle?->vehicleMaker?->name ?? 'N/A',
            'model' => $rental->vehicle?->vehicleModel?->name ?? 'N/A',
            'class' => $rental->vehicle?->vehicleClasses?->name ?? 'N/A',
            'compensation_price' => $rental->vehicle->compensation_price ?? 'N/A',

            'full_name' => $full_name,
            'sex' => $rental->customer->gender,
            'nationality' => $rental->customer->nationality,
            'address' => $full_address,
            'primary_contact_type' => $primaryContactType,
            'primary_contact' => $primaryContactValue,
            'active_contact_count' => $activeContactCount,
            'activeContacts' => $formattedActiveContacts,
            'primary_deposit_type' => $primaryDepositType,
            'primary_deposit' => $primaryDepositValue,
            'active_deposits_count' => $activeDepositsCount,
            'activeDeposits' => $formattedActiveDeposits,
            
            'status_name' => $rental->status,
            'total_cost' => $rental->total_cost,
            'start_date' => $rental->start_date?->format('Y-m-d') ?? 'N/A',
            'end_date' => $rental->end_date?->format('Y-m-d') ?? 'N/A',
            'period' => $rental->period,
            'overdue' => $overdueHuman,
            'notes' => $rental->notes ?? 'N/A',
            'incharger_name' => $rental->incharger?->name ?? 'Initial',
            'user_name' => $rental->creator?->name ?? 'Initial',
            'created_at' => $rental->created_at?->toISOString() ?? 'N/A',
            'updated_at' => $rental->updated_at?->toISOString() ?? 'N/A',
        ];
    }


    /**
     * Step 1: Render the React component for the contract preview (No PDF generation yet).
     */
    public function previewRentalContract(Rentals $rental)
    {
        // 1. Get the data
        $formattedRental = $this->getFormattedRentalData($rental);

        // 2. Return an Inertia response
        // Assumes your React component is located at Pages/Print/RentalContractPreview.jsx
        return Inertia::render('templates/contracts/preview-contract', [
            'rental' => $formattedRental,
            // Pass the route for the download button, using the original print route
            'downloadUrl' => route('print.rental', $rental->id), 
        ]);
    }


    /**
     * Step 2: Handle the final PDF download request from the React component.
     * This method contains the original download logic.
     */
    public function printRentalContract(Rentals $rental) {
        
        // 1. Get the data
        $formattedRental = $this->getFormattedRentalData($rental);
        
        // 2. Generate the PDF
        $pdf = Pdf::loadView('contracts.scooter_new_rental_master', [
            'rental' => $formattedRental 
        ]);

        // 3. Return the Download Response
        $filename = 'Rental-Contract-' . $formattedRental['vehicle_no'] . '-' . $formattedRental['id'] . '.pdf';

        // This correctly triggers the file download via HTTP headers
        return $pdf->download($filename);
    }
}
