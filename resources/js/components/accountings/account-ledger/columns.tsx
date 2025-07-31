// resources/js/components/accountings/account-ledger/columns.tsx

import { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';

// Define the shape of your transaction data item for the table
// This should match the structure you return from your Laravel controller
export interface AccountLedgerTransaction {
    id: number;
    transaction_date: string;
    description: string;
    debit_account_name: string;
    credit_account_name: string;
    transaction_type_name: string;
    amount: number;
    debit: number | null; // Amount if it was a debit to THIS account
    credit: number | null; // Amount if it was a credit to THIS account
    running_balance: number;
}

// Helper function for currency formatting (can also be in a shared utility file)
const formatCurrency = (value: number): string => {
    return value.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

// Helper function for date formatting
const formatDateForDisplay = (dateString: string): string => {
    return format(new Date(dateString), 'MMM dd, yyyy');
};

export const columns: ColumnDef<AccountLedgerTransaction>[] = [
    {
        accessorKey: 'transaction_date',
        header: 'Date',
        cell: ({ row }) => formatDateForDisplay(row.getValue('transaction_date')),
    },
    {
        accessorKey: 'description',
        header: 'Description',
    },
    {
        accessorKey: 'transaction_type_name',
        header: 'Type',
    },
    {
        accessorKey: 'debit_account_name',
        header: 'Debit Account',
    },
    {
        accessorKey: 'credit_account_name',
        header: 'Credit Account',
    },
    {
        accessorKey: 'debit',
        header: () => <div className="text-right">Debit</div>,
        cell: ({ row }) => {
            const debit = row.original.debit;
            return <div className="text-right">{debit !== null ? formatCurrency(debit) : ''}</div>;
        },
    },
    {
        accessorKey: 'credit',
        header: () => <div className="text-right">Credit</div>,
        cell: ({ row }) => {
            const credit = row.original.credit;
            return <div className="text-right">{credit !== null ? formatCurrency(credit) : ''}</div>;
        },
    },
    {
        accessorKey: 'running_balance',
        header: () => <div className="text-right">Balance</div>,
        cell: ({ row }) => {
            const balance = row.original.running_balance;
            return <div className="text-right font-medium">{formatCurrency(balance)}</div>;
        },
    },
];
