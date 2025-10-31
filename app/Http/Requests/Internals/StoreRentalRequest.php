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

            'payments' => ['required', 'array', 'min:1'],
            'payments.*.description' => ['required', 'string', 'max:255'],
            'payments.*.amount' => ['required', 'numeric', 'min:0'],
            'payments.*.payment_type' => ['required', 'string', Rule::in(['cash', 'bank', 'credit'])],
            'payments.*.credit_account_id' => ['required', 'integer', Rule::exists('chart_of_accounts', 'id')],
            'payments.*.debit_target_account_id' => [
                'required_unless:payments.*.payment_type,cash',
                'nullable',
                'integer',
                Rule::exists('chart_of_accounts', 'id'),
            ],
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
            'payments.required' => 'At least one payment is required.',
            'payments.array' => 'Payments must be a list of payments.',
            'payments.min' => 'At least one payment is required.',
            'payments.*.description.required' => 'The description for payment #:position is required.',
            'payments.*.amount.required' => 'The amount for payment #:position is required.',
            'payments.*.amount.numeric' => 'The amount for payment #:position must be a number.',
            'payments.*.payment_type.required' => 'The payment type for payment #:position is required.',
            'payments.*.credit_account_id.required' => 'The credit account for payment #:position is required.',
            'payments.*.debit_target_account_id.required_unless' => 'The target bank account for payment #:position is required for bank or credit payments.',
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

        if (is_array($this->input('payments'))) {
            foreach ($this->input('payments') as $index => $payment) {
                $paymentNumber = $index + 1;
                $attributes["payments.{$index}.description"] = "payment #{$paymentNumber} description";
                $attributes["payments.{$index}.amount"] = "payment #{$paymentNumber} amount";
                $attributes["payments.{$index}.payment_type"] = "payment #{$paymentNumber} payment type";
                $attributes["payments.{$index}.credit_account_id"] = "payment #{$paymentNumber} credit account";
                $attributes["payments.{$index}.debit_target_account_id"] = "payment #{$paymentNumber} target bank account";
            }
        }

        return $attributes;
    }
}