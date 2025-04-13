<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('customers', function (Blueprint $table) {
            // Primary Key
            $table->id(); // Auto-incrementing ID for the customer.

            // Personal Details
            $table->string('first_name'); // Customer's first name. Required.
            $table->string('last_name');  // Customer's last name. Required.
            $table->date('date_of_birth')->nullable(); // Customer's date of birth. Optional.

            // Contact Information
            $table->string('email')->unique(); // Customer's email address. Required and must be unique.
            $table->string('phone_number')->unique()->nullable(); // Customer's phone number. Optional, but unique if provided.

            // Address Information (all optional)
            $table->string('address_line_1')->nullable();
            $table->string('address_line_2')->nullable();
            $table->string('city')->nullable();
            $table->string('state_province')->nullable();
            $table->string('country')->nullable();

            // Identification (Optional - consider data privacy regulations)
            $table->string('passport_number')->unique()->nullable(); // Passport number. Optional, unique if provided.
            $table->date('passport_expiry')->nullable(); // Passport expiry date. Optional.


            // Additional Information
            $table->text('notes')->nullable(); // Any relevant notes about the customer. Optional.
            $table->foreignId('user_id')
                  ->nullable()
                  ->constrained('users') // Adds foreign key constraint to users table
                  ->onDelete('set null'); // Optional: Set creator to NULL if the user is deleted

            // Standard Timestamps & Soft Deletes
            $table->timestamps(); // Adds `created_at` and `updated_at`.
            $table->softDeletes(); // Adds `deleted_at` for soft deletion. Recommended for customer data.

            // Indexes for faster searching
            $table->index('last_name');
            $table->index('phone_number');
            // `email`, `driver_license_number`, `passport_number` are already indexed by the `unique()` constraint.
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('customers');
    }
};
