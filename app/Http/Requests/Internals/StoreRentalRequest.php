<?php

namespace App\Http\Requests\Internals;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use App\Models\Deposits\DepositTypes;
use App\Models\Vehicles;
use App\Models\Customers;
use App\Models\VehicleStatus;

class StoreRentalRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return Auth::user()->can('rental-create');
    }

    protected function prepareForValidation(): void
    {
        // 1. Ensure helmet_amount exists. If the front-end doesn't send it,
        // default it to 0.00 so the 'same' and 'required_if' rules can work.
        $helmetCharge = $this->has('helmet_amount') 
            ? $this->input('helmet_amount') 
            : 0.00; 

        $this->merge([
            'helmet_amount' => $helmetCharge,
        ]);
        //dd($this->all()); 
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'vehicle_id' => ['required', 'max:255', Rule::exists('vehicles', 'id')],
            'customer_id' => ['required', 'max:255', Rule::exists('customers', 'id')],
            'incharger_id' => ['required', 'max:255', Rule::exists('users', 'id')],
            'status_id' => [
                'required',
                'max:255',
                Rule::exists('vehicle_statuses', 'id'),
                function ($attribute, $value, $fail) {
                    $vehicle = Vehicles::where('id', $this->input('vehicle_id'))->first();
                    if (!$vehicle) {
                        return;
                    }
                    $selectedStatus = VehicleStatus::where('id', $value)->first();
                    if (!$selectedStatus) {
                        return;
                    }
                    if ($vehicle->current_status_id == $selectedStatus->id) {
                        $fail('The selected vehicle status is the same as its current status. Please choose a different status if you intend to change it.');
                    }
                }
            ],
            'activeDeposits' => ['nullable', 'array'],
            'activeDeposits.*.deposit_type' => [
                'required',
                Rule::exists('deposits', 'id')
            ],
            'activeDeposits.*.deposit_value' => ['required', 'max:255'],
            'activeDeposits.*.is_primary' => ['nullable', 'boolean'],
            'activeDeposits.*.visa_type' => ['nullable', 'string', 'max:255'],
            'activeDeposits.*.expiry_date' => ['nullable', 'date'],
            'activeDeposits.*.description' => ['nullable', 'string', 'max:255'],
            'actual_start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:actual_start_date',
            'period' => 'required|max:50',
            'coming_date' => 'nullable|date',
            'total_cost' => 'required|numeric|min:0',
            'notes' => 'nullable|string',

            // 1. Rental Payment (Required)
            'payments.rental.amount' => ['required', 'numeric', 'min:0', 'same:total_cost'],
            'payments.rental.payment_type' => ['required', 'string', Rule::in(['cash', 'bank', 'credit'])],
            'payments.rental.credit_account_id' => ['required', 'integer', Rule::exists('chart_of_accounts', 'id')],
            'payments.rental.debit_target_account_id' => ['required', 'integer', Rule::exists('chart_of_accounts', 'id')],
            'payments.rental.description' => ['nullable', 'string', 'max:255'],

            // 2. Helmet Payment (Now Conditional)
            // If the 'helmet_amount' in the request is 0 or less, none of these rules apply.
            'payments.helmet.amount' => [
                'nullable', 
                'numeric', 
                'min:0', 
                'same:helmet_amount',
                Rule::requiredIf($this->input('helmet_amount') > 0)
            ],
            'payments.helmet.payment_type' => [
                'nullable', // Allow to be null if requiredIf is false
                'string', 
                Rule::in(['cash', 'bank', 'credit']),
                Rule::requiredIf($this->input('helmet_amount') > 0)
            ],
            'payments.helmet.credit_account_id' => [
                'nullable', 
                'integer', 
                Rule::exists('chart_of_accounts', 'id'),
                Rule::requiredIf($this->input('helmet_amount') > 0)
            ],
            'payments.helmet.debit_target_account_id' => [
                'nullable', 
                'integer', 
                Rule::exists('chart_of_accounts', 'id'),
                Rule::requiredIf($this->input('helmet_amount') > 0)
            ],
            'payments.helmet.description' => ['nullable', 'string', 'max:255'],

            // 3. Deposit Payment (Optional - Only exists if deposits are active)
            'payments.deposit' => ['nullable', 'array'], // Allows 'payments.deposit' to be missing or null
            'payments.deposit.amount' => ['nullable', 'numeric', 'min:0'], // Allows amount to be missing or null
            'payments.deposit.payment_type' => ['nullable', 'string', Rule::in(['cash', 'bank', 'credit'])], 
            'payments.deposit.credit_account_id' => [
                'nullable', 
                'integer', 
                Rule::exists('chart_of_accounts', 'id'),
                // This correctly only requires the credit account if an amount is present and non-empty
                Rule::requiredIf($this->input('payments.deposit.amount') !== null && $this->input('payments.deposit.amount') !== '')
            ],
            'payments.deposit.debit_target_account_id' => [
                'nullable', 
                'integer', 
                Rule::exists('chart_of_accounts', 'id'),
                // Require if amount is present
                Rule::requiredIf($this->input('payments.deposit.amount') !== null && $this->input('payments.deposit.amount') !== '')
            ],
            'payments.deposit.description' => ['nullable', 'string', 'max:255'],
        ];
    }

    /**
     * Get the error messages for the defined validation rules.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'vehicle_id.required' => 'The vehicle number is required.',
            'vehicle_id.exists' => 'The selected vehicle does not exist.',
            'customer_id.required' => 'The customer name is required.',
            'customer_id.exists' => 'The customer name does not exist.',
            'status_id.required' => 'The vehicle status is required.',
            'status_id.exists' => 'The selected vehicle status is invalid.',
            'activeDeposits.*.deposit_type.required' => 'The deposit type field is required for deposit #:position.',
            'activeDeposits.*.deposit_type.exists' => 'The selected deposit type for deposit #:position does not exist.',
            'activeDeposits.*.deposit_value.required' => 'The deposit value field is required for deposit #:position.',
            'incharger_id.required' => 'The incharge person is required.',
            'incharger_id.exists' => 'The selected incharge person does not exist.',
            'actual_start_date.required' => 'Start date is required.',
            'actual_start_date.date' => 'Start date must be a valid date.',
            'end_date.required' => 'End date is required.',
            'end_date.date' => 'End date must be a valid date.',
            'end_date.after_or_equal' => 'End date must be on or after the start date.',
            'period.required' => 'Rental period is required.',
            'coming_date.date' => 'Coming date must be a valid date.',
            'total_cost.required' => 'Rental cost is required.',
            'total_cost.numeric' => 'Rental cost must be a number.',
            'total_cost.min' => 'Rental cost cannot be negative.',

            // --- PAYMENT MESSAGES ---
            'payments.rental.amount.required' => 'The rental payment amount is required.',
            'payments.rental.amount.same' => 'The rental payment amount must match the total cost (:value).',
            'payments.rental.payment_type.required' => 'The rental payment type is required.',
            'payments.rental.credit_account_id.required' => 'The rental credit account is required.',
            'payments.rental.debit_target_account_id.required' => 'The rental debit account is required.',

            'payments.helmet.amount.required' => 'The helmet payment amount is required.',
            'payments.helmet.amount.same' => 'The helmet payment amount must match the helmet charge (:value).',
            'payments.helmet.payment_type.required' => 'The helmet payment type is required.',
            'payments.helmet.credit_account_id.required' => 'The helmet credit account is required.',
            'payments.helmet.debit_target_account_id.required' => 'The helmet debit account is required.',

            'payments.deposit.credit_account_id.required' => 'The deposit credit account is required when a deposit amount is entered.',
            'payments.deposit.debit_target_account_id.required' => 'The deposit debit account is required when a deposit amount is entered.',
        ];
    }

    /**
     * Get custom attributes for validator errors.
     *
     * @return array<string, string>
     */
    public function attributes(): array
    {
        $attributes = [
            'vehicle_id' => 'vehicle number',
            'customer_id' => 'customer name',
            'incharger_id' => 'incharge person',
            'status_id' => 'vehicle status',
            'actual_start_date' => 'start date',
            'end_date' => 'end date',
            'total_cost' => 'total cost',

            // --- PAYMENT ATTRIBUTES ---
            'payments.rental.amount' => 'rental payment amount',
            'payments.rental.payment_type' => 'rental payment type',
            'payments.rental.credit_account_id' => 'rental credit account',
            'payments.rental.debit_target_account_id' => 'rental debit account',

            'payments.helmet.amount.required_if' => 'The helmet payment amount is required when a helmet charge is present.', // Custom message for required_if
            'payments.helmet.amount.same' => 'The helmet payment amount must match the helmet charge.', // Removed (:value) because it's added automatically
            'payments.helmet.payment_type.required_if' => 'The helmet payment type is required when a helmet charge is present.',
            'payments.helmet.credit_account_id.required_if' => 'The helmet credit account is required when a helmet charge is present.',
            'payments.helmet.debit_target_account_id.required_if' => 'The helmet debit account is required when a helmet charge is present.',

            'payments.deposit.amount' => 'deposit payment amount',
            'payments.deposit.payment_type' => 'deposit payment type',
            'payments.deposit.credit_account_id' => 'deposit credit account',
            'payments.deposit.debit_target_account_id' => 'deposit debit account',
        ];

        if (is_array($this->input('activeDeposits'))) {
            foreach ($this->input('activeDeposits') as $index => $deposit) {
                $depositNumber = $index + 1;
                $attributes["activeDeposits.{$index}.deposit_type"] = "deposit #{$depositNumber} type";
                $attributes["activeDeposits.{$index}.deposit_value"] = "deposit #{$depositNumber} value";
                $attributes["activeDeposits.{$index}.description"] = "deposit #{$depositNumber} description";
                $attributes["activeDeposits.{$index}.is_primary"] = "deposit #{$depositNumber} is primary flag";
            }
        }

        return $attributes;
    }
}