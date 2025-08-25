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
        Schema::create('accounting_transactions', function (Blueprint $table) {
            $table->id();
            $table->string('transaction_no')->unique(); // e.g., GL-001
            $table->date('transaction_date'); // Date of the transaction
            $table->text('item_description');
            $table->string('memo_ref_no')->nullable();

            // Foreign keys for debit and credit accounts
            $table->foreignId('debit_account_id')->constrained('chart_of_accounts');
            $table->foreignId('credit_account_id')->constrained('chart_of_accounts');

            $table->decimal('amount', 15, 2); // Amount of the transaction (e.g., 1000.00)
            $table->foreignId('sale_id')
                  ->nullable()
                  ->constrained('sales')
                  ->onDelete('cascade');
            $table->foreignId('expense_id')
                  ->nullable()
                  ->constrained('expenses')
                  ->onDelete('cascade');
            $table->foreignId('user_id')
                  ->nullable()
                  ->constrained('users')
                  ->onDelete('set null');

            $table->timestamps();

            $table->index('sale_id');
            $table->index('expense_id');
            $table->index('user_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('accounting_transactions');
    }
};
