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
        Schema::table('roles', function (Blueprint $table) {
            // Add the column to store the user ID
            // Use foreignId for convention, ensures unsigned big integer
            // Make it nullable if roles can be created without a user (e.g., seeders)
            // Add 'after' to place it logically in the table structure (optional)
            $table->foreignId('user_id')
                  ->nullable()
                  ->after('guard_name') // Or choose another column to place it after
                  ->constrained('users') // Adds foreign key constraint to users table
                  ->onDelete('set null'); // Optional: Set creator to NULL if the user is deleted
                  // Alternative onDelete options: ->onDelete('cascade') (deletes role if user deleted - less common)
                  // Or omit onDelete to use database default / restrict deletion
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('roles', function (Blueprint $table) {
            // Ensure the foreign key constraint is dropped before the column
            // Laravel convention: {table}_{column}_foreign
            $table->dropForeign(['user_id']);
            $table->dropColumn('user_id');
        });
    }
};
