<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

use App\Models\User;
use App\Models\Motorbikes;

class VehicleClasses extends Model
{
    // Use HasFactory for easy model factory creation and SoftDeletes for soft deletion capability.
    use HasFactory, SoftDeletes;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'vehicle_classes'; // Explicitly defining, though 'motorbikes' is the convention.

    /**
     * The attributes that are mass assignable.
     *
     * These attributes can be set using mass assignment methods like `create()` or `fill()`.
     * It's a security measure to prevent unintended updates.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'description',
        'user_id',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id', 'id');
    }

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
        return $this->hasMany(Motorbikes::class, 'vehicle_class_id');
    }
}
