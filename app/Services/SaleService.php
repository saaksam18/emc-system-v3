<?php
namespace App\Services;

use App\Models\Accountings\ChartOfAccounts;
use App\Models\Accountings\Sale;
use App\Models\Accountings\Transaction;
use App\Models\Customers;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

class SaleService
{
    /**
     * Creates a single Sale record and the corresponding GL Transaction.
     * * @param array $saleData An array containing all data for a single sale.
     * @param int|null $rentalId The ID of the parent rental, if applicable.
     * @return \App\Models\Sale
     * @throws \Exception
     */
    public function recordSale(array $saleData, ?int $rentalId = null): Sale
    {
        $userId = Auth::id() ?? 'system';

        // 1. Find Customer (Assuming $saleData includes customer_id)
        $customer = Customers::findOrFail($saleData['customer_id']);

        // 2. Determine Sale Number
        $lastSale = Sale::orderByDesc('id')->first();
        $nextSaleNo = 'SALE-' . str_pad(($lastSale ? $lastSale->id : 0) + 1, 4, '0', STR_PAD_LEFT);
        
        // 3. Create the Sale Record
        $sale = Sale::create([
            'sale_no' => $nextSaleNo,
            'sale_date' => $saleData['sale_date'],
            'customer_id' => $customer->id,
            'item_description' => $saleData['item_description'],
            'memo_ref_no' => $saleData['memo_ref_no'] ?? $nextSaleNo,
            'amount' => $saleData['amount'],
            'payment_type' => $saleData['payment_type'],
            'rental_id' => $rentalId, // Add rental_id link
            'user_id' => $userId,
        ]);

        // 4. Determine Debit Account (Logic from your original function)
        $debitAccountId = $this->determineDebitAccount($saleData['payment_type'], $saleData['debit_target_account_id'] ?? null);

        // 5. Get the selected Credit Account (Income/Liability Account)
        $creditAccount = ChartOfAccounts::find($saleData['credit_account_id']);
        if (!$creditAccount || !in_array($creditAccount->type->name, ["Revenue", "Liability"])) {
             // For deposit, the credit account is usually a Liability account.
             throw new \Exception('Invalid Credit Account selected. Must be Revenue or Liability type.');
        }

        // 6. Create General Ledger Transaction
        $transactionNo = $this->getNextTransactionNo();

        Transaction::create([
            'transaction_no' => $transactionNo,
            'transaction_date' => $saleData['sale_date'],
            'item_description' => 'Sale to ' . $customer->full_name . ' - ' . $saleData['item_description'],
            'memo_ref_no' => $saleData['memo_ref_no'] ?? $nextSaleNo,
            'debit_account_id' => $debitAccountId,
            'credit_account_id' => $creditAccount->id,
            'amount' => $saleData['amount'],
            'sale_id' => $sale->id,
            'user_id' => $userId,
        ]);

        return $sale;
    }

    /**
     * Helper to determine the Debit Account based on payment type.
     * ... (You would include your private determineDebitAccount logic here) ...
     */
    protected function determineDebitAccount(string $paymentType, ?int $debitTargetAccountId): int
    {
        // ... (Replicate the debit account determination logic from your original 'store' function) ...
        // Ensure you handle the exceptions thrown in the original logic.
        if ($paymentType === 'cash') {
            $cashAccount = ChartOfAccounts::where('name', 'Cash')->firstOrFail();
            return $cashAccount->id;
        } elseif ($paymentType === 'bank' || $paymentType === 'credit') {
            $selectedDebitAccount = ChartOfAccounts::findOrFail($debitTargetAccountId);
            // Add validation checks here if necessary
            return $selectedDebitAccount->id;
        }
        throw new \Exception('Invalid payment type selected.');
    }
    
    /**
     * Helper to get the next GL Transaction number.
     * ... (You would include your private getNextTransactionNo logic here) ...
     */
    protected function getNextTransactionNo(): string
    {
        // ... (Replicate your transaction number generation logic here) ...
        $lastTransaction = Transaction::latest('id')->first();
        $lastId = $lastTransaction ? $lastTransaction->id : 0;
        $transactionNo = 'GL-' . str_pad($lastId + 1, 3, '0', STR_PAD_LEFT);

        while (Transaction::where('transaction_no', $transactionNo)->exists()) {
            $lastId++;
            $transactionNo = 'GL-' . str_pad($lastId + 1, 3, '0', STR_PAD_LEFT);
        }
        return $transactionNo;
    }
}