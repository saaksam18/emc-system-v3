<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

use App\Models\Customers;
use App\Models\User;

class Visa extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'customer_id',
        'passport_number',
        'visa_type',
        'expiration_date',
        'incharger_id',
        'notes',
        'created_by',
    ];

    /**
     * Get the customer that owns the visa.
     */
    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customers::class, 'customer_id');
    }

    /**
     * Get the user who is in charge of this visa.
     */
    public function incharger(): BelongsTo
    {
        return $this->belongsTo(User::class, 'incharger_id');
    }

    /**
     * Get the user who created the visa entry.
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
