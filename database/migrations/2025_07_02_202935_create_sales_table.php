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
        Schema::create('sales', function (Blueprint $table) {
            $table->id(); // Auto-incrementing primary key
            $table->string('sale_no')->unique(); // Unique sale number, e.g., SALE-0001
            $table->date('sale_date'); // Date of the sale
            $table->foreignId('customer_id')->constrained('customers');
            $table->string('item_description'); // Description of the item/service sold
            $table->string('memo_ref_no')->nullable(); // Optional memo or reference number
            $table->decimal('amount', 10, 2); // Sale amount (e.g., 10 digits total, 2 after decimal)
            $table->enum('payment_type', ['cash', 'bank', 'credit']); // Payment method

            // Foreign keys will be handled in the AccountingTransaction model,
            // as the sale itself doesn't directly store debit/credit accounts.
            // The relationship is from AccountingTransaction to Sale.

            $table->foreignId('user_id')
                  ->nullable()
                  ->constrained('users')
                  ->onDelete('set null');
            $table->timestamps(); // created_at and updated_at columns
            
            $table->index('user_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sales');
    }
};
