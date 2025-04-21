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
            $table->string('gender')->nullable(); // Customer's gender. Optional.
            $table->string('nationality')->nullable(); // Customer's nationality. Optional.

            // Address Information (all optional)
            $table->string('address_line_1')->nullable();
            $table->string('address_line_2')->nullable();
            $table->string('commune')->nullable();
            $table->string('district')->nullable();
            $table->string('city')->nullable();

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
            $table->index('user_id');
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
