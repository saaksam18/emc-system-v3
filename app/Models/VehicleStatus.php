<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

use App\Models\User;
use App\Models\Vehicles;

class VehicleStatus extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * The table associated with the model.
     *
     * By convention, Laravel assumes 'vehicle_statuses' (plural snake_case),
     * so this line isn't strictly necessary if you follow convention.
     *
     * @var string
     */
    protected $table = 'vehicle_statuses';

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
        'user_id',
    ];

    protected $dates = ['deleted_at'];

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
        return $this->hasMany(Vehicles::class, 'current_status_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id', 'id');
    }
}
