'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RentalsType } from '@/types'; // Assuming types are defined here
import { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown } from 'lucide-react';

// Helper component for displaying input errors
const InputError = ({ message }: { message?: string }) => (message ? <p className="mt-1 text-sm text-red-600 dark:text-red-400">{message}</p> : null);

// Define the structure for metadata passed to the table
export interface TableMeta {
    globalFilter?: string;
    onGlobalFilterChange?: (value: string) => void;
}

// --- Column Definitions ---
export const columns: ColumnDef<RentalsType, TableMeta>[] = [
    // ... other column definitions remain the same ...
    {
        accessorKey: 'id',
        header: ({ column }) => (
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                ID <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => <div>{row.getValue('id')}</div>,
    },
    {
        accessorKey: 'vehicle_no',
        header: ({ column }) => (
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                Vehicle No <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => row.original.vehicle_no || 'N/A',
    },
    {
        accessorKey: 'full_name',
        header: ({ column }) => (
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                Name <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => row.original.full_name || 'N/A',
    },
    {
        id: 'primary_contact_and_count',
        accessorKey: 'primary_contact_type',
        header: ({ column }) => (
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                Primary Contact <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => {
            const type = row.original.primary_contact_type;
            const contact = row.original.primary_contact;
            const count = row.original.active_contact_count;
            return (
                <div className="flex items-center space-x-2">
                    <span className="font-bold">{type}:</span>
                    <span>{contact}</span>
                    {count > 0 && <Badge variant="secondary">Total: {count}</Badge>}
                </div>
            );
        },
    },
    {
        id: 'primary_deposit_and_count',
        accessorKey: 'primary_deposit_type',
        header: ({ column }) => (
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                Primary Deposit <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => {
            const type = row.original.primary_deposit_type;
            const deposit = row.original.primary_deposit;
            const count = row.original.active_deposits_count;
            return (
                <div className="flex items-center space-x-2">
                    <span className="font-bold">{type}:</span>
                    <span>{deposit}</span>
                    {count > 0 && <Badge variant="secondary">Total: {count}</Badge>}
                </div>
            );
        },
    },
    {
        accessorKey: 'status_name',
        header: ({ column }) => (
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                Status <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => {
            const status = row.original.status_name;
            return (
                <div className="flex items-center space-x-2">
                    <Badge variant="default">{status}</Badge>
                </div>
            );
        },
    },
    {
        accessorKey: 'start_date',
        header: ({ column }) => (
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                Start Date <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => {
            try {
                const startDate = new Date(row.original.start_date);
                return startDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
            } catch (e) {
                return 'N/A';
            }
        },
    },
    {
        accessorKey: 'end_date',
        header: ({ column }) => (
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                End Date <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => {
            try {
                const endDate = new Date(row.original.end_date);
                return endDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
            } catch (e) {
                return 'N/A';
            }
        },
    },
    {
        accessorKey: 'total_cost',
        header: ({ column }) => (
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                Price <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => {
            const amount = parseFloat(row.getValue('total_cost'));
            const formatted = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
            return <div className="text-center font-medium">{formatted}</div>;
        },
    },
    {
        accessorKey: 'notes',
        header: ({ column }) => (
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                Note <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => row.original.notes || 'N/A',
    },
    {
        accessorKey: 'period',
        header: ({ column }) => (
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                Period <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => {
            const period = row.original.period;
            const overdue = row.original.overdue;
            return (
                <div className="flex items-center space-x-2">
                    <Badge variant="secondary">{period}</Badge> {overdue && <Badge variant="destructive">Overdue: {overdue}</Badge>}
                </div>
            );
        },
    },
    {
        accessorKey: 'created_at',
        header: ({ column }) => (
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                Registered <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => {
            try {
                const createdAt = new Date(row.original.created_at);
                return createdAt.toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true,
                });
            } catch (e) {
                return row.original.created_at;
            }
        },
    },
    {
        accessorKey: 'incharger_name',
        header: ({ column }) => (
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                Incharger <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => row.original.incharger_name || 'N/A',
    },
    {
        accessorKey: 'user_name',
        header: ({ column }) => (
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                Inputer <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => row.original.user_name || 'N/A',
    },
];
