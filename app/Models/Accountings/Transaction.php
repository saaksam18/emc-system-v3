<?php

namespace App\Models\Accountings;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// Model
use App\Models\Accountings\ChartOfAccounts;
use App\Models\User;

class Transaction extends Model
{
    use HasFactory;

    /**
     * The table associated with the model.
     *
     * By convention, Laravel assumes 'vehicle_statuses' (plural snake_case),
     * so this line isn't strictly necessary if you follow convention.
     *
     * @var string
     */
    protected $table = 'accounting_transactions';

    protected $fillable = [
        'transaction_no',
        'transaction_date',
        'item_description',
        'memo_ref_no',
        'debit_account_id',
        'credit_account_id',
        'sale_id',
        'expense_id',
        'user_id',
        'amount',
    ];

    // Cast transaction_date to a Date object
    protected $casts = [
        'transaction_date' => 'date',
    ];

    // Define relationships to ChartOfAccount model
    public function debitAccount()
    {
        return $this->belongsTo(ChartOfAccounts::class, 'debit_account_id', 'id');
    }

    public function creditAccount()
    {
        return $this->belongsTo(ChartOfAccounts::class, 'credit_account_id', 'id');
    }

    public function saleEntry()
    {
        return $this->belongsTo(Sale::class, 'sale_id', 'id');
    }

    public function expenseEntry()
    {
        return $this->belongsTo(Expense::class, 'expense_id', 'id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id', 'id');
    }
}
