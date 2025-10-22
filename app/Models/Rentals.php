<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes; // Import SoftDeletes
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

use App\Models\Vehicles;
use App\Models\Customers;
use App\Models\Deposits;
use App\Models\Rentals\Status;
use App\Models\User;

class Rentals extends Model
{
    // Enable model factories and soft deletion.
    use HasFactory, SoftDeletes;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'rentals';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'vehicle_id',
        'customer_id',
        'start_date',
        'end_date',
        'period',
        'coming_date',
        'actual_start_date',
        'actual_return_date',
        'total_cost',
        'is_active',
        'incharger_id',
        'status',
        'helmet_amount',
        'notes',
        'user_id',
        'created_at',
        'updated_at',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'start_date' => 'datetime', // Cast to Carbon instance
        'end_date' => 'datetime',   // Cast to Carbon instance
        'actual_return_date' => 'datetime', // Cast to Carbon instance (or null)
        'total_cost' => 'decimal:2', // Cast to decimal with 2 places
    ];

    /**
     * The attributes that should be mutated to dates.
     *
     * @deprecated Use the $casts property instead for date casting in modern Laravel versions.
     * @var array
     */
    // protected $dates = ['start_date', 'end_date', 'actual_return_date']; // Old way, prefer $casts

    //--------------------------------------------------------------------------
    // Relationships
    //--------------------------------------------------------------------------

    /**
     * Get the vehicles associated with this rental.
     * Defines the inverse of the one-to-many relationship (A rental belongs to one vehicles).
     *
     * @return BelongsTo
     */
    public function vehicle(): BelongsTo
    {
        // Assumes 'vehicles_id' is the foreign key in the 'rentals' table.
        return $this->belongsTo(Vehicles::class, 'vehicle_id', 'id');
    }

    /**
     * Get the customer associated with this rental.
     * Defines the inverse of the one-to-many relationship (A rental belongs to one customer).
     *
     * @return BelongsTo
     */
    public function customer(): BelongsTo
    {
        // Assumes 'customer_id' is the foreign key and links to a 'Customer' model.
        // IMPORTANT: Change Customer::class to User::class if you are using the default Laravel users table.
        return $this->belongsTo(Customers::class, 'customer_id', 'id'); // Or User::class
    }

    //--------------------------------------------------------------------------
    // Scopes (Optional Query Constraints)
    //--------------------------------------------------------------------------

    /**
     * Scope a query to only include active rentals.
     * (Rentals that have started but not yet ended or completed).
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true)
                    ->where('status', '!=', 'Return');
    }

    /**
     * Scope a query to only include completed rentals.
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeCompleted($query)
    {
        return $query->whereNotNull('actual_return_date');
    }

     /**
     * Scope a query to only include rentals that are currently overdue.
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeOverdue($query)
    {
        return $query->whereNull('actual_return_date') // Check it hasn't been returned
                  ->where('end_date', '<', now())    // Check the due date is in the past
                  ->where('is_active', true)
                  ->where('status', '!=', 'Return');
    }

    public function incharger(): BelongsTo
    {
        return $this->belongsTo(User::class, 'incharger_id', 'id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id', 'id');
    }

    public function statuses(): HasMany
    {
        return $this->hasMany(Status::class, 'status_id');
    }
    public function status(): BelongsTo
    {
        return $this->belongsTo(Status::class, 'status_id', 'id');
    }
    public function deposits(): HasMany
        {
            return $this->hasMany(Deposits::class, 'rental_id');
        }
}
