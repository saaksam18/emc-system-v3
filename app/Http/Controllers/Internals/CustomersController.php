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
use Illuminate\Database\Eloquent\Builder;

// Model
use App\Models\Customers;
use App\Models\User;

// Auth
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Foundation\Validation\ValidatesRequests;

class CustomersController extends Controller
{
    use AuthorizesRequests, ValidatesRequests;

    public function index(): Response
    {
        $customers = Customers::all();
        $formattedCustomers = $customers->map(function (Customers $customer) {
            $customerName = trim(($customer->first_name ?? '') . ' ' . ($customer->last_name ?? ''));
            $customerAddress = trim(($customer->address_line_1 ?? '') . ', ' . ($customer->address_line_2 ?? '') . ', ' . ($customer->city ?? '') . ', ' . ($customer->state_province ?? '') . ', ' . ($customer->country ?? ''));
            return [
                'id' => $customer->id,
                'name' => $customerName ?: 'N/A',
                'date_of_birth' => $customer->date_of_birth ?? 'N/A',
                'email' => $customer->email ?? 'N/A',
                'phone_number' => $customer->phone_number ?? 'N/A',
                'address' => $customerAddress ?: 'N/A',
                'passport_number' => $customer->passport_number ?? 'N/A',
                'passport_expiry' => $customer->passport_expiry  ?? 'N/A',
                'notes' => $customer->notes  ?? 'N/A',
                'user_name' => $customer->creator?->name ?? 'Initial',
                'created_at' => $customer->created_at,
                'updated_at' => $customer->updated_at,
            ];
        });
        return Inertia::render('customers/customers-index', [
            'customers' => Inertia::defer(fn () => $formattedCustomers),
        ]);
    }
}
