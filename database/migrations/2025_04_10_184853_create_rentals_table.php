<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Creates the 'rentals' table to store rental transaction information.
     */
    public function up(): void
    {
        Schema::create('rentals', function (Blueprint $table) {
            // Primary Key
            $table->id(); // Auto-incrementing ID for the rental record.

            // Foreign Keys - Linking to other tables
            // Assumes 'motorbikes' table exists with an 'id' column. Restricts deletion if rentals exist.
            $table->foreignId('motorbike_id')
                  ->constrained('motorbikes') // Links to the 'id' column on the 'motorbikes' table
                  ->onDelete('restrict') // Prevent deleting a motorbike if it has associated rentals
                  ->onUpdate('cascade'); // Update rental's motorbike_id if motorbike's id changes (less common)

            // Assumes a 'customers' table exists. Change 'customers' to 'users' if using the default users table.
            $table->foreignId('customer_id')
                  ->constrained('customers') // Links to the 'id' column on the 'customers' table
                  ->onDelete('restrict') // Prevent deleting a customer if they have rentals
                  ->onUpdate('cascade');

            // Rental Period Timestamps - Changed to DATETIME to avoid MySQL default value issues
            $table->dateTime('start_date'); // Date and time when the rental period begins. Required.
            $table->dateTime('end_date');   // Scheduled date and time for the rental period to end. Required.
            $table->dateTime('actual_return_date')->nullable(); // Actual date and time the motorbike was returned. Nullable until returned.

            // Financials & Status
            $table->decimal('total_cost', 10, 2)->unsigned()->nullable(); // Total calculated cost for the rental. Nullable, might be set upon completion. Unsigned.
            $table->enum('status', ['upcoming', 'active', 'completed', 'cancelled', 'overdue'])
                  ->default('upcoming'); // Current status of the rental. Defaults to 'upcoming'.

            // Additional Information
            $table->text('notes')->nullable(); // Optional notes about the rental (e.g., special conditions, damage report ID).

            // Standard Timestamps & Soft Deletes
            $table->timestamps(); // Adds `created_at` and `updated_at` columns (these are TIMESTAMP but handled correctly by Laravel/MySQL).
            $table->softDeletes(); // Adds `deleted_at` (TIMESTAMP NULLABLE).

            // Indexes for performance on common lookups
            $table->index('start_date');
            $table->index('end_date');
            $table->index('status');
            // Foreign key columns (motorbike_id, customer_id) are automatically indexed by constrained().
        });
    }

    /**
     * Reverse the migrations.
     *
     * Drops the 'rentals' table.
     */
    public function down(): void
    {
        Schema::dropIfExists('rentals');
    }
};
