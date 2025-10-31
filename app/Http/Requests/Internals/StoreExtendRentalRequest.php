<?php

namespace App\Http\Requests\Internals;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

class StoreExtendRentalRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return Auth::user()->can('rental-edit');
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        $payments = $this->input('payments');
        $totalCost = 0;

        if (is_array($payments)) {
            $totalCost = collect($payments)->sum('amount');
        }

        $this->merge([
            'total_cost' => $totalCost,
        ]);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'rental_id' => ['required', 'integer'],
            'incharger_id' => ['required', 'integer', Rule::exists('users', 'id')],
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after_or_equal:start_date'],
            'period' => ['required', 'numeric', 'min:0'],
            'coming_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'total_cost' => 'required|numeric|min:0',
            'notes' => ['nullable', 'string', 'max:2000'],

            'payments' => ['required', 'array', 'min:1'],
            'payments.*.amount' => ['required', 'numeric', 'min:0'],
            'payments.*.credit_account_id' => ['required', 'integer', Rule::exists('chart_of_accounts', 'id')],
            'payments.*.payment_type' => ['required', 'string', Rule::in(['cash', 'bank', 'credit'])],
            'payments.*.debit_target_account_id' => [
                'nullable',
                'required_if:payments.*.payment_type,bank',
                'required_if:payments.*.payment_type,credit',
                'integer',
                Rule::exists('chart_of_accounts', 'id'),
            ],
            'payments.*.description' => ['nullable', 'string', 'max:255'],
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
            'rental_id.required' => 'No rental is matched. Please re-check the vehicle status.',
            'rental_id.integer' => 'Selected rental is invalid. Please re-check the vehicle status.',
            'incharger_id.required' => 'The incharge person is required.',
            'incharger_id.exists' => 'The selected incharge person does not exist.',
            
            'start_date.required' => 'Start date is required.',
            'start_date.date' => 'Start date must be a valid date.',
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
            'payments.*.debit_target_account_id.required_if' => 'The target bank account for payment #:position is required for bank or credit payments.',
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
            'rental_id' => 'rental transaction',
            'incharger_id' => 'incharge person',
            'start_date' => 'start date',
            'end_date' => 'end date',
            'total_cost' => 'total cost',
        ];

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
