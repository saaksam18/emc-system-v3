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
        Schema::create('vehicles', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('legacy_id')->nullable();

            // vehicle Details
            $table->integer('vehicle_no');
            $table->unsignedBigInteger('vehicle_make_id');
            $table->unsignedBigInteger('vehicle_model_id');
            $table->year('year'); // Manufacturing year of the vehicle. Required.
            $table->string('license_plate')->unique(); // Unique license plate number for identification. Required and must be unique.
            $table->string('vin')->unique()->nullable(); // Vehicle Identification Number (optional but good for tracking). Must be unique if provided.
            $table->string('color'); // Color of the vehicle (e.g., Red, Black, White). Optional.
            $table->integer('engine_cc')->unsigned(); // Engine displacement in cubic centimeters (e.g., 125, 150, 160). Optional, unsigned integer.
            $table->unsignedBigInteger('vehicle_class_id');
            $table->integer('compensation_price');
            $table->integer('purchase_price');
            $table->datetime('purchase_date');

            // Rental & Status Information
            $table->decimal('daily_rental_price', 8, 2)->unsigned(); // Cost to rent the vehicle per week (e.g., 15.00). Required, unsigned decimal.
            $table->decimal('weekly_rental_price', 8, 2)->unsigned(); // Cost to rent the vehicle per week (e.g., 15.00). Required, unsigned decimal.
            $table->decimal('monthly_rental_price', 8, 2)->unsigned(); // Cost to rent the vehicle per week (e.g., 15.00). Required, unsigned decimal.
            $table->unsignedBigInteger('current_status_id'); // Must match the type of 'id' in vehicle_statuses
            $table->string('current_location')->nullable(); // Current physical location (e.g., 'Phnom Penh Branch', 'Siem Reap Office'). Optional.
            $table->unsignedBigInteger('current_rental_id')->nullable();
            $table->index('current_rental_id');

            // Additional Information
            $table->text('notes')->nullable(); // Any additional notes or remarks about the vehicle (e.g., condition details, specific features). Optional.

            // Timestamps & Soft Deletes
            $table->timestamps(); // Adds `created_at` and `updated_at` columns to track record creation/modification times.
            $table->softDeletes(); // Adds a `deleted_at` column for soft deletion, allowing recovery and keeping history. Optional but recommended.

            $table->foreignId('user_id')
                  ->nullable()
                  ->constrained('users') // Adds foreign key constraint to users table
                  ->onDelete('set null'); // Optional: Set creator to NULL if the user is deleted

            // Optional: Add an index for faster lookups on status
            $table->index('vehicle_make_id');
            $table->index('vehicle_model_id');
            $table->index('vehicle_class_id');
            $table->index('current_status_id');
            $table->index('user_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('vehicles');
    }
};
