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
        Schema::create('expenses', function (Blueprint $table) {
            $table->id();
            $table->string('expense_no')->unique(); // Unique expense number
            $table->date('expense_date'); // Date of the expense
            $table->foreignId('vendor_id')->constrained('vendors');
            $table->string('item_description'); // Description of what was purchased
            $table->string('memo_ref_no')->nullable(); // Optional memo or reference number
            $table->decimal('amount', 10, 2); // Expense amount
            $table->enum('payment_type', ['cash', 'bank']);

            $table->foreignId('user_id')
                  ->nullable()
                  ->constrained('users')
                  ->onDelete('set null');
            $table->timestamps();

            $table->index('user_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('expenses');
    }
};
