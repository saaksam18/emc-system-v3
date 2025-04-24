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
        Schema::create('contacts', function (Blueprint $table) {
            $table->id();
            // Foreign key relationship to the customers table
            $table->foreignId('customer_id')
            ->constrained('customers') // Links to 'id' on 'customers' table
            ->cascadeOnDelete(); // If a customer is deleted, their contacts are also deleted

            $table->unsignedBigInteger('contact_type_id');
            $table->string('contact_value'); // The actual contact detail (e.g., email address, phone number)
            $table->boolean('is_primary')->default(false); // Is this the primary contact of its type?
            $table->string('description')->nullable(); // Optional description (e.g., 'Work Phone', 'Personal Email')

            // Fields for tracking history (Soft Delete / Inactivation)
            $table->boolean('is_active')->default(true)->index(); // Index for faster querying of active contacts
            $table->timestamp('start_date')->nullable()->comment('When this contact became active'); // Optional: track activation date
            $table->timestamp('end_date')->nullable()->comment('When this contact became inactive'); // Null if active // Any relevant notes about the customer. Optional.
            $table->foreignId('user_id')
                  ->nullable()
                  ->constrained('users') // Adds foreign key constraint to users table
                  ->onDelete('set null');

            $table->timestamps(); // Adds created_at and updated_at columns

            $table->index('customer_id');
            $table->index('contact_type_id');
            $table->index('user_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('contacts');
    }
};
