<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes; // Import the SoftDeletes trait
// Uncomment the line below if you are using Laravel 9+ and create an Enum for current_status_id
// use App\Enums\VehicleStatusEnum; // Example Enum name
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Builder; // Import Builder for type hinting

// Import related models
use App\Models\Rentals;
use App\Models\VehicleClasses;
use App\Models\User;
use App\Models\VehicleStatus;
use App\Models\VehicleActualModel;
use App\Models\VehicleMaker;

class Vehicles extends Model
{
    // Use HasFactory for easy model factory creation and SoftDeletes for soft deletion capability.
    use HasFactory, SoftDeletes;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'vehicles'; // Explicitly defining, though 'vehicles' is the convention.

    /**
     * The attributes that are mass assignable.
     *
     * These attributes can be set using mass assignment methods like `create()` or `fill()`.
     * It's a security measure to prevent unintended updates.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'vehicle_make_id',
        'vehicle_no',
        'vehicle_model_id',
        'year',
        'license_plate',
        'vin',
        'color',
        'engine_cc',
        'vehicle_class_id',
        'compensation_price',
        'purchase_price',
        'purchase_date',
        'daily_rental_price',
        'weekly_rental_price',
        'monthly_rental_price',
        'current_status_id',
        'current_location',
        'current_rental_id', // Foreign key for the current active Rentals
        'user_id',
        'notes',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * Attributes listed here will not be included in JSON or array representations
     * of the model unless explicitly requested. Useful for sensitive data.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        // Example: 'vin', if you want to hide it by default
    ];

    /**
     * The attributes that should be cast to native types.
     *
     * Ensures that attributes are converted to the correct data type when
     * accessed on the model instance.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'vehicle_no' => 'integer',
        'year' => 'integer', // Cast 'year' to an integer
        'engine_cc' => 'integer', // Cast 'engine_cc' to an integer
        'compensation_price' => 'decimal:2',
        'purchase_price' => 'decimal:2',
        'daily_rental_price' => 'decimal:2',
        'weekly_rental_price' => 'decimal:2',
        'monthly_rental_price' => 'decimal:2',
        'purchase_date' => 'date', // Cast purchase_date to a date object
        'deleted_at' => 'datetime', // Required for SoftDeletes functionality
        // --- Enum Casting (Recommended for Laravel 9+) ---
        // Uncomment the line below if you have created an App\Enums\VehicleStatusEnum Enum
        // 'current_status_id' => VehicleStatusEnum::class,
        // --- End Enum Casting ---
        // If not using Enum casting, 'current_status_id' will be treated as a foreign key (integer/string).
    ];

    //--------------------------------------------------------------------------
    // Relationships
    //--------------------------------------------------------------------------

    /**
     * Get the currently active Rentals associated with this vehicle (if any).
     *
     * Defines an inverse one-to-one or many-to-one relationship.
     * Assumes a `Rentals` model exists and `current_Rentals_id` is the foreign key.
     *
     * @return BelongsTo<Rentals, Vehicles>
     */
    public function currentRentals(): BelongsTo
    {
        // Links this vehicle's 'current_Rentals_id' to the 'id' on the 'Rentals' model/table.
        return $this->belongsTo(Rentals::class, 'current_rentals_id', 'id');
    }

    /**
     * Get all the Rentals records associated with this vehicle (past and present).
     *
     * Defines a one-to-many relationship.
     * Assumes the `Rentals` model has a `vehicle_id` foreign key referencing this model.
     *
     * @return HasMany<Rentals>
     */
    public function rentals(): HasMany
    {
        // Links this vehicle's 'id' to the 'vehicle_id' on the 'Rentals' model/table.
        return $this->hasMany(Rentals::class);
    }

    /**
     * Get the user who created or is associated with this vehicle.
     *
     * @return BelongsTo<User, Vehicles>
     */
    public function creator(): BelongsTo
    {
        // Links the 'user_id' column in the 'vehicles' table
        // back to the 'id' column in the 'users' table.
        return $this->belongsTo(User::class, 'user_id', 'id');
    }

    /**
     * Get the vehicle class associated with this vehicle.
     *
     * @return BelongsTo<VehicleClasses, Vehicles>
     */
    public function vehicleClasses(): BelongsTo
    {
        // Links the 'vehicle_class_id' column in the 'vehicles' table
        // back to the 'id' column in the 'vehicle_classes' table.
        return $this->belongsTo(VehicleClasses::class, 'vehicle_class_id', 'id');
    }

    /**
     * Get the current status associated with this vehicle.
     *
     * @return BelongsTo<VehicleStatus, Vehicles>
     */
    public function vehicleStatus(): BelongsTo
    {
        // Links the 'current_status_id' column in the 'vehicles' table
        // back to the 'id' column in the 'vehicle_statuses' table.
        return $this->belongsTo(VehicleStatus::class, 'current_status_id', 'id');
    }

    /**
     * Get the maker associated with this vehicle.
     *
     * @return BelongsTo<VehicleMaker, Vehicles>
     */
    public function vehicleMaker(): BelongsTo
    {
        // Links the 'vehicle_make_id' column in the 'vehicles' table
        // back to the 'id' column in the 'vehicle_makers' table.
        return $this->belongsTo(VehicleMaker::class, 'vehicle_make_id', 'id');
    }

    /**
     * Get the model associated with this vehicle.
     *
     * @return BelongsTo<VehicleActualModel, Vehicles>
     */
    public function vehicleModel(): BelongsTo
    {
        // Links the 'vehicle_model_id' column in the 'vehicles' table
        // back to the 'id' column in the 'vehicle_actual_models' table.
        return $this->belongsTo(VehicleActualModel::class, 'vehicle_model_id', 'id');
    }

    //--------------------------------------------------------------------------
    // Scopes
    //--------------------------------------------------------------------------

    /**
     * Scope a query to only include vehicles that are currently available for rent.
     *
     * This checks the associated VehicleStatus's 'is_rentable' attribute.
     *
     * @param Builder<Vehicles> $query The Eloquent query builder instance.
     * @return Builder<Vehicles> The modified query builder instance.
     */
    public function scopeAvailable(Builder $query): Builder
    {
        // Use whereHas to filter based on the existence of a related model matching criteria.
        // We check if the related 'vehicleStatus' has 'is_rentable' set to true.
        return $query->whereHas('vehicleStatus', function (Builder $statusQuery) {
            $statusQuery->where('is_rentable', true);
        })
        // Condition 2: Check if there's no current rental linked
        ->whereNull('current_rental_id');

    }

    /**
     * Scope a query to only include vehicles that are currently unavailable for rent.
     *
     * This checks the associated VehicleStatus's 'is_rentable' attribute.
     *
     * @param Builder<Vehicles> $query The Eloquent query builder instance.
     * @return Builder<Vehicles> The modified query builder instance.
     */
    public function scopeUnavailable(Builder $query): Builder
    {
        // Use a closure with 'where' to group the OR conditions correctly.
        return $query->where(function (Builder $subQuery) {
            // Condition 1: Status is not rentable
            $subQuery->whereHas('vehicleStatus', function (Builder $statusQuery) {
                $statusQuery->where('is_rentable', false);
            })
            // OR Condition 2: Vehicle is currently rented out
            ->orWhereNotNull('current_rental_id');

            // Optional consideration: What if a vehicle has NO status linked?
            // Depending on business logic, you might also want to include vehicles
            // that don't have a status relationship at all. If so, add:
            // ->orWhereDoesntHave('vehicleStatus');
            // However, based on the original code, it seems a status is expected.
        });
    }

}
