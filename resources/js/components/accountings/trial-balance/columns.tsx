import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TrialBalanceAccount } from '@/types';
import { Link } from '@inertiajs/react';
import { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown, MoreHorizontal, Trash2 } from 'lucide-react';

export interface TableMeta {
    asOfDate: string;
    onDelete?: (id: number) => void;
}

export const columns: ColumnDef<TrialBalanceAccount>[] = [
    {
        accessorKey: 'name',
        header: ({ column }) => (
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                Account Name <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row, table }) => {
            const account = row.original;
            const meta = table.options.meta as TableMeta; // Access meta here

            return (
                <div className="font-medium">
                    {/* LINK ADDED HERE */}
                    <Link
                        href={route('account.ledger.detail', {
                            accountId: account.id,
                            // For Trial Balance, the drill-down should show cumulative balance
                            // so we typically set a very early start date and the current asOfDate as end date.
                            start_date: '2000-01-01', // Or your company's inception date
                            end_date: meta.asOfDate, // Use the asOfDate from the TrialBalance component
                        })}
                        className="text-indigo-600 hover:text-indigo-900 hover:underline"
                    >
                        {account.name}
                    </Link>
                </div>
            );
        },
    },
    {
        accessorKey: 'type',
        header: ({ column }) => (
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                Account Type <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
    },
    {
        accessorKey: 'debit_balance',
        header: ({ column }) => (
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                Debit Balance <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => {
            const amount = parseFloat(row.original.debit_balance.toString());
            const formatted = new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
            }).format(amount);
            return <div className="text-right font-semibold">{formatted}</div>;
        },
    },
    {
        accessorKey: 'credit_balance',
        header: ({ column }) => (
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                Credit Balance <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => {
            const amount = parseFloat(row.original.credit_balance.toString());
            const formatted = new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
            }).format(amount);
            return <div className="text-right font-semibold">{formatted}</div>;
        },
    },
    {
        id: 'actions',
        enableHiding: false,
        header: 'Actions',
        cell: ({ row, table }) => {
            const sale = row.original;
            const meta = table.options.meta as TableMeta; // Cast to your meta type

            return (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onClick={() => meta?.onDelete?.(sale.id)}
                            className="cursor-pointer text-red-600 focus:bg-red-50 focus:text-red-700 dark:text-red-500 dark:focus:bg-red-900/50 dark:focus:text-red-600"
                        >
                            <Trash2 className="mr-2 h-4 w-4 text-red-600" /> Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            );
        },
    },
];
