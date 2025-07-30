<?php

namespace App\Http\Controllers\Accountings;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Response;
use Inertia\Inertia;
use Carbon\Carbon;
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
use App\Models\Accountings\ChartOfAccounts;
use App\Models\Accountings\Transaction;

class GeneralLedgerController extends Controller
{
    use AuthorizesRequests, ValidatesRequests;

    public function index(Request $request)
    {
        $userId = Auth::id() ?? 'guest';
        Log::info("User [ID: {$userId}] attempting to fetch chart of account data from API ChartOfAccountController.");

        try {
            // Assuming 'dashboard-list' is the permission needed for this data
            $this->authorize('accounting-list');
            Log::info("User [ID: {$userId}] authorized for fetching chart of account data.");

            // Fetch existing transactions with their related debit/credit accounts
            $transactions = Transaction::with(['debitAccount', 'creditAccount', 'creator'])
                                    //->whereDate('created_at', now())
                                    ->orderBy('id', 'desc')
                                    ->get();

            $formattedTransactions = $transactions->map(function ($transaction) {
                return [
                    'id' => $transaction->id,
                    'transaction_no' => $transaction->transaction_no ?? 'N/A',
                    'transaction_date' => $transaction->transaction_date ?? 'N/A',
                    'item_description' => $transaction->item_description ?? 'N/A',
                    'memo_ref_no' => $transaction->memo_ref_no ?? 'N/A',
                    'debit_account' => $transaction->debitAccount->name ?? 'N/A',
                    'debit_account_id' => $transaction->debit_account_id ?? 'N/A',
                    'credit_account' => $transaction->creditAccount->name ?? 'N/A',
                    'credit_account_id' => $transaction->credit_account_id ?? 'N/A',
                    'amount' => $transaction->amount ?? 'N/A',
                    'user_name' => $transaction->creator->name,
                    'created_at' => $transaction->created_at?->toISOString(),
                    'updated_at' => $transaction->updated_at?->toISOString(),
                ];
            });
                  
            $chartOfAccounts = ChartOfAccounts::orderBy('name')->get()->toArray();

            return Inertia::render('accountings/general-ledgers/general-ledger', [
                'chartOfAccounts' => $chartOfAccounts,
                'transactions' => $formattedTransactions,

            ]);

        } catch (AuthorizationException $e) {
            Log::warning("Authorization failed for User [ID: {$userId}] accessing General Ledger: " . $e->getMessage()); // Changed from Sales Entry
            abort(403, 'Unauthorized action.');
        } catch (Exception $e) {
            Log::error("Error accessing General Ledger for User [ID: {$userId}]: " . $e->getMessage(), ['exception' => $e]); // Changed from Sales Entry
            abort(500, 'Could not load general ledger data.');
        }
    }

    public function store(Request $request)
    {
        $userId = Auth::id() ?? 'guest';
        Log::info("User [ID: {$userId}] attempting to store a new general ledger transaction.");

        try {
            $this->authorize('accounting-create');
            Log::info("User [ID: {$userId}] authorized for create general ledger transaction data.");

            // --- Define Validation Rules ---
            $rules = [
                'transaction_date' => ['required', 'date'],
                'item_description' => ['required', 'string', 'max:255'],
                'memo_ref_no' => ['nullable', 'string', 'max:255'],
                'debit_account_id' => ['required', 'exists:chart_of_accounts,id'],
                'credit_account_id' => ['required', 'exists:chart_of_accounts,id', 'different:debit_account_id'],
                'amount' => ['required', 'numeric', 'min:0.01'],
            ];
            // --- Custom Error Messages ---
            $messages = [
                // Customer
                'transaction_date.required' => 'The transaction date is required.',
                'transaction_date.date' => 'The transaction date must be a date.',

                // Incharger
                'item_description.required' => 'The item description is required.',

                'debit_account_id.required' => 'The debit account is required.',
                'debit_account_id.exists' => 'The debit account does not exist.',

                'credit_account_id.required' => 'The credit account is required.',
                'credit_account_id.exists' => 'The credit account does not exist.',

                // Passport and Visa Data
                'amount.required' => 'The amount is required.'
            ];
            // --- Define custom attributes for better error messages ---
            $attributes = [
                'transaction_date' => 'transaction date',
                'item_description' => 'item description',
                'debit_account_id' => 'debit account',
                'credit_account_id' => 'credit account',
                'amount' => 'amount',
            ];

            // --- Validate the request data ---
            $validatedData = $request->validate($rules, $messages, $attributes);

            // Generate a unique transaction number (simple example, you might need a more robust one)
            // Find the last transaction number and increment it.
            $lastTransaction = Transaction::latest('id')->first();
            $lastId = $lastTransaction ? $lastTransaction->id : 0;
            $transactionNo = 'GL-' . str_pad($lastId + 1, 3, '0', STR_PAD_LEFT);

            // Ensure uniqueness for transaction_no, though it's already unique in migration
            // This is more for the generation logic than the DB constraint itself
            while (Transaction::where('transaction_no', $transactionNo)->exists()) {
                $lastId++;
                $transactionNo = 'GL-' . str_pad($lastId + 1, 3, '0', STR_PAD_LEFT);
            }

            $transaction = Transaction::create([
                'transaction_no' => $transactionNo,
                'transaction_date' => $validatedData['transaction_date'],
                'item_description' => $validatedData['item_description'],
                'memo_ref_no' => $validatedData['memo_ref_no'],
                'debit_account_id' => $validatedData['debit_account_id'],
                'credit_account_id' => $validatedData['credit_account_id'],
                'user_id' => $userId,
                'amount' => $validatedData['amount'],
            ]);
            // Redirect back or return a response for Inertia.js
            return redirect()->route('general-ledger.index')->with('success', 'Transaction recorded successfully!');

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
    

    /**
     * Remove the specified transaction from storage.
     */
    public function destroy(Transaction $transaction)
    {
        $transaction->delete();
        return redirect()->route('general-ledger.index')->with('success', 'Transaction deleted successfully!');
    }

    /**
     * Display the Trial Balance.
     */
    public function trialBalance(Request $request)
    {
        // Default to today's date if not provided
        $asOfDate = $request->input('as_of_date', Carbon::today()->toDateString());
        $asOfCarbon = Carbon::parse($asOfDate);

        // Get all accounts from ChartOfAccount
        $accounts = ChartOfAccounts::all();

        // Initialize balances for all accounts
        $accountBalances = [];
        foreach ($accounts as $account) {
            $accountBalances[$account->id] = [
                'id' => $account->id,
                'name' => $account->name,
                'type' => $account->type,
                'debit_balance' => 0.00,
                'credit_balance' => 0.00,
            ];
        }

        // Fetch all transactions up to the asOfDate
        $transactions = Transaction::where('transaction_date', '<=', $asOfCarbon)
                                          ->get();

        // Calculate balances
        foreach ($transactions as $transaction) {
            // Debit side
            if (isset($accountBalances[$transaction->debit_account_id])) {
                $accountBalances[$transaction->debit_account_id]['debit_balance'] += $transaction->amount;
            }

            // Credit side
            if (isset($accountBalances[$transaction->credit_account_id])) {
                $accountBalances[$transaction->credit_account_id]['credit_balance'] += $transaction->amount;
            }
        }

        // Determine final net debit/credit for each account
        $trialBalanceData = collect($accountBalances)->map(function ($balance) {
            $netBalance = $balance['debit_balance'] - $balance['credit_balance'];

            // Assign to debit_balance or credit_balance based on account type's normal balance
            // Asset, Expense (normal debit balance)
            if (in_array($balance['type'], ['Asset', 'Expense'])) {
                if ($netBalance >= 0) {
                    $balance['debit_balance'] = $netBalance;
                    $balance['credit_balance'] = 0.00;
                } else {
                    $balance['debit_balance'] = 0.00;
                    $balance['credit_balance'] = abs($netBalance); // Should not typically happen for normal debits unless it's an contra account or error
                }
            }
            // Liability, Equity, Revenue (normal credit balance)
            elseif (in_array($balance['type'], ['Liability', 'Equity', 'Revenue'])) {
                if ($netBalance <= 0) {
                    $balance['debit_balance'] = 0.00;
                    $balance['credit_balance'] = abs($netBalance);
                } else {
                    $balance['debit_balance'] = $netBalance; // Should not typically happen for normal credits unless it's a contra account or error
                    $balance['credit_balance'] = 0.00;
                }
            } else {
                // For unclassified types, just show net balance
                if ($netBalance >= 0) {
                    $balance['debit_balance'] = $netBalance;
                    $balance['credit_balance'] = 0.00;
                } else {
                    $balance['debit_balance'] = 0.00;
                    $balance['credit_balance'] = abs($netBalance);
                }
            }

            return $balance;
        })->values()->sortBy('name')->values()->toArray(); // Convert to array and sort by name

        return Inertia::render('accountings/trial-balance', [ // This will be your new React component
            'trialBalance' => $trialBalanceData,
            'asOfDate' => $asOfCarbon->format('Y-m-d'),
            'flash' => [
                'success' => session('success'),
                'error' => session('error'),
                'errors' => session('errors') ? (object) session('errors') : null,
            ],
        ]);
    }
}
