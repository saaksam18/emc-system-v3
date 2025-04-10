<?php

namespace App\Models;

use Spatie\Permission\Models\Role as SpatieRole;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Models\User;

class Role extends SpatieRole
{
    protected $fillable = [
        'name',
        'guard_name',
        'user_id',
    ];

    public function creator(): BelongsTo
    {
        // Links the 'created_by_user_id' column in the 'roles' table
        // back to the 'id' column in the 'users' table.
        return $this->belongsTo(User::class, 'user_id', 'id');
    }
}
