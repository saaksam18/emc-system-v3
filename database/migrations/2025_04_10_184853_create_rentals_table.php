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
            $table->unsignedBigInteger('legacy_id')->nullable();

            // Foreign Keys - Linking to other tables
            // Assumes 'vehicles' table exists with an 'id' column. Restricts deletion if rentals exist.
            $table->foreignId('vehicle_id')
                  ->constrained('vehicles') // Links to the 'id' column on the 'vehicles' table
                  ->onDelete('restrict') // Prevent deleting a vehicle if it has associated rentals
                  ->onUpdate('cascade'); // Update rental's vehicle_id if vehicle's id changes (less common)

            // Assumes a 'customers' table exists. Change 'customers' to 'users' if using the default users table.
            $table->foreignId('customer_id')
                  ->constrained('customers') // Links to the 'id' column on the 'customers' table
                  ->onDelete('restrict') // Prevent deleting a customer if they have rentals
                  ->onUpdate('cascade');

            // Rental Period Timestamps - Changed to DATETIME to avoid MySQL default value issues
            $table->dateTime('start_date'); // Date and time when the rental period begins. Required.
            $table->dateTime('end_date');   // Scheduled date and time for the rental period to end. Required.
            $table->string('period');
            $table->dateTime('coming_date')->nullable();
            $table->dateTime('actual_start_date'); // Actual date and time the vehicle start rented. Not effected by any rental status other than New Rental.
            $table->dateTime('actual_return_date')->nullable(); // Actual date and time the vehicle was returned. Nullable until returned.

            // Financials & Status
            $table->integer('total_cost')->nullable(); // Total calculated cost for the rental. Nullable, might be set upon completion. Unsigned.
            $table->boolean('is_active')->default(false);
            $table->string('status');

            // Additional Information
            $table->text('helmet_amount')->nullable();
            $table->text('notes')->nullable(); // Optional notes about the rental (e.g., special conditions, damage report ID).
            $table->foreignId('incharger_id')
                  ->nullable()
                  ->constrained('users') // Adds foreign key constraint to users table
                  ->onDelete('set null'); 
            $table->foreignId('user_id')
                  ->nullable()
                  ->constrained('users') // Adds foreign key constraint to users table
                  ->onDelete('set null'); 

            // Standard Timestamps & Soft Deletes
            $table->timestamps(); // Adds `created_at` and `updated_at` columns (these are TIMESTAMP but handled correctly by Laravel/MySQL).
            $table->softDeletes(); // Adds `deleted_at` (TIMESTAMP NULLABLE).

            // Versioning Information
            $table->timestamp('version_timestamp')->default(DB::raw('CURRENT_TIMESTAMP'))->index();
            $table->boolean('is_latest_version')->default(true);

            // Indexes for performance on common lookups
            $table->index('start_date');
            $table->index('end_date');
            $table->index('is_latest_version');
            // Foreign key columns (vehicle_id, customer_id) are automatically indexed by constrained().
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
