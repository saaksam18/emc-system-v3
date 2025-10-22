<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes; // Import SoftDeletes
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Casts\Attribute; // Required for the full name accessor

use App\Models\Rentals;
use App\Models\Contacts;
use App\Models\Deposits;
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
        'gender',
        'nationality',
        'address_line_1',
        'address_line_2',
        'commune',
        'district',
        'city',
        'user_id',
        'occupations',
        'how_know_shop',
        'notes',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'date_of_birth' => 'date', // Cast to Date object (or null)
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
    protected function fullAddress(): Attribute
    {
        return Attribute::make(
            get: fn ($value, $attributes) => trim(($attributes['address_line_1'] ?? 'N/A') . ' ' . ($attributes['address_line_2'] ?? '') . ' ' . ($attributes['commune'] ?? '') . ' ' . ($attributes['district'] ?? '') . ' ' . ($attributes['city'] ?? '')),
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

    /**
         * Get all contacts associated with the customer (including inactive ones).
         *
         * @return \Illuminate\Database\Eloquent\Relations\HasMany
         */
        public function contacts(): HasMany
        {
            return $this->hasMany(Contacts::class, 'customer_id');
        }

        /**
         * Get only the active contacts associated with the customer.
         *
         * @return \Illuminate\Database\Eloquent\Relations\HasMany
         */
        public function activeContacts(): HasMany
        {
            return $this->hasMany(Contacts::class, 'customer_id')->where('is_active', true);
            // Alternatively, using the scope defined in Contact model:
            // return $this->hasMany(Contact::class)->active();
        }

    /**
         * Get all contacts associated with the customer (including inactive ones).
         *
         * @return \Illuminate\Database\Eloquent\Relations\HasMany
         */
        public function deposits(): HasMany
        {
            return $this->hasMany(Deposits::class, 'customer_id');
        }

        /**
         * Get only the active contacts associated with the customer.
         *
         * @return \Illuminate\Database\Eloquent\Relations\HasMany
         */
        public function activeDeposits(): HasMany
        {
            return $this->hasMany(Deposits::class, 'customer_id')->where('is_active', true);
            // Alternatively, using the scope defined in Contact model:
            // return $this->hasMany(Contact::class)->active();
        }
}
