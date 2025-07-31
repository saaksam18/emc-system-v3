<?php

namespace App\Http\Controllers\Accountings;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Response;
use Inertia\Inertia;
use Exception;
use Illuminate\Support\Facades\DB;
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
use App\Models\Accountings\Expense;
use App\Models\Accountings\Transaction;
use App\Models\Accountings\ChartOfAccounts;
use App\Models\Accountings\Vendor;

class ExpensesController extends Controller
{

    use AuthorizesRequests, ValidatesRequests;

    public function index()
    {
        $expenses = Expense::with('vendor', 'creator')
                            ->orderBy('expense_date', 'desc')
                           ->orderBy('id', 'desc')
                           ->get()
                           ->map(function ($expense) {
                                $expense->expense_date = $expense->expense_date->format('Y-m-d');
                                $relatedTransaction = Transaction::where('expense_id', $expense->id)->first();
                                if ($relatedTransaction) {
                                    $expense->gl_debit_account_name = $relatedTransaction->debitAccount->name ?? null;
                                    $expense->gl_credit_account_name = $relatedTransaction->creditAccount->name ?? null;
                                } else {
                                    $expense->gl_debit_account_name = null;
                                    $expense->gl_credit_account_name = null;
                                }
                                return $expense;
                           });

        $formattedExpenses = $expenses->map(function ($expense) {
            $paymentType = null;
            if ($expense->payment_type === 'cash') {
                $paymentType = 'Cash';
            } elseif ($expense->payment_type === 'bank') {
                $paymentType = 'Bank Transfer';
            } elseif ($expense->payment_type === 'credit') {
                $paymentType = 'On Credit';
            } else {
                $paymentType = 'N/A';
            }
            return [
                'id' => $expense->id,
                'expense_no' => $expense->expense_no ?? 'N/A',
                'expense_date' => $expense->expense_date ?? 'N/A',
                'vendor_name' => $expense->vendor->name ?? 'N/A',
                'item_description' => $expense->item_description ?? 'N/A',
                'memo_ref_no' => $expense->memo_ref_no ?? 'N/A',
                'amount' => $expense->amount ?? 'N/A',
                'payment_type' => $paymentType,
                'user_name' => $expense->creator->name,
                'created_at' => $expense->created_at?->toISOString(),
                'updated_at' => $expense->updated_at?->toISOString(),
            ];
        });

        $chartOfAccounts = ChartOfAccounts::orderBy('name')->get();
        $vendors = Vendor::orderBy('name')->get(); // Fetch all vendors

        return Inertia::render('accountings/expense-entry', [ 
            'expenses' => Inertia::defer(fn () => $formattedExpenses),
            'chartOfAccounts' => $chartOfAccounts,
            'vendors' => $vendors, // Pass vendors data
            'flash' => [
                'success' => session('success'),
                'error' => session('error'),
                'errors' => session('errors') ? (object) session('errors') : null,
            ],
        ]);
    }

    public function store(Request $request)
    {
        $userId = Auth::id() ?? 'guest';
        Log::info("User [ID: {$userId}] attempting to store a new expense transaction.");
        try {
            $this->authorize('expense-create');
            Log::info("User [ID: {$userId}] authorized for creating expense transaction.");

            $rules = [
                'expense_date' => ['required', 'date'],
                'vendor_name' => ['required', 'string', 'max:255', Rule::exists('vendors', 'name')],
                'item_description' => ['required', 'string', 'max:255'],
                'memo_ref_no' => ['nullable', 'string', 'max:255'],
                'amount' => ['required', 'numeric', 'min:0.01'],
                'payment_type' => ['required', 'in:cash,bank'],
                'debit_account_id' => ['required', 'exists:chart_of_accounts,id'],
                'credit_target_account_id' => [
                    'nullable',
                    'sometimes',
                    'required_if:payment_type,bank',
                    'exists:chart_of_accounts,id',
                ],
            ];
            $messages = [
                // Expense date
                'expense_date.required' => 'The transaction date is required.',
                'expense_date.date' => 'The transaction date must be a date.',
                // Customer
                'vendor_name.required' => 'The vendor name is required.',
                'vendor_name.string' => 'The vendor name must be a string.',

                'item_description.required' => 'The item description is required.',
                'payment_type.required' => 'The item payment type is required.',

                'debit_account_id.required' => 'The debit account is required.',
                'debit_account_id.exists' => 'The debit account does not exist.',

                'credit_target_account_id.required_if' => 'The bank account is required for bank payment.',
                'credit_target_account_id.exists' => 'The bank account does not exist.',

                // Pricing
                'amount.required' => 'The amount is required.'
            ];
            $attributes = [
                'expense_date' => 'transaction date',
                'vendor_name' => 'vendor name',
                'item_description' => 'item description',
                'payment_type' => 'payment type',
                'debit_account_id' => 'debit account',
                'credit_target_account_id' => 'bank account',
                'amount' => 'amount',
            ];
            // --- Validate the request data ---
            $validatedData = $request->validate($rules, $messages, $attributes);

            DB::beginTransaction();

            $lastExpense = Expense::orderByDesc('id')->first();
            $nextExpenseNo = 'EXP-' . str_pad(($lastExpense ? $lastExpense->id : 0) + 1, 4, '0', STR_PAD_LEFT);

            // Find the vendor
            $vendor = Vendor::where(['name' => $validatedData['vendor_name']])->first();

            $expense = Expense::create([
                'expense_no' => $nextExpenseNo,
                'expense_date' => $validatedData['expense_date'],
                'vendor_id' => $vendor->id,
                'item_description' => $validatedData['item_description'],
                'memo_ref_no' => $validatedData['memo_ref_no'],
                'amount' => $validatedData['amount'],
                'payment_type' => $validatedData['payment_type'],
                'user_id' => $userId,
            ]);

            // Determine Credit Account based on Payment Type and selected specific account
            $creditAccountId = null;
            if ($validatedData['payment_type'] === 'cash') {
                $cashAccount = ChartOfAccounts::where('name', 'Cash')->first();
                if (!$cashAccount) {
                    throw new \Exception('Cash account not found. Please ensure it exists in your Chart of Accounts with type "Asset".');
                }
                $creditAccountId = $cashAccount->id;
            } elseif ($validatedData['payment_type'] === 'bank') {
                // For 'bank', use the explicitly selected credit_target_account_id
                $selectedCreditAccount = ChartOfAccounts::find($validatedData['credit_target_account_id']);

                if (!$selectedCreditAccount) {
                    throw new \Exception('Selected Bank account not found.');
                }

                // Ensure the selected account is indeed a bank asset account
                if (!($selectedCreditAccount->type === 'Asset' && str_contains($selectedCreditAccount->name, 'Bank'))) {
                    throw new \Exception('Selected account for Bank payment must be a valid Bank Asset account.');
                }

                $creditAccountId = $selectedCreditAccount->id;
            } else {
                 throw new \Exception('Invalid payment type selected.');
            }

            // Get the selected Debit Account (Expense Account)
            $debitAccount = ChartOfAccounts::find($validatedData['debit_account_id']);
            if (!$debitAccount || $debitAccount->type->name !== 'Expense') {
                 throw new \Exception('Invalid Expense Account selected. Please select an Expense type account.');
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
                'transaction_date' => $validatedData['expense_date'],
                'item_description' => 'Expense to ' . $validatedData['vendor_name'] . ' for ' . $validatedData['item_description'],
                'memo_ref_no' => $validatedData['memo_ref_no'] ?? $nextExpenseNo,
                'debit_account_id' => $debitAccount->id, // Expense Account is debited
                'credit_account_id' => $creditAccountId, // Cash or Bank Account is credited
                'amount' => $validatedData['amount'],
                'expense_id' => $expense->id, // Link to the expense
                'user_id' => $userId,
            ]);

            DB::commit();

            return redirect()->route('expenses-entry.index')->with('success', 'Expense recorded successfully!');

        } catch (ValidationException $e) {
            DB::rollBack();
            return redirect()->back()->withErrors($e->errors())->withInput();
        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()->with('error', $e->getMessage())->withInput();
        }
    }

    public function destroy(Expense $expense)
    {
        try {
            DB::beginTransaction();
            Transaction::where('expense_id', $expense->id)->delete();
            $expense->delete();
            DB::commit();
            return redirect()->route('expenses-entry.index')->with('success', 'Expense deleted successfully!');
        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()->with('error', 'Failed to delete expense and its related GL entries: ' . $e->getMessage());
        }
    }
}
