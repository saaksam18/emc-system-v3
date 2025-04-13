<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes; // Import the SoftDeletes trait
// Uncomment the line below if you are using Laravel 9+ and create an Enum for current_status_id
// use App\Enums\Motorbikecurrent_status_id;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

use App\Models\Rentals;
use App\Models\VehicleClasses;
use App\Models\User;
use App\Models\VehicleStatus;
use App\Models\VehicleActualModel;
use App\Models\VehicleMaker;

class Motorbikes extends Model
{
    // Use HasFactory for easy model factory creation and SoftDeletes for soft deletion capability.
    use HasFactory, SoftDeletes;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'motorbikes'; // Explicitly defining, though 'motorbikes' is the convention.

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
        'daily_rental_price',
        'weekly_rental_price',
        'monthly_rental_price',
        'current_status_id',
        'current_location',
        'current_Rentals_id', // Foreign key for the current active Rentals
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
        'daily_rental_price' => 'decimal:2',
        'weekly_rental_price' => 'decimal:2',
        'monthly_rental_price' => 'decimal:2',
        'deleted_at' => 'datetime', // Required for SoftDeletes functionality
        // --- Enum Casting (Recommended for Laravel 9+) ---
        // Uncomment the line below if you have created an App\Enums\Motorbikecurrent_status_id Enum
        // 'current_status_id' => Motorbikecurrent_status_id::class,
        // --- End Enum Casting ---
        // If not using Enum casting, 'current_status_id' will be treated as a string by default.
    ];

    //--------------------------------------------------------------------------
    // Relationships
    //--------------------------------------------------------------------------

    /**
     * Get the currently active Rentals associated with this motorbike (if any).
     *
     * Defines an inverse one-to-one or many-to-one relationship.
     * Assumes a `Rentals` model exists and `current_Rentals_id` is the foreign key.
     *
     * @return BelongsTo
     */
    public function currentRentals(): BelongsTo
    {
        // Links this motorbike's 'current_Rentals_id' to the 'id' on the 'Rentals' model/table.
        return $this->belongsTo(Rentals::class, 'current_Rentals_id', 'id');
    }

    /**
     * Get all the Rentals records associated with this motorbike (past and present).
     *
     * Defines a one-to-many relationship.
     * Assumes the `Rentals` model has a `motorbike_id` foreign key referencing this model.
     *
     * @return HasMany
     */
    public function Rentalss(): HasMany
    {
        // Links this motorbike's 'id' to the 'motorbike_id' on the 'Rentals' model/table.
        return $this->hasMany(Rentals::class);
    }

    //--------------------------------------------------------------------------
    // Scopes (Optional Query Constraints)
    //--------------------------------------------------------------------------

    /**
     * Scope a query to only include available motorbikes.
     *
     * Example Usage: Motorbike::available()->get();
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeAvailable($query)
    {
        // If using Enum casting (Laravel 9+):
        // return $query->where('current_status_id', Motorbikecurrent_status_id::Available);

        // If 'current_status_id' is treated as a string:
        return $query->where('current_status_id', 'available');
    }

     /**
     * Scope a query to only include motorbikes currently marked as rented.
     *
     * Example Usage: Motorbike::rented()->get();
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeRented($query)
    {
        // If using Enum casting (Laravel 9+):
        // return $query->where('current_status_id', Motorbikecurrent_status_id::Rented);

        // If 'current_status_id' is treated as a string:
        return $query->where('current_status_id', 'rented');
    }

    public function creator(): BelongsTo
    {
        // Links the 'created_by_user_id' column in the 'roles' table
        // back to the 'id' column in the 'users' table.
        return $this->belongsTo(User::class, 'user_id', 'id');
    }

    public function vehicleClasses(): BelongsTo
    {
        // Links the 'created_by_user_id' column in the 'roles' table
        // back to the 'id' column in the 'users' table.
        return $this->belongsTo(VehicleClasses::class, 'vehicle_class_id', 'id');
    }

    public function vehicleStatus(): BelongsTo
    {
        // Links the 'created_by_user_id' column in the 'roles' table
        // back to the 'id' column in the 'users' table.
        return $this->belongsTo(VehicleStatus::class, 'current_status_id', 'id');
    }

    public function vehicleMaker(): BelongsTo
    {
        // Links the 'created_by_user_id' column in the 'roles' table
        // back to the 'id' column in the 'users' table.
        return $this->belongsTo(VehicleMaker::class, 'vehicle_make_id', 'id');
    }

    public function vehicleModel(): BelongsTo
    {
        // Links the 'created_by_user_id' column in the 'roles' table
        // back to the 'id' column in the 'users' table.
        return $this->belongsTo(VehicleActualModel::class, 'vehicle_model_id', 'id');
    }
}
