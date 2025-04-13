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
        Schema::table('vehicle_actual_models', function (Blueprint $table) {
            $table->foreign('maker_id')
                  ->references('id')
                  ->on('vehicle_makers')
                  ->onDelete('restrict');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('vehicle_actual_models', function (Blueprint $table) {
            $table->dropForeign(['maker_id']);
        });
    }
};
