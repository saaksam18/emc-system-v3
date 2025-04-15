<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes; // Import SoftDeletes
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Casts\Attribute; // Required for the full name accessor

use App\Models\Rentals;
use App\Models\User;

class Customers extends Model
{
    // Enable model factories and soft deletion.
    use HasFactory, SoftDeletes;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'customers';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'first_name',
        'last_name',
        'date_of_birth',
        'email',
        'phone_number',
        'address_line_1',
        'address_line_2',
        'city',
        'state_province',
        'postal_code',
        'country',
        'passport_number',
        'passport_expiry',
        'notes',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'date_of_birth' => 'date', // Cast to Date object (or null)
        'passport_expiry' => 'date', // Cast to Date object (or null)
        'deleted_at' => 'datetime', // Required for SoftDeletes functionality
    ];

    /**
     * The attributes that should be hidden for serialization.
     * Often used for sensitive data like license or passport numbers.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        // 'driver_license_number', // Uncomment to hide by default
        // 'passport_number',       // Uncomment to hide by default
    ];

    //--------------------------------------------------------------------------
    // Relationships
    //--------------------------------------------------------------------------

    /**
     * Get all the Rentalss associated with this customer.
     * Defines a one-to-many relationship (A customer can have many Rentalss).
     *
     * @return HasMany
     */
    public function Rentalss(): HasMany
    {
        // Assumes the 'Rentalss' table has a 'customer_id' foreign key.
        return $this->hasMany(Rentals::class);
    }

    //--------------------------------------------------------------------------
    // Accessors & Mutators
    //--------------------------------------------------------------------------

    /**
     * Get the customer's full name.
     *
     * This is an accessor that combines first and last name.
     * Usage: $customer->full_name
     *
     * @return Attribute
     */
    protected function fullName(): Attribute
    {
        return Attribute::make(
            get: fn ($value, $attributes) => trim(($attributes['first_name'] ?? '') . ' ' . ($attributes['last_name'] ?? '')),
        );
    }

    //--------------------------------------------------------------------------
    // Scopes (Optional Query Constraints)
    //--------------------------------------------------------------------------

    /**
     * Scope a query to find a customer by email.
     *
     * Example Usage: Customer::findByEmail('test@example.com')->first();
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param string $email
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeFindByEmail($query, string $email)
    {
        return $query->where('email', $email);
    }
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id', 'id');
    }
}
