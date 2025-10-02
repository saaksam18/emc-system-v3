<?php

namespace Database\Seeders;

use App\Models\Customers;
use App\Models\Rentals;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class LegacyDepositSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Caching new deposit types (similar to contact types)
        $depositTypes = DB::table('deposit_types')->pluck('id', 'name')->toArray();

        echo 'Migrating deposits... \n';
        $legacyDeposits = DB::connection('legacy_mysql')->table('tbl_deposit')->get();

        foreach ($legacyDeposits as $legacyDeposit) {
            // Step 1: Look up new IDs for foreign keys
            $newCustomer = Customers::where('legacy_id', $legacyDeposit->customerID)->first();
            $newRental = Rentals::where('legacy_id', $legacyDeposit->rentalID)->first();
            $newUser = User::where('legacy_id', $legacyDeposit->userID)->first();

            // Handle missing relationships by skipping the record
            if (!$newCustomer || !$newRental || !$newUser) {
                echo "Skipping deposit with legacy_id: {$legacyDeposit->depositID} due to missing related record.\n";
                continue;
            }

            // Step 2: Get the type ID
            $depositTypeName = $legacyDeposit->currDepositType;
            $typeId = $depositTypes[$depositTypeName] ?? null;

            if (!$typeId) {
                echo "Deposit type '{$depositTypeName}' not found. Skipping deposit.\n";
                continue;
            }

            // Step 3: Handle the 'is_active' to date conversion
            $isActive = ($legacyDeposit->is_Active == 1);
            $startDate = null;
            $endDate = null;

            if ($isActive) {
                $startDate = $legacyDeposit->created_at;
            } else {
                $startDate = $legacyDeposit->created_at;
                $endDate = $legacyDeposit->updated_at;
            }

            // Step 4: Insert the transformed data into the new deposits table
            DB::table('deposits')->insert([
                'customer_id' => $newCustomer->id,
                'rental_id' => $newRental->id,
                'type_id' => $typeId,
                'deposit_value' => $legacyDeposit->currDeposit,
                'description' => $legacyDeposit->comment,
                'is_primary' => false, // No direct equivalent, set to a default value
                'is_active' => $isActive,
                'start_date' => $startDate,
                'end_date' => $endDate,
                'user_id' => $newUser->id,
                'legacy_id' => $legacyDeposit->depositID, // Add a legacy_id column if you need it later
                'created_at' => $legacyDeposit->created_at,
                'updated_at' => $legacyDeposit->updated_at,
            ]);
        }
        echo 'Deposits migrated successfully!\n';
    }
}
