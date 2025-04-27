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
        Schema::create('deposits', function (Blueprint $table) {
            $table->id();
            // Foreign key relationship to the customers table
            $table->foreignId('customer_id')
            ->constrained('customers')
            ->cascadeOnDelete(); // If a customer is deleted, their contacts are also deleted
            $table->foreignId('rental_id')
            ->constrained('rentals')
            ->cascadeOnDelete(); // If a rental is deleted, their contacts are also deleted

            // Identification (Optional - consider data privacy regulations)
            $table->unsignedBigInteger('type_id');
            $table->string('deposit_value');
            $table->string('registered_number')->unique()->nullable(); // Passport number. Optional, unique if provided.
            $table->date('expiry_date')->nullable();
            $table->text('description')->nullable();

            // Fields for tracking history (Soft Delete / Inactivation)
            $table->boolean('is_primary')->default(false);
            $table->boolean('is_active')->default(true)->index(); // Index for faster querying of active contacts
            $table->timestamp('start_date')->nullable()->comment('When this contact became active'); // Optional: track activation date
            $table->timestamp('end_date')->nullable()->comment('When this contact became inactive'); // Null if active // Any relevant notes about the customer. Optional.
            $table->foreignId('user_id')
                  ->nullable()
                  ->constrained('users') // Adds foreign key constraint to users table
                  ->onDelete('set null');
            $table->timestamps();

            $table->index('customer_id');
            $table->index('type_id');
            $table->index('user_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('deposits');
    }
};
