<?php

namespace App\Models\Accountings;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

use App\Models\Accountings\Transaction;
use App\Models\User;

class Sale extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'sale_no',
        'sale_date',
        'customer_id',
        'item_description',
        'memo_ref_no',
        'amount',
        'user_id',
        'payment_type',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'sale_date' => 'date',
        'amount' => 'decimal:2', // Cast amount to decimal with 2 places
    ];

    /**
     * Get the accounting transaction associated with the sale.
     *
     * This establishes a one-to-one relationship if you expect each sale to have exactly one accounting transaction.
     * If a sale can generate multiple transactions (e.g., separate entries for tax, discounts, etc.),
     * you might consider a hasMany relationship to AccountingTransaction.
     * For now, based on your controller, it seems to be a one-to-one.
     */
    public function accountingTransaction()
    {
        return $this->hasOne(Transaction::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id', 'id');
    }
}
