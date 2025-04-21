<?php

namespace App\Models\Contacts;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Log;

// Modle
use App\Models\User;

class Types extends Model
{
    use HasFactory;

        /**
         * The attributes that are mass assignable.
         *
         * @var array<int, string>
         */
        protected $fillable = [
            'name',
            'description',
            'is_active',
            'start_date',
            'end_date',
            'user_id',
        ];

        /**
         * The attributes that should be cast.
         *
         * Ensures these fields are treated as the correct type.
         *
         * @var array<string, string>
         */
        protected $casts = [
            'is_active' => 'boolean',
            'start_date' => 'datetime',
            'end_date' => 'datetime',
        ];

        /**
         * Get the customer that owns the contact.
         *
         * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
         */
        public function creator(): BelongsTo
        {
            return $this->belongsTo(User::class, 'user_id', 'id');
        }

        /**
         * Scope a query to only include active contacts.
         * Usage: Contact::active()->get();
         * Or: $customer->contacts()->active()->get();
         *
         * @param \Illuminate\Database\Eloquent\Builder $query
         * @return \Illuminate\Database\Eloquent\Builder
         */
        public function scopeActive(Builder $query): Builder
        {
            return $query->where('is_active', true);
        }

        /**
         * Scope a query to only include inactive contacts.
         * Usage: Contact::inactive()->get();
         * Or: $customer->contacts()->inactive()->get();
         *
         * @param \Illuminate\Database\Eloquent\Builder $query
         * @return \Illuminate\Database\Eloquent\Builder
         */
        public function scopeInactive(Builder $query): Builder
        {
            return $query->where('is_active', false);
        }
}
