<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

use App\Models\Accountings\ChartOfAccounts;
use App\AccountType;

class ChartOfAccountSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $accounts = [
            //* --- Core Accounts (Assets & Liabilities) ---
            ['name' => 'Cash', 'type' => AccountType::Asset],
            ['name' => 'Bank Account (ABA)', 'type' => AccountType::Asset],
            ['name' => 'Bank Account (ACLEDA)', 'type' => AccountType::Asset],
            ['name' => 'Accounts Receivable', 'type' => AccountType::Asset],
            ['name' => 'Supplies (Asset)', 'type' => AccountType::Asset],
            ['name' => 'Accounts Payable', 'type' => AccountType::Liability],
            ['name' => 'Notes Payable', 'type' => AccountType::Liability],
            ['name' => 'Owner\'s Equity', 'type' => AccountType::Equity],

            //* --- Income Accounts ---
            // Motorbike Rental Income
            ['name' => 'AT Rental', 'type' => AccountType::Revenue],
            ['name' => '50cc AT Rental', 'type' => AccountType::Revenue],
            ['name' => 'Big AT Rental', 'type' => AccountType::Revenue],
            ['name' => 'MT Rental', 'type' => AccountType::Revenue],
            // Motorbike Other Income
            ['name' => 'Helmet Income', 'type' => AccountType::Revenue],
            ['name' => 'Repair Income', 'type' => AccountType::Revenue],
            ['name' => 'Oil Income', 'type' => AccountType::Revenue],
            ['name' => 'Gasoline Income', 'type' => AccountType::Revenue],
            ['name' => 'Other Motor Income', 'type' => AccountType::Revenue],
            ['name' => 'Key Income', 'type' => AccountType::Revenue],

            // Visa Income
            ['name' => 'Basic Visa Income', 'type' => AccountType::Revenue],
            ['name' => 'Overstay Income', 'type' => AccountType::Revenue],
            ['name' => 'No Patent Income', 'type' => AccountType::Revenue],
            ['name' => 'Skip WP Income', 'type' => AccountType::Revenue],
            ['name' => 'Visa Express Income', 'type' => AccountType::Revenue],
            ['name' => 'Visa Letter Income', 'type' => AccountType::Revenue],
            ['name' => 'FPCS Income', 'type' => AccountType::Revenue],
            ['name' => 'Photo Shooting', 'type' => AccountType::Revenue],
            ['name' => 'Visa VIP Income', 'type' => AccountType::Revenue],
            ['name' => 'Visa Run Income', 'type' => AccountType::Revenue],
            ['name' => 'VN Basic Visa Extension', 'type' => AccountType::Revenue],
            ['name' => 'Other Visa Income', 'type' => AccountType::Revenue],

            // WP Income
            ['name' => 'Basic WP Income', 'type' => AccountType::Revenue],
            ['name' => 'WP Express Income', 'type' => AccountType::Revenue],
            ['name' => 'WP Penalty Income', 'type' => AccountType::Revenue],
            ['name' => 'WP Document Income', 'type' => AccountType::Revenue],
            ['name' => 'Other WP Income', 'type' => AccountType::Revenue],

            // Driver License Income
            ['name' => 'Driver License Income', 'type' => AccountType::Revenue],

            // Payment Income
            ['name' => 'Credit Card Commission Income', 'type' => AccountType::Revenue],
            ['name' => 'USDT Income', 'type' => AccountType::Revenue],

            // Bank Interest
            ['name' => 'ABA Bank Interest Income', 'type' => AccountType::Revenue],
            ['name' => 'ACLEDA Bank Interest Income', 'type' => AccountType::Revenue],

            // Other Income
            ['name' => 'House Rental Income', 'type' => AccountType::Revenue],
            ['name' => 'Other Income', 'type' => AccountType::Revenue],

            //* Special Income
            // Motorbike
            ['name' => 'Selling Motorbike Income', 'type' => AccountType::Revenue],
            ['name' => 'Motor Compensation Income', 'type' => AccountType::Revenue],

            //* Not Related Income
            // Borrowed Money
            ['name' => 'Debt Income', 'type' => AccountType::Revenue],
            ['name' => 'Customer Deposit', 'type' => AccountType::Revenue],

            //* --- Expense Accounts ---
            // Refund Expense
            ['name' => 'Rental Fee Refund', 'type' => AccountType::Expense],
            ['name' => 'Visa Fee Refund', 'type' => AccountType::Expense],
            ['name' => 'WP Fee Refund', 'type' => AccountType::Expense],
            ['name' => 'Driver License Refund', 'type' => AccountType::Expense],
            ['name' => 'Other Refund', 'type' => AccountType::Expense],

            // Motorbike Expense
            ['name' => 'Motorbike Goods', 'type' => AccountType::Expense],
            ['name' => 'Repair to 3rd Party', 'type' => AccountType::Expense],
            ['name' => 'Stock Gasoline', 'type' => AccountType::Expense],
            ['name' => 'Helmet Expense', 'type' => AccountType::Expense],
            ['name' => 'Other Motor Expense', 'type' => AccountType::Expense],

            // Visa Expense
            ['name' => 'Basic Visa Expense', 'type' => AccountType::Expense],
            ['name' => 'Overstay Expense', 'type' => AccountType::Expense],
            ['name' => 'No Patent Expense', 'type' => AccountType::Expense],
            ['name' => 'Skip WP Expense', 'type' => AccountType::Expense],
            ['name' => 'Visa Express Expense', 'type' => AccountType::Expense],
            ['name' => 'Visa Letter Expense', 'type' => AccountType::Expense],
            ['name' => 'FPCS Expense', 'type' => AccountType::Expense],
            ['name' => 'Visa VIP Expense', 'type' => AccountType::Expense],
            ['name' => 'Visa Run Expense', 'type' => AccountType::Expense],
            ['name' => 'VN Basic Visa Expense', 'type' => AccountType::Expense],
            ['name' => 'Other Visa Expense', 'type' => AccountType::Expense],

            // WP Expense
            ['name' => 'Basic WP Expense', 'type' => AccountType::Expense],
            ['name' => 'WP Express Expense', 'type' => AccountType::Expense],
            ['name' => 'WP Penalty Expense', 'type' => AccountType::Expense],
            ['name' => 'WP Document Expense', 'type' => AccountType::Expense],
            ['name' => 'Other WP Expense', 'type' => AccountType::Expense],

            // Driver License Expense
            ['name' => 'Driver License Expense', 'type' => AccountType::Expense],

            // Regular Labor Expense
            ['name' => 'Basic Salary', 'type' => AccountType::Expense],
            ['name' => 'Incentive', 'type' => AccountType::Expense],

            // Welfare Fee
            ['name' => 'Lunch Fee', 'type' => AccountType::Expense],
            ['name' => 'NSSF', 'type' => AccountType::Expense],
            ['name' => 'Company Travel Fee', 'type' => AccountType::Expense],
            ['name' => 'Other Welfare Fee', 'type' => AccountType::Expense],

            // Utilities
            ['name' => 'Utilities', 'type' => AccountType::Expense],

            // Digital Service Expense
            ['name' => 'Top-Up Expense', 'type' => AccountType::Expense],
            ['name' => 'IT Service Expense', 'type' => AccountType::Expense],

            // Tax
            ['name' => 'TAX', 'type' => AccountType::Expense],

            // Office
            ['name' => 'Office Consumable', 'type' => AccountType::Expense],
            ['name' => 'Office Equipment', 'type' => AccountType::Expense],

            // Sales Promotion
            ['name' => 'Material Advertisement Expense', 'type' => AccountType::Expense],
            ['name' => 'IT Advertisement Expense', 'type' => AccountType::Expense],

            // Other Expense
            ['name' => 'Other Expense', 'type' => AccountType::Expense],

            // Motorbike Special Expense
            ['name' => 'Initial Repair', 'type' => AccountType::Expense],
            ['name' => 'Motorbike Purchase', 'type' => AccountType::Expense],

            // Renovation Expense
            ['name' => 'Renovation Expense', 'type' => AccountType::Expense],

            // Special Labor Cost
            ['name' => 'Training Expense', 'type' => AccountType::Expense],
            ['name' => 'Retirement Salary', 'type' => AccountType::Expense],
            
            // Money for Return
            ['name' => 'Customer Deposit Back', 'type' => AccountType::Expense],
            ['name' => 'Debt Back', 'type' => AccountType::Expense],
            
            // EMC Saving
            ['name' => 'EMC Saving In', 'type' => AccountType::Expense],

            // Pepper Expense
            ['name' => 'Pepper Expense', 'type' => AccountType::Expense],
        ];

        foreach ($accounts as $account) {
            ChartOfAccounts::create($account);
        }
    }
}
