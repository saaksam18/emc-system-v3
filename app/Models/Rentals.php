<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes; // Import SoftDeletes
use Illuminate\Database\Eloquent\Relations\BelongsTo;

use App\Models\Motorbikes;
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
        'Motorbikes_id',
        'customer_id',
        'start_date',
        'end_date',
        'actual_return_date',
        'total_cost',
        'current_status_id',
        'notes',
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
        'deleted_at' => 'datetime', // Required for SoftDeletes
        // --- Enum Casting (Recommended for Laravel 9+) ---
        // Uncomment the line below if you create an App\Enums\Rentalcurrent_status_id Enum
        // 'current_status_id' => Rentalcurrent_status_id::class,
        // --- End Enum Casting ---
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
     * Get the Motorbikes associated with this rental.
     * Defines the inverse of the one-to-many relationship (A rental belongs to one Motorbikes).
     *
     * @return BelongsTo
     */
    public function Motorbikes(): BelongsTo
    {
        // Assumes 'Motorbikes_id' is the foreign key in the 'rentals' table.
        return $this->belongsTo(Motorbikes::class);
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
        return $this->belongsTo(Customer::class); // Or User::class
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
        // Using Enum casting:
        // return $query->where('current_status_id', Rentalcurrent_status_id::Active);
        // Using string value:
        return $query->where('current_status_id', 'active');
    }

    /**
     * Scope a query to only include completed rentals.
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeCompleted($query)
    {
        // Using Enum casting:
        // return $query->where('current_status_id', Rentalcurrent_status_id::Completed);
        // Using string value:
        return $query->where('current_status_id', 'completed');
    }

     /**
     * Scope a query to only include upcoming rentals.
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeUpcoming($query)
    {
        // Using Enum casting:
        // return $query->where('current_status_id', Rentalcurrent_status_id::Upcoming);
        // Using string value:
        return $query->where('current_status_id', 'upcoming');
    }

     /**
     * Scope a query to only include rentals that are currently overdue.
     * (current_status_id is 'overdue' or current_status_id is 'active' and end_date is in the past).
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeOverdue($query)
    {
        // Using Enum casting:
        // return $query->where('current_status_id', Rentalcurrent_status_id::Overdue)
        //              ->orWhere(function ($q) {
        //                  $q->where('current_status_id', Rentalcurrent_status_id::Active)
        //                    ->where('end_date', '<', now());
        //              });
        // Using string value:
         return $query->where('current_status_id', 'overdue')
                      ->orWhere(function ($q) {
                          $q->where('current_status_id', 'active')
                            ->where('end_date', '<', now()); // Use Carbon for date comparison
                      });
    }

    public function creator(): BelongsTo
    {
        // Links the 'created_by_user_id' column in the 'roles' table
        // back to the 'id' column in the 'users' table.
        return $this->belongsTo(User::class, 'user_id', 'id');
    }
}
