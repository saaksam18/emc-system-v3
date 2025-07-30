<?php

namespace App\Http\Controllers\Accountings;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Exception;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Inertia\Response;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

// Auth
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Foundation\Validation\ValidatesRequests;

// Model
use App\Models\Customers;
use App\Models\Contacts\Types;
use App\Models\Accountings\ChartOfAccounts;
use App\Models\Accountings\Transaction;
use App\Models\Accountings\Sale;

class SalesEntryController extends Controller
{
    use AuthorizesRequests, ValidatesRequests;
    
    public function index(Request $request): Response
    {
        $userId = Auth::id() ?? 'guest';
        Log::info("User [ID: {$userId}] attempting to access sales entry page.");

        try {
            // Assuming 'dashboard-list' is the permission needed for this data
            $this->authorize('sales-list');
            Log::info("User [ID: {$userId}] authorized to access sales entry page.");

            $customers = Customers::select('id', 'first_name', 'last_name')->orderBy('id', 'desc')->get();
            $formattedCustomers = $customers->map(function (Customers $customer) { // Changed variable name for clarity
                $firstName = $customer->first_name ?? '';
                $lastName = $customer->last_name ?? '';
                // Concatenate with a space, handle cases where one or both might be empty
                $full_name = trim($firstName . ' ' . $lastName);
                // If the result is an empty string after trimming, set to 'N/A'
                if (empty($full_name)) {
                    $full_name = 'N/A';
                }
                return [
                    'id' => $customer->id,
                    'name' => $customer->full_name,
                ];
            });

            $contactTypes = Types::with('creator:id,name', 'contacts')
                ->where('is_active', true)
                ->orderBy('name', 'asc')
                ->get();
            $formattedContactTypes = $contactTypes->map(function (Types $contactType) {
                return [
                    'id' => $contactType->id,
                    'name' => $contactType->name,
                ];
            });

            // Fetch existing transactions with their related debit/credit accounts
            $sales = Sale::with('creator')
                        ->whereDate('created_at', now())
                        ->orderBy('id', 'desc')
                        ->get();

            $formattedSales = $sales->map(function ($sale) {
                $paymentType = null;
                if ($sale->payment_type === 'cash') {
                    $paymentType = 'Cash';
                } elseif ($sale->payment_type === 'bank') {
                    $paymentType = 'Bank Transfer';
                } elseif ($sale->payment_type === 'credit') {
                    $paymentType = 'On Credit';
                } else {
                    $paymentType = 'N/A';
                }
                return [
                    'id' => $sale->id,
                    'sale_no' => $sale->sale_no ?? 'N/A',
                    'sale_date' => $sale->sale_date ?? 'N/A',
                    'customer_name' => $sale->customer_name ?? 'N/A',
                    'item_description' => $sale->item_description ?? 'N/A',
                    'memo_ref_no' => $sale->memo_ref_no ?? 'N/A',
                    'amount' => $sale->amount ?? 'N/A',
                    'payment_type' => $paymentType,
                    'user_name' => $sale->creator->name,
                    'created_at' => $sale->created_at?->toISOString(),
                    'updated_at' => $sale->updated_at?->toISOString(),
                ];
            });
                  
            $chartOfAccounts = ChartOfAccounts::orderBy('name')->get()->toArray();
            return Inertia::render('accountings/sales-entry', [
                'customers' => $formattedCustomers,
                'contactTypes' => Inertia::defer(fn () => $formattedContactTypes),
                'chartOfAccounts' => $chartOfAccounts,
                'sales' => Inertia::defer(fn () => $formattedSales),

            ]);

        } catch (AuthorizationException $e) {
            Log::warning("Authorization failed for User [ID: {$userId}] accessing sales entry page: " . $e->getMessage());
            abort(403, 'Unauthorized action.');
        } catch (Exception $e) {
            Log::error("Error accessing sales entry page for User [ID: {$userId}]: " . $e->getMessage(), ['exception' => $e]);
            //abort(500, 'Could not load general ledger data.');
        }
    }

    public function store(Request $request)
    {
        $userId = Auth::id() ?? 'guest';
        Log::info("User [ID: {$userId}] attempting to store a new sale transaction.");

        try {

            $this->authorize('sales-create');
            Log::info("User [ID: {$userId}] authorized for creating sale transaction.");
            
            $fullName = $request->customer_name;

            // --- Define Validation Rules ---
            $rules = [
                'sale_date' => ['required', 'date'],
                'customer_name' => [
                    'required',
                    'string',
                    function ($attribute, $value, $fail) {
                        if (!Customers::whereRaw("CONCAT(first_name, ' ', last_name) = ?", [$value])->exists()) {
                            $fail("The selected customer does not exist.");
                        }
                    }
                ],
                'item_description' => ['required', 'string', 'max:255'],
                'memo_ref_no' => ['nullable', 'string', 'max:255'],
                'amount' => ['required', 'numeric', 'min:0.01'],
                'payment_type' => ['required', 'in:cash,bank,credit'], // 'credit' is still a valid *payment_type*
                'credit_account_id' => ['required', 'exists:chart_of_accounts,id'],
                // `debit_target_account_id` is required if payment_type is 'bank' or 'credit'
                'debit_target_account_id' => [
                    'nullable',
                    'sometimes',
                    'required_if:payment_type,bank',
                    'required_if:payment_type,credit',
                    'exists:chart_of_accounts,id',
                ],
            ];
            // --- Custom Error Messages ---
            $messages = [
                // Sale date
                'sale_date.required' => 'The transaction date is required.',
                'sale_date.date' => 'The transaction date must be a date.',
                // Customer
                'customer_name.required' => 'The customer name is required.',
                'customer_name.string' => 'The customer name must be a string.',

                'item_description.required' => 'The item description is required.',
                'payment_type.required' => 'The item payment type is required.',

                'credit_account_id.required' => 'The credit account is required.',
                'credit_account_id.exists' => 'The credit account does not exist.',

                // Pricing
                'amount.required' => 'The amount is required.'
            ];
            // --- Define custom attributes for better error messages ---
            $attributes = [
                'sale_date' => 'transaction date',
                'customer_name' => 'customer name',
                'item_description' => 'item description',
                'payment_type' => 'payment type',
                'debit_account_id' => 'debit account',
                'credit_account_id' => 'credit account',
                'amount' => 'amount',
            ];

            // --- Validate the request data ---
            $validatedData = $request->validate($rules, $messages, $attributes);

            DB::beginTransaction();

            $lastSale = Sale::orderByDesc('id')->first();
            $nextSaleNo = 'SALE-' . str_pad(($lastSale ? $lastSale->id : 0) + 1, 4, '0', STR_PAD_LEFT);

            $customer = Customers::whereRaw("CONCAT(first_name, ' ', last_name) = ?", [$fullName])->firstOrFail();

            $sale = Sale::create([
                'sale_no' => $nextSaleNo,
                'sale_date' => $validatedData['sale_date'],
                'customer_id' => $customer->id,
                'item_description' => $validatedData['item_description'],
                'memo_ref_no' => $validatedData['memo_ref_no'],
                'amount' => $validatedData['amount'],
                'payment_type' => $validatedData['payment_type'],
                'user_id' => $userId,
            ]);

            // Determine Debit Account based on Payment Type and selected specific account
            $debitAccountId = null;
            if ($validatedData['payment_type'] === 'cash') {
                $cashAccount = ChartOfAccounts::where('name', 'Cash')->first();
                if (!$cashAccount) {
                    throw new \Exception('Cash account not found. Please ensure it exists in your Chart of Accounts with type "Asset".');
                }
                $debitAccountId = $cashAccount->id;
            } elseif ($validatedData['payment_type'] === 'bank' || $validatedData['payment_type'] === 'credit') {
                // For 'bank' or 'credit', use the explicitly selected debit_target_account_id
                $selectedDebitAccount = ChartOfAccounts::find($validatedData['debit_target_account_id']);

                if (!$selectedDebitAccount) {
                    throw new \Exception('Selected Bank account not found.');
                }

                // Ensure the selected account is indeed a bank asset account
                if (!($selectedDebitAccount->type->name === 'Asset' && str_contains($selectedDebitAccount->name, 'Bank'))) {
                    throw new \Exception('Selected account for Bank/Credit payment must be a valid Bank Asset account.');
                }

                $debitAccountId = $selectedDebitAccount->id;
            } else {
                 throw new \Exception('Invalid payment type selected.');
            }

            // Get the selected Credit Account (Income Account)
            $creditAccount = ChartOfAccounts::find($validatedData['credit_account_id']);
            if (!$creditAccount || $creditAccount->type->name !== "Revenue") {
                 throw new \Exception('Invalid Income Account selected. Please select a Revenue type account.');
            }

            $lastTransaction = Transaction::latest('id')->first();
            $lastId = $lastTransaction ? $lastTransaction->id : 0;
            $transactionNo = 'GL-' . str_pad($lastId + 1, 3, '0', STR_PAD_LEFT);

            while (Transaction::where('transaction_no', $transactionNo)->exists()) {
                $lastId++;
                $transactionNo = 'GL-' . str_pad($lastId + 1, 3, '0', STR_PAD_LEFT);
            }

            Transaction::create([
                'transaction_no' => $transactionNo,
                'transaction_date' => $validatedData['sale_date'],
                'item_description' => 'Sale to ' . $validatedData['customer_name'] . ' - ' . $validatedData['item_description'],
                'memo_ref_no' => $validatedData['memo_ref_no'] ?? $nextSaleNo,
                'debit_account_id' => $debitAccountId, // Use the dynamically determined debit account ID
                'credit_account_id' => $creditAccount->id,
                'amount' => $validatedData['amount'],
                'sale_id' => $sale->id,
                'user_id' => $userId,
            ]);

            DB::commit();

            return redirect()->route('sales-entry.index')->with('success', 'Sale recorded successfully!');

        } catch (ValidationException $e) {
            DB::rollBack();
            return redirect()->back()->withErrors($e->errors())->withInput();
        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()->with('error', $e->getMessage())->withInput();
        }
    }
}
