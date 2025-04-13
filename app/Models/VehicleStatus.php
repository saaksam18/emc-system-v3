<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

use App\Models\User;
use App\Models\Motorbikes;

class VehicleStatus extends Model
{
    use HasFactory;

    /**
     * The table associated with the model.
     *
     * By convention, Laravel assumes 'vehicle_statuses' (plural snake_case),
     * so this line isn't strictly necessary if you follow convention.
     *
     * @var string
     */
    // protected $table = 'vehicle_statuses';

    /**
     * The attributes that are mass assignable.
     *
     * These fields can be filled using methods like VehicleStatus::create() or $status->update().
     * It's a security feature to prevent unintended mass updates.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'status_name',
        'description',
        'is_rentable',
    ];

    /**
     * The attributes that should be cast.
     *
     * This ensures that when you access these attributes on the model,
     * they are automatically converted to the specified type.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'is_rentable' => 'boolean', // Cast the database integer/boolean to a PHP boolean
        'created_at' => 'datetime', // Standard timestamp casting
        'updated_at' => 'datetime', // Standard timestamp casting
    ];

    /**
     * Get the vehicles that currently have this status.
     *
     * This defines a one-to-many relationship: one status can belong to many vehicles.
     *
     * @return \Illuminate\Database\Eloquent\Relations\HasMany
     */
    public function vehicles(): HasMany
    {
        // We need to specify the foreign key column name used in the 'vehicles' table,
        // as it's 'current_status_id' and not the default 'vehicle_status_id'.
        return $this->hasMany(Motorbikes::class, 'current_status_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id', 'id');
    }

    // You can add custom methods or scopes here if needed, for example:
    /**
     * Scope a query to only include rentable statuses.
     *
     * Example Usage: VehicleStatus::rentable()->get();
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @return \Illuminate\Database\Eloquent\Builder
     */
    // public function scopeRentable($query)
    // {
    //     return $query->where('is_rentable', true);
    // }
}
