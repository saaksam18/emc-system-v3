<?php

namespace App\Models\Accountings;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// Model
use App\Models\Accountings\Transaction;
use App\Models\Accountings\Vendor;
use App\Models\User;

class Expense extends Model
{
    use HasFactory;

    protected $fillable = [
        'expense_no',
        'expense_date',
        'vendor_id',
        'item_description',
        'memo_ref_no',
        'amount',
        'user_id',
        'payment_type',
    ];

    protected $casts = [
        'expense_date' => 'date',
        'amount' => 'decimal:2',
    ];

    /**
     * Get the accounting transaction associated with the expense.
     */
    public function accountingTransaction()
    {
        return $this->hasOne(Transaction::class);
    }

    public function vendor(): BelongsTo
    {
        return $this->belongsTo(Vendor::class, 'vendor_id', 'id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id', 'id');
    }
}
