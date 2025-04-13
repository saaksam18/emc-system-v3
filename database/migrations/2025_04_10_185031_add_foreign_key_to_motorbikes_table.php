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
        Schema::table('motorbikes', function (Blueprint $table) {
            $table->foreign('current_rental_id')
                  ->references('id')
                  ->on('rentals') // Reference the 'id' column on the 'rentals' table
                  ->onDelete('restrict'); 
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('motorbikes', function (Blueprint $table) {
            $table->dropForeign(['current_rental_id']);
        });
    }
};
