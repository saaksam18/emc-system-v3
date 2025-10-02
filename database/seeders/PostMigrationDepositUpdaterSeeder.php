<?php

namespace Database\Seeders;

use App\Models\Deposits;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class PostMigrationDepositUpdaterSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        echo "Starting deposit primary status update...\n";
        
        // Step 1: Get all customers with at least one active deposit
        $customerGroups = Deposits::where('is_active', true)
                                  ->get()
                                  ->groupBy('customer_id');

        foreach ($customerGroups as $customerId => $deposits) {
            // Check if there is only one active deposit for this customer
            if ($deposits->count() === 1) {
                $deposit = $deposits->first();
                $deposit->is_primary = true;
                $deposit->save();
            } else {
                // If there are multiple, select the most recent one to be primary
                $latestDeposit = $deposits->sortByDesc('created_at')->first();
                $latestDeposit->is_primary = true;
                $latestDeposit->save();
            }
        }

        echo "Deposit primary status update complete!\n";
    }
}
