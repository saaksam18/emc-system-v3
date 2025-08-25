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

    /**
     * Display the Profit & Loss Statement.
     */
    public function profitLoss(Request $request)
    {
        // Default to current month if no dates are provided
        $startDate = $request->input('start_date', Carbon::now()->startOfMonth()->toDateString());
        $endDate = $request->input('end_date', Carbon::now()->endOfMonth()->toDateString());

        // Get all relevant accounts (Revenue and Expense types)
        $revenueExpenseAccounts = ChartOfAccounts::whereIn('type', ['Revenue', 'Expense'])
                                                ->get();
        // Initialize balances for these accounts
        $accountBalances = [];
        foreach ($revenueExpenseAccounts as $account) {
            $accountBalances[$account->id] = [
                'id' => $account->id,
                'name' => $account->name,
                'type' => $account->type,
                'balance' => 0.00, // Net balance for the period
            ];
        }

        // Fetch all transactions within the period for Revenue and Expense accounts
        $transactions = Transaction::whereBetween('transaction_date', [$startDate, $endDate])
                                            ->where(function ($query) use ($revenueExpenseAccounts) {
                                                $accountIds = $revenueExpenseAccounts->pluck('id')->toArray();
                                                $query->whereIn('debit_account_id', $accountIds)
                                                      ->orWhereIn('credit_account_id', $accountIds);
                                            })
                                            ->get();

        foreach ($transactions as $transaction) {
            // Debit side processing
            if (isset($accountBalances[$transaction->debit_account_id])) {
                $account = $accountBalances[$transaction->debit_account_id];
                // CHANGE HERE: access ->value
                if ($account['type']->value === 'Expense') {
                    $accountBalances[$transaction->debit_account_id]['balance'] += $transaction->amount;
                } elseif ($account['type']->value === 'Revenue') { // CHANGE HERE: access ->value
                    $accountBalances[$transaction->debit_account_id]['balance'] -= $transaction->amount;
                }
            }

            // Credit side processing
            if (isset($accountBalances[$transaction->credit_account_id])) {
                $account = $accountBalances[$transaction->credit_account_id];
                // CHANGE HERE: access ->value
                if ($account['type']->value === 'Expense') {
                    $accountBalances[$transaction->credit_account_id]['balance'] -= $transaction->amount;
                } elseif ($account['type']->value === 'Revenue') { // CHANGE HERE: access ->value
                    $accountBalances[$transaction->credit_account_id]['balance'] += $transaction->amount;
                }
            }
        }

        $revenues = collect($accountBalances)->filter(fn($acc) => $acc['type']->value === 'Revenue' && $acc['balance'] != 0) // <-- ENSURE .value IS HERE
                                    ->sortBy('name')
                                    ->values()
                                    ->toArray();
        $totalRevenue = array_sum(array_column($revenues, 'balance'));

        $expenses = collect($accountBalances)->filter(fn($acc) => $acc['type']->value === 'Expense' && $acc['balance'] != 0) // <-- ENSURE .value IS HERE
                                            ->sortBy('name')
                                            ->values()
                                            ->toArray();
        $totalExpense = array_sum(array_column($expenses, 'balance'));

        $netProfitLoss = $totalRevenue - $totalExpense;

        return Inertia::render('accountings/profit-loss', [
            'profitAndLoss' => [
                'revenues' => $revenues,
                'totalRevenue' => $totalRevenue,
                'expenses' => $expenses,
                'totalExpense' => $totalExpense,
                'netProfitLoss' => $netProfitLoss,
            ],
            'startDate' => $startDate,
            'endDate' => $endDate,
            'flash' => [
                'success' => session('success'),
                'error' => session('error'),
                'errors' => session('errors') ? (object) session('errors') : null,
            ],
        ]);
    }

    /**
     * Generates the Balance Sheet report.
     *
     * @param Request $request
     * @return \Inertia\Response
     */
    public function balanceSheet(Request $request)
    {
        // Get the "As Of" Date for the Balance Sheet snapshot
        // Defaults to today's date if not provided in the request
        $asOfDate = $request->input('as_of_date', Carbon::now()->toDateString());

        // Fetch all Chart of Accounts that are classified as Assets, Liabilities, or Equity
        $balanceSheetAccounts = ChartOfAccounts::whereIn('type', ['Asset', 'Liability', 'Equity'])
                                                ->get();

        // Initialize a dictionary to hold the calculated balance for each relevant account
        $accountBalances = [];
        foreach ($balanceSheetAccounts as $account) {
            $accountBalances[$account->id] = [
                'id' => $account->id,
                'name' => $account->name,
                'type' => $account->type, // This is an App\AccountType object/enum
                'balance' => 0.00, // All balances start at zero
            ];
        }

        // Fetch ALL relevant accounting transactions from the beginning of records
        // up to and including the 'asOfDate'. The Balance Sheet is cumulative.
        $transactions = Transaction::where('transaction_date', '<=', $asOfDate)
                                            ->where(function ($query) use ($balanceSheetAccounts) {
                                                // Only consider transactions involving Balance Sheet accounts
                                                $accountIds = $balanceSheetAccounts->pluck('id')->toArray();
                                                $query->whereIn('debit_account_id', $accountIds)
                                                      ->orWhereIn('credit_account_id', $accountIds);
                                            })
                                            ->orderBy('transaction_date') // Process in chronological order
                                            ->get();

        // Process each transaction to update account balances
        foreach ($transactions as $transaction) {
            // Impact of the Debit side of the transaction
            if (isset($accountBalances[$transaction->debit_account_id])) {
                $account = $accountBalances[$transaction->debit_account_id];
                $type = $account['type']->value; // Access the string value of the AccountType enum/object

                if ($type === 'Asset') {
                    // Debit to an Asset account increases its balance
                    $accountBalances[$transaction->debit_account_id]['balance'] += $transaction->amount;
                } elseif (in_array($type, ['Liability', 'Equity'])) {
                    // Debit to a Liability or Equity account decreases its balance
                    $accountBalances[$transaction->debit_account_id]['balance'] -= $transaction->amount;
                }
            }

            // Impact of the Credit side of the transaction
            if (isset($accountBalances[$transaction->credit_account_id])) {
                $account = $accountBalances[$transaction->credit_account_id];
                $type = $account['type']->value; // Access the string value of the AccountType enum/object

                if (in_array($type, ['Liability', 'Equity'])) {
                    // Credit to a Liability or Equity account increases its balance
                    $accountBalances[$transaction->credit_account_id]['balance'] += $transaction->amount;
                } elseif ($type === 'Asset') {
                    // Credit to an Asset account decreases its balance
                    $accountBalances[$transaction->credit_account_id]['balance'] -= $transaction->amount;
                }
            }
        }

        // --- Crucial Linkage: Incorporating Net Profit/Loss into Equity (Retained Earnings) ---
        // The Net Profit/Loss from the company's inception up to the 'asOfDate'
        // is added to the Equity section of the Balance Sheet.

        // Fetch accounts relevant for P&L calculation (Revenue and Expense)
        $profitLossAccounts = ChartOfAccounts::whereIn('type', ['Revenue', 'Expense'])->get();

        // Fetch all P&L related transactions up to the 'asOfDate'
        $profitLossTransactions = Transaction::where('transaction_date', '<=', $asOfDate)
                                                    ->where(function ($query) use ($profitLossAccounts) {
                                                        $accountIds = $profitLossAccounts->pluck('id')->toArray();
                                                        $query->whereIn('debit_account_id', $accountIds)
                                                              ->orWhereIn('credit_account_id', $accountIds);
                                                    })
                                                    ->get();

        $currentPeriodRevenue = 0;
        $currentPeriodExpense = 0;

        // Calculate the cumulative Net Profit/Loss
        foreach ($profitLossTransactions as $transaction) {
            // Debit side impact on P&L accounts
            if ($profitLossAccounts->firstWhere('id', $transaction->debit_account_id)?->type->value === 'Expense') {
                $currentPeriodExpense += $transaction->amount;
            } elseif ($profitLossAccounts->firstWhere('id', $transaction->debit_account_id)?->type->value === 'Revenue') {
                $currentPeriodRevenue -= $transaction->amount; // Debit to Revenue reduces it (e.g., sales return)
            }

            // Credit side impact on P&L accounts
            if ($profitLossAccounts->firstWhere('id', $transaction->credit_account_id)?->type->value === 'Revenue') {
                $currentPeriodRevenue += $transaction->amount; // Credit to Revenue increases it
            } elseif ($profitLossAccounts->firstWhere('id', $transaction->credit_account_id)?->type->value === 'Expense') {
                $currentPeriodExpense -= $transaction->amount; // Credit to Expense reduces it (e.g., expense refund)
            }
        }

        $netProfitLoss = $currentPeriodRevenue - $currentPeriodExpense;

        // Identify the Retained Earnings or primary Owner's Equity account
        // Based on your Chart of Accounts, ID 8 is "Owner's Equity"
        $retainedEarningsAccountId = 8; // **IMPORTANT: Adjust this if your ID is different**

        // Add the Net Profit/Loss to the balance of the Retained Earnings account
        if (isset($accountBalances[$retainedEarningsAccountId])) {
            $accountBalances[$retainedEarningsAccountId]['balance'] += $netProfitLoss;
        } else {
            // Edge case: If the retained earnings account didn't have any direct transactions
            // and wasn't included initially, find it and add it with the net profit/loss.
            $retainedEarningsAccount = ChartOfAccounts::find($retainedEarningsAccountId);
            if ($retainedEarningsAccount) {
                $accountBalances[$retainedEarningsAccountId] = [
                    'id' => $retainedEarningsAccount->id,
                    'name' => $retainedEarningsAccount->name,
                    'type' => $retainedEarningsAccount->type,
                    'balance' => $netProfitLoss,
                ];
            }
        }

        // 6. Categorize accounts and sum their total balances for display
        // Filter out accounts with zero balances for cleaner display, and sort by name.
        $assets = collect($accountBalances)
                    ->filter(fn($acc) => $acc['type']->value === 'Asset' && round((float)$acc['balance'], 2) != 0.00)
                    ->sortBy('name')
                    ->values()
                    ->toArray();
        $totalAssets = array_sum(array_column($assets, 'balance'));

        $liabilities = collect($accountBalances)
                        ->filter(fn($acc) => $acc['type']->value === 'Liability' && round((float)$acc['balance'], 2) != 0.00)
                        ->sortBy('name')
                        ->values()
                        ->toArray();
        $totalLiabilities = array_sum(array_column($liabilities, 'balance'));

        // Handle the Equity accounts, ensuring Retained Earnings is correctly reflected
        $equity = collect($accountBalances)
                    ->filter(fn($acc) => $acc['type']->value === 'Equity' && round((float)$acc['balance'], 2) != 0.00)
                    ->sortBy('name')
                    ->values()
                    ->toArray();
        $totalEquity = array_sum(array_column($equity, 'balance'));


        // 7. Render the Inertia view, passing the calculated data as props
        return Inertia::render('accountings/balance-sheet', [
            'balanceSheet' => [
                'assets' => $assets,
                'totalAssets' => $totalAssets,
                'liabilities' => $liabilities,
                'totalLiabilities' => $totalLiabilities,
                'equity' => $equity,
                'totalEquity' => $totalEquity,
                'netProfitLossComponent' => $netProfitLoss // Pass for frontend verification/debugging
            ],
            'asOfDate' => $asOfDate,
            // Flash messages for success/error notifications
            'flash' => [
                'success' => session('success'),
                'error' => session('error'),
                'errors' => session('errors') ? (object) session('errors') : null,
            ],
        ]);
    }

    /**
     * Displays the detailed general ledger for a specific account.
     * Allows filtering by date range.
     *
     * @param Request $request
     * @param int $accountId The ID of the ChartOfAccount to view.
     * @return \Inertia\Response
     */
    public function accountLedgerDetail(Request $request, int $accountId)
    {
        // 1. Validate the account exists
        $account = ChartOfAccounts::find($accountId);
        if (!$account) {
            // Handle account not found, perhaps redirect with an error message
            return redirect()->back()->with('error', 'Account not found.');
        }

        // 2. Get the date range for filtering transactions
        $startDate = $request->input('start_date', Carbon::now()->startOfYear()->toDateString());
        $endDate = $request->input('end_date', Carbon::now()->endOfYear()->toDateString());
        $page = $request->input('page', 1); // For pagination

        // 3. Fetch transactions related to this account within the date range
        // We need transactions where this account is either the debit or the credit side.
        $transactions = Transaction::whereBetween('transaction_date', [$startDate, $endDate])
            ->where(function ($query) use ($accountId) {
                $query->where('debit_account_id', $accountId)
                      ->orWhere('credit_account_id', $accountId);
            })
            ->with(['debitAccount', 'creditAccount', 'type']) // Eager load related account names and transaction type
            ->orderBy('transaction_date', 'asc') // Order by date ascending
            ->orderBy('id', 'asc') // Then by ID to ensure consistent order for same-day transactions
            ->paginate(15); // Paginate the results (adjust per page as needed)

        // 4. Calculate the opening balance for the account *before* the startDate
        // This gives context to the transactions shown in the period.
        $openingBalance = 0.00;
        $priorTransactions = Transaction::where('transaction_date', '<', $startDate)
            ->where(function ($query) use ($accountId) {
                $query->where('debit_account_id', $accountId)
                      ->orWhere('credit_account_id', $accountId);
            })
            ->get();

        foreach ($priorTransactions as $transaction) {
            // If the account is on the debit side:
            // Assets & Expenses increase with debit
            // Liabilities & Equity decrease with debit
            if ($transaction->debit_account_id === $accountId) {
                if ($account->type->value === 'Asset' || $account->type->value === 'Expense') {
                    $openingBalance += $transaction->amount;
                } else { // Liability, Equity, Revenue
                    $openingBalance -= $transaction->amount;
                }
            }
            // If the account is on the credit side:
            // Liabilities, Equity & Revenue increase with credit
            // Assets & Expenses decrease with credit
            elseif ($transaction->credit_account_id === $accountId) {
                 if ($account->type->value === 'Liability' || $account->type->value === 'Equity' || $account->type->value === 'Revenue') {
                    $openingBalance += $transaction->amount;
                } else { // Asset, Expense
                    $openingBalance -= $transaction->amount;
                }
            }
        }

        // 5. Calculate a running balance for the transactions in the current view
        $runningBalance = $openingBalance;
        $formattedTransactions = $transactions->through(function ($transaction) use (&$runningBalance, $accountId, $account) {
            // Determine debit/credit for *this specific account* based on its type
            $debit = null;
            $credit = null;

            // Impact on the balance for the ACCOUNT WE ARE VIEWING
            if ($transaction->debit_account_id === $accountId) {
                $debit = $transaction->amount;
                if ($account->type->value === 'Asset' || $account->type->value === 'Expense') {
                    $runningBalance += $transaction->amount;
                } else { // Liability, Equity, Revenue
                    $runningBalance -= $transaction->amount;
                }
            } elseif ($transaction->credit_account_id === $accountId) {
                $credit = $transaction->amount;
                if ($account->type->value === 'Liability' || $account->type->value === 'Equity' || $account->type->value === 'Revenue') {
                    $runningBalance += $transaction->amount;
                } else { // Asset, Expense
                    $runningBalance -= $transaction->amount;
                }
            }

            return [
                'id' => $transaction->id,
                'transaction_date' => $transaction->transaction_date,
                'description' => $transaction->description,
                'debit_account_name' => $transaction->debitAccount->name,
                'credit_account_name' => $transaction->creditAccount->name,
                'transaction_type_name' => $transaction->transactionType->name ?? 'N/A',
                'amount' => $transaction->amount,
                'debit' => $debit, // Amount if it was a debit to THIS account
                'credit' => $credit, // Amount if it was a credit to THIS account
                'running_balance' => $runningBalance,
            ];
        });

        // 6. Return data to the Inertia frontend
        return Inertia::render('accountings/account-ledger', [
            'account' => [
                'id' => $account->id,
                'name' => $account->name,
                'type' => $account->type->value, // Pass the string value
            ],
            'transactions' => $formattedTransactions, // Paginated collection
            'dateRange' => [
                'startDate' => $startDate,
                'endDate' => $endDate,
            ],
            'openingBalance' => $openingBalance,
            'flash' => [
                'success' => session('success'),
                'error' => session('error'),
                'errors' => session('errors') ? (object) session('errors') : null,
            ],
        ]);
    }
}
