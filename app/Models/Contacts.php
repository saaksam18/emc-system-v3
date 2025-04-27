<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Builder;

// Modle
use App\Models\User;
use App\Models\Contacts\Types;
use App\Models\Customers;
class Contacts extends Model
{
    use HasFactory;

        /**
         * The attributes that are mass assignable.
         *
         * @var array<int, string>
         */
        protected $fillable = [
            'customer_id', // Important: Ensure foreign key is fillable if creating contacts via mass assignment
            'contact_type_id',
            'contact_value',
            'is_primary',
            'description',
            'is_active',
            'start_date',
            'end_date',
        ];

        /**
         * The attributes that should be cast.
         *
         * Ensures these fields are treated as the correct type.
         *
         * @var array<string, string>
         */
        protected $casts = [
            'is_primary' => 'boolean',
            'is_active' => 'boolean',
            'start_date' => 'datetime', // Use 'datetime' or 'timestamp'
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
        public function customer(): BelongsTo
        {
            return $this->belongsTo(Customers::class);
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
        public function contactType(): BelongsTo
        {
            return $this->belongsTo(Types::class, 'contact_type_id', 'id');
        }
}
