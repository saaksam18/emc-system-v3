<?php

namespace App\Models\Accountings;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

// Model
use App\Models\Accountings\Transaction;

class ChartOfAccounts extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'type',
        'description',
        'is_active',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'type' => \App\AccountType::class, // We'll create this Enum next
    ];

    // You might define relationships here if needed, e.g., accounts can have many debit/credit transactions
    public function debitTransactions()
    {
        return $this->hasMany(Transaction::class, 'debit_account_id');
    }

    public function creditTransactions()
    {
        return $this->hasMany(Transaction::class, 'credit_account_id');
    }
}
