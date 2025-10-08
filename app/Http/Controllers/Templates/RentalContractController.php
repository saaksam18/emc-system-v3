<?php

namespace App\Http\Controllers\Templates;

use App\Http\Controllers\Controller;
use App\Models\Rentals;
use App\Models\Templates\MasterContractTemplate;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Barryvdh\DomPDF\Facade\Pdf;
use Inertia\Inertia;

class RentalContractController extends Controller
{
    /**
     * Shows the form to edit the master contract policy template.
     * @return \Inertia\Response
     */
    public function editTemplate()
    {
        // 3. Pass only the template texts to the TSX component
        return Inertia::render('templates/contracts/customize-new-rental-master');
    }

    /**
     * Generates the Scooter Rental Contract PDF by combining dynamic rental data 
     * from the request and static policy text from the MasterContractTemplate.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */
    public function generatePdf(Request $request)
    {
        // 1. Validation for Dynamic Fields
        $validatedData = $request->validate([
            'id' => 'required|exists:rentals,id', // 'id' from the React form, mapped to rental_id
            'name' => 'required|string', // renter_name
            'sex' => 'nullable|string',
            'nationality' => 'nullable|string',
            'phone' => 'nullable|string',
            'occupation' => 'nullable|string',
            'address' => 'nullable|string',
            'start_date' => 'required|date',
            'end_date' => 'required|date',
            'period_text' => 'nullable|string',
            'has_helmet' => 'nullable|boolean',
            'motor_id' => 'required|string',
            'plate_no' => 'required|string',
            'type' => 'nullable|string', // motor_type
            'transmission' => 'nullable|string', // motor_transmission
            'compensation_fee' => 'required|string',
            'deposit_amount' => 'required|string',
            'deposit_type' => 'nullable|string',
            
            // The policy texts are NOT validated here, as they were pulled from the MasterTemplate,
            // but we must check if they were included in the request URL for backup purposes.
            // If the React component passes them for convenience:
            // 'compensation_policy_text' => 'nullable|string', 
            // etc...
        ]);

        // 2. Fetch the Master Policy Texts
        // This ensures the PDF uses the latest, most recently saved template.
        $template = MasterContractTemplate::first();
        if (!$template) {
             // Handle case where master template hasn't been created yet
             return back()->withErrors(['pdf_error' => 'Master Contract Template not found. Please create it first.']);
        }
        
        // 3. Prepare the Final Data Array for the Blade View
        
        // Map the flattened React form data keys back to the Blade view variables
        $dynamicData = [
            'renter_name' => $validatedData['name'],
            'renter_sex' => $validatedData['sex'],
            'renter_nationality' => $validatedData['nationality'],
            'renter_phone' => $validatedData['phone'],
            'renter_occupation' => $validatedData['occupation'],
            'renter_address' => $validatedData['address'],
            'rental_date' => $validatedData['start_date'],
            'return_date' => $validatedData['end_date'],
            'rental_period' => $validatedData['period_text'],
            'helmet_rental' => ($validatedData['has_helmet'] ? '□ Yes' : '□ No'),
            'motor_id' => $validatedData['motor_id'],
            'plate_no' => $validatedData['plate_no'],
            'motor_type' => $validatedData['type'],
            'motor_transmission' => $validatedData['transmission'],
            'compensation_fee' => $validatedData['compensation_fee'],
            'deposit_amount' => $validatedData['deposit_amount'],
            'deposit_type' => $validatedData['deposit_type'],
        ];

        // Combine policy text, dynamic data, and hardcoded business info
        $data = array_merge(
            $template->toArray(), // Includes all policy_text fields
            $dynamicData,
            [
                // Hardcoded/Default Business Information (from the original DOCX)
                'emc_address' => 'No.38Eo, St.322, BKK 1, Chamkarmon, Phnom Penh',
                'emc_business_days' => 'From Tuesday - Sunday',
                'emc_business_hours' => 'AM9:00 - PM5:00',
                'emc_tel' => '089 491 436',
                'emc_viber' => '089-518-867',
                'total_rental_fee' => 'N/A', // Placeholder, calculate if needed
                'fee_1_7_days' => 'N/A',     // Placeholder
                'fee_8_19_days' => 'N/A',    // Placeholder
                'fee_1_month' => 'N/A',      // Placeholder
                'staff_name' => auth()->check() ? auth()->user()->name : 'EMC Staff', 
                'renter_signature' => ' ', // Blank for manual signature
            ]
        );

        // 4. Generate the PDF using DomPDF
        try {
            $pdf = Pdf::loadView('contracts.scooter_rental_master', $data);
            
            // Set paper size if needed (e.g., A4 portrait)
            $pdf->setPaper('a4', 'portrait');

            // 5. Return the PDF as a download
            $filename = 'Scooter_Rental_Contract_' . $validatedData['id'] . '_' . now()->format('Ymd') . '.pdf';
            return $pdf->download($filename);

        } catch (\Exception $e) {
            \Log::error('PDF Generation Error: ' . $e->getMessage());
            
            // Redirect the user back with an error message
            return back()->withErrors(['pdf_error' => 'Failed to generate PDF due to a server error.']);
        }
    }

    /**
     * Updates the master contract policy template in the database.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\RedirectResponse
     */
    public function updateTemplate(Request $request)
    {
        // 1. Validation (must match the form fields)
        $validated = $request->validate([
            'compensation_policy_text' => 'required|string',
            'return_policy_text' => 'required|string',
            'repair_policy_text' => 'required|string',
            'phone_address_change_text' => 'required|string',
            'refund_policy_text' => 'required|string',
            'overdue_penalties_text' => 'required|string',
            'effect_contract_text' => 'required|string',
        ]);

        // 2. Find or create the single master template record (ID 1)
        $template = MasterContractTemplate::firstOrNew(['id' => 1]);

        // 3. Mass update the policy texts
        $template->fill($validated);
        $template->save();

        // 4. Return success response
        return back()->with('success', 'Master contract template policies updated successfully.');
    }

    /**
     * Shows the form to customize the contract text for a specific rental.
     *
     * @param  \App\Models\Rental  $rental
     * @return \Inertia\Response
     */
    public function customize(Rentals $rental)
    {
        // 1. Eager load necessary relationships to populate the form's read-only fields
        // and ensure required data is available.
        $rental->load('user', 'scooter');

        // 2. Determine the policy text to display in the textareas.
        // If the 'custom_texts' field exists and is populated, use that (the saved, custom version).
        // Otherwise, provide the default, master text as initial content.

        // Define the master/default text blocks based on your document content
        $masterTexts = [
            'compensation_policy_text' => "The motorbike has no insurance for any loss or damage;\nyou should take care of the motorbike in secure and be fully responsible for any loss and damage.\nIn case of an accident or serious breakdown/trouble, you shall inform our company by calling immediately.\nYou shall pay all the amount of compensation fee at one time basically (payment condition is negotiable).",
            'return_policy_text' => "1. When you return/exchange the rental motorbike, you should fill the gasoline up before return/exchange.\nYou shall fill gasoline up or pay some money as gasoline fee.\n2-1. You can exchange rental motorbikes at the same price if the rental motorbike has any trouble.\n2-2. When you want to exchange more expensive type of motorbike and you keep on using this one, you need to pay the amount of price difference between the 2 motorbikes.",
            'repair_policy_text' => "1. Rental motorbike shall be used in Phnom Penh city area only.\nIn case the motorbike is used outside of Phnom Penh city, you shall be responsible for any damage/problem concerning the motorbike.\nIf the motorbike does not work outside of Phnom Penh city, you have to repair it to the original condition and inform EMC immediately.\n2. Even in breakdown/trouble of rental motorbike, you shall bring the motorbike back to EMC shop as long as the motorbike can run with safety.\n3. When rental motorbike tires or tubes are got flat/broken during the rental period, you should pay repair fee by yourself except first or second day of rental (Customer should pay the repair fee from third day of rental).\n4. When rental motorbike parts, helmets, keys, and a key tag get lost or breakdown/damage owing to physical shock or 3rd party’s action, you are responsible for repair/compensation fee.\n5. When rental motorbike key or rental helmet is lost or damaged, the renter needs to pay some compensation. (Details are described in other paper)\n6. When rental motorbike parts get breakdown/damage under normal use (e.g. Light is off, gasoline gauge is not working), you can exchange the motor or ask for repair fee from EMC with the receipt that shows the actual expenses of standard market-price.\n7. EMC finds rental-motor has a problem/broken part when you return the motorbike to EMC; EMC is entitled to keep your deposit (passport, money or equivalent until the full amount of repair/compensation fee is paid off.",
            'phone_address_change_text' => "When you change the phone number or current address in Phnom Penh city, NEVER FAIL TO LET US KNOW your new phone number or new address via SMS mail, phone, or Facebook.",
            'refund_policy_text' => "EMC shall refund 50% rental fee of the rest of your rental days when you get back the motor more than 1 week earlier before your scheduled return date.",
            'overdue_penalties_text' => "1. If your payment is overdue more than 3 days without any notice to EMC or without a specific reason (ex: unexpected accident/serious-illness), additionally you shall pay $2 per day as penalty charge for delay apart from rental fee.\n2. If your payment is overdue more than 10 days without any notice to EMC, EMC is entitled to visit your working place or residence without any notice to you for the purpose of investigating a situation, collecting the payment.\nIn this case, you shall pay $6 per visit (EMC make a record of visit with physical evidences) as collection fee apart from rental fee & penalty charge.\n3. If you keep using rental motorbike without paying extension fee, penalty charge or collection fee, EMC can stop renting the motorbike anytime under EMC’s discretion and can repossess the motorbike without any notice to you.\nIn this case, you still shall pay total unpaid amount (e.g. Penalty fee, Collection fee)",
            'effect_contract_text' => "When you make an extension rental or a motorbike exchange contract with EMC, all the articles and policies in this contract except the amount of compensation fee remain effective until you return your rental motorbike to EMC.",
        ];

        // Retrieve the current custom texts, falling back to the master texts
        $currentCustomTexts = $rental->custom_texts ?? $masterTexts;

        // 3. Structure the data exactly as your TSX component expects the 'rental' prop
        return Inertia::render('templates/contracts/customize-new-rental-master-customize', [
            'rental' => [
                'id' => $rental->id,
                'start_date' => $rental->rental_date->format('Y-m-d'), // Assuming casting to Carbon
                'end_date' => $rental->return_date->format('Y-m-d'),   // Assuming casting to Carbon
                'period_text' => $rental->period_text ?? 'N/A', // Assuming this is calculated/stored
                'has_helmet' => (bool)$rental->has_helmet,
                'compensation_fee' => $rental->compensation_fee ?? '1500',
                'deposit_amount' => $rental->deposit_amount ?? '100',
                'deposit_type' => $rental->deposit_type ?? '□ Your Passport',

                // User Data
                'user' => [
                    'name' => $rental->user->name,
                    'sex' => $rental->user->sex ?? '□ male',
                    'nationality' => $rental->user->nationality ?? '□ other',
                    'phone' => $rental->user->phone,
                    'occupation' => $rental->user->occupation ?? 'N/A',
                    'address' => $rental->user->address,
                ],

                // Scooter Data
                'scooter' => [
                    'motor_id' => $rental->scooter->motor_id,
                    'plate_no' => $rental->scooter->plate_no,
                    'type' => $rental->scooter->type,
                    'transmission' => $rental->scooter->transmission,
                ],

                // Custom Text Blocks
                'custom_texts' => $currentCustomTexts,
            ],
        ]);
    }
}
