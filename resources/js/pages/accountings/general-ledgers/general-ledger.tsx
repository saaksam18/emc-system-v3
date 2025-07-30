import AppLayout from '@/layouts/app-layout';
import { BreadcrumbItem, ChartOfAccountTypes, Transaction } from '@/types';
// Import useForm and router from Inertia.js
import { Deferred, Head, useForm, usePage } from '@inertiajs/react'; // ADDED 'useForm', 'router'

import { format } from 'date-fns';
// Import ChevronsUpDown for the combobox trigger icon
import { BookOpen, Calendar as CalendarIcon, Check, ChevronsUpDown, List, PlusCircle, Tag } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';

// Shadcn UI Components
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
// Select components are no longer directly used for debit/credit, but keep if used elsewhere

// Shadcn Command for searchable dropdown
import { columns, TableMeta } from '@/components/accountings/general-ledger/columns';
import { DataTable } from '@/components/accountings/general-ledger/data-table';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils'; // Import cn utility for conditional classNames
import { toast } from 'sonner';

/**
 * Skeleton component for displaying loading placeholders.
 */
const Skeleton = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>, ref) => {
        return <div ref={ref} className={cn('bg-muted animate-pulse rounded-md', className || '')} {...props} />;
    },
);
Skeleton.displayName = 'Skeleton';

interface SkeletonTableProps {
    rowCount?: number;
    columnCount?: number;
    minWidth?: string; // Optional min-width for the table
    columnWidths?: string[]; // Optional specific widths for columns
}

/**
 * Renders a skeleton representation of a data table during loading.
 */
function SkeletonTable({
    rowCount = 5,
    columnCount = 4,
    minWidth = '600px', // Default min-width
    columnWidths = ['w-12', 'w-2/5', 'w-1/4', 'w-1/6', 'w-16'], // Default widths
}: SkeletonTableProps) {
    return (
        <div className="border-border overflow-x-auto rounded-lg border shadow-sm">
            <table style={{ minWidth: minWidth }} className="bg-card text-card-foreground w-full table-auto border-collapse">
                <thead className="bg-muted/50">
                    <tr>
                        {Array.from({ length: columnCount }).map((_, index) => (
                            <th key={`skel-head-${index}`} className="text-muted-foreground p-3 text-left text-sm font-semibold">
                                <Skeleton className={`h-5 ${columnWidths[index % columnWidths.length] || 'w-full'} bg-gray-300`} />
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-border divide-y">
                    {Array.from({ length: rowCount }).map((_, rowIndex) => (
                        <tr key={`skeleton-row-${rowIndex}`} className="hover:bg-muted/50">
                            {Array.from({ length: columnCount }).map((_, colIndex) => (
                                <td key={`skeleton-cell-${rowIndex}-${colIndex}`} className="p-3">
                                    <Skeleton className={`h-4 ${columnWidths[colIndex % columnWidths.length] || 'w-full'} bg-gray-300`} />
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// --- Breadcrumbs ---
const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'General Ledger',
        href: '/general-ledger',
    },
];

// Updated FormData to match the names Laravel expects in the request
interface FormData {
    transaction_date: string;
    item_description: string;
    memo_ref_no: string;
    debit_account_id: string;
    credit_account_id: string;
    amount: string;
}

interface GeneralLedgerProps {
    transactions: Transaction[];
    chartOfAccounts: ChartOfAccountTypes[];
    flash?: {
        success?: string;
        error?: string;
        errors?: Record<string, string | string[]>;
    };
}

export default function GeneralLedger({ transactions: initialTransactions, chartOfAccounts }: GeneralLedgerProps) {
    const { props: pageProps } = usePage<GeneralLedgerProps>();

    // Effect for flash messages
    useEffect(() => {
        const flash = pageProps.flash;
        if (flash?.success) {
            toast.success(flash.success);
        }
        if (flash?.error) {
            toast.error(flash.error);
        }
        if (flash?.errors && typeof flash.errors === 'object' && flash.errors !== null) {
            Object.values(flash.errors)
                .flat()
                .forEach((message) => {
                    if (message) {
                        toast.error(String(message));
                    }
                });
        }
    }, [pageProps.flash]);
    // Use Inertia's useForm hook for form management
    const {
        data,
        setData,
        post,
        processing,
        errors: formErrors,
        reset,
        delete: inertiaDelete,
    } = useForm<FormData>({
        transaction_date: format(new Date(), 'yyyy-MM-dd'), // Match Laravel's expected field name
        item_description: '',
        memo_ref_no: '',
        debit_account_id: '',
        credit_account_id: '',
        amount: '',
    });

    // `accounts` should directly come from `chartOfAccounts` prop
    const accounts = chartOfAccounts;

    // State for the Popover's open/close status for date picker
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

    // States for the Popover's open/close status for searchable selects
    const [isDebitSelectOpen, setIsDebitSelectOpen] = useState(false);
    const [isCreditSelectOpen, setIsCreditSelectOpen] = useState(false);

    // Use setData from useForm
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        // The name attribute on input elements must match the FormData keys
        setData(name as keyof FormData, value);
    };

    // Handler for the Shadcn Calendar component - Use setData from useForm
    const handleDateChange = (selectedDate?: Date) => {
        if (selectedDate) {
            setData('transaction_date', format(selectedDate, 'yyyy-MM-dd')); // Update `transaction_date`
        } else {
            setData('transaction_date', '');
        }
        setIsDatePickerOpen(false);
        // Errors will be handled by Inertia's `formErrors`
    };

    // Handler for searchable select components - Use setData from useForm
    const handleAccountSelect = (
        name: 'debit_account_id' | 'credit_account_id', // Changed to match FormData keys
        accountId: string,
        setOpen: React.Dispatch<React.SetStateAction<boolean>>,
    ) => {
        setData(name, accountId); // Use setData
        setOpen(false); // Close the popover
        // Errors will be handled by Inertia's `formErrors`
    };

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        post(route('general-ledger.store'), {
            onSuccess: () => {
                reset();
            },
            onError: (errors) => {
                console.error('Form submission errors:', errors);
            },
        });
    };

    const handleDelete = (id: number) => {
        if (confirm('Are you sure you want to delete this transaction?')) {
            // Use Inertia's `delete` method
            // The route name should match what's defined in routes/web.php
            inertiaDelete(route('general-ledger.destroy', id), {
                onSuccess: () => {
                    // Inertia will automatically re-fetch the page data and re-render
                    // No need for setTransactions locally.
                },
                onError: (errors) => {
                    console.error('Deletion errors:', errors);
                },
            });
        }
    };

    // Helper to get account name by ID for display in button
    const getAccountName = (accountId: string) => {
        const account = accounts.find((acc) => String(acc.id) === accountId);
        return account ? `${account.name} (${account.type})` : 'Select account';
    };

    const [globalFilter, setGlobalFilter] = useState('');

    // --- Table Meta ---
    const tableMeta: TableMeta = useMemo(
        () => ({
            // Memoize meta object
            globalFilter: globalFilter,
            onGlobalFilterChange: setGlobalFilter,
        }),
        [globalFilter],
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="General Ledger" />

            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Transaction Entry Form */}
                <Card className="dark:bg-background bg-gray-50">
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <PlusCircle className="mr-2 text-blue-500" size={18} /> Add New Transaction (Manual Journal Entry)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            {/* Date Picker Field */}
                            <div className="flex flex-col gap-2">
                                <Label htmlFor="transaction_date" className="px-1">
                                    {/* Changed htmlFor */}
                                    Date
                                </Label>
                                <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={'outline'}
                                            className={cn(
                                                'w-48 justify-between text-left font-normal',
                                                !data.transaction_date && 'text-muted-foreground', // Use data
                                                formErrors.transaction_date && 'border-red-500', // Use formErrors
                                            )}
                                        >
                                            {data.transaction_date ? format(new Date(data.transaction_date), 'PPP') : 'Select date'} {/* Use data */}
                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={data.transaction_date ? new Date(data.transaction_date) : undefined} // Use data
                                            captionLayout="dropdown"
                                            onSelect={handleDateChange}
                                            toYear={new Date().getFullYear() + 20}
                                        />
                                    </PopoverContent>
                                </Popover>
                                {formErrors.transaction_date && <p className="mt-1 text-sm text-red-600">{formErrors.transaction_date}</p>}{' '}
                                {/* Use formErrors */}
                            </div>
                            <div className="hidden md:block"></div> {/* Placeholder for grid layout */}
                            <div>
                                <Label htmlFor="item_description" className="mb-1">
                                    {' '}
                                    {/* Changed htmlFor */}
                                    Item Desc
                                </Label>
                                <div className="relative">
                                    <Input
                                        type="text"
                                        id="item_description"
                                        name="item_description" // Changed name
                                        value={data.item_description} // Use data
                                        onChange={handleChange}
                                        placeholder="e.g., Office supplies, July rent, Service for Customer A"
                                        className={`${formErrors.item_description ? 'border-red-500' : ''}`} // Use formErrors
                                    />
                                    <Tag className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400" size={18} />
                                </div>
                                {formErrors.item_description && <p className="mt-1 text-sm text-red-600">{formErrors.item_description}</p>}{' '}
                                {/* Use formErrors */}
                            </div>
                            <div>
                                <Label htmlFor="memo_ref_no" className="mb-1">
                                    {' '}
                                    {/* Changed htmlFor */}
                                    Memo/Ref No.
                                </Label>
                                <div className="relative">
                                    <Input
                                        type="text"
                                        id="memo_ref_no"
                                        name="memo_ref_no" // Changed name
                                        value={data.memo_ref_no} // Use data
                                        onChange={handleChange}
                                        placeholder="Optional: Check #, Vendor Name, Project Code"
                                        className={`${formErrors.memo_ref_no ? 'border-red-500' : ''}`} // Use formErrors
                                    />
                                    <BookOpen className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400" size={18} />
                                </div>
                                {formErrors.memo_ref_no && <p className="mt-1 text-sm text-red-600">{formErrors.memo_ref_no}</p>}{' '}
                                {/* Use formErrors */}
                            </div>
                            {/* Debit Account - Searchable Combobox */}
                            <div>
                                <Label htmlFor="debit_account_id" className="mb-1">
                                    {' '}
                                    {/* Changed htmlFor */}
                                    Debit Account
                                </Label>
                                <Popover open={isDebitSelectOpen} onOpenChange={setIsDebitSelectOpen}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={isDebitSelectOpen}
                                            className={cn(
                                                'w-full justify-between',
                                                !data.debit_account_id && 'text-muted-foreground', // Use data
                                                formErrors.debit_account_id && 'border-red-500', // Use formErrors
                                            )}
                                        >
                                            {data.debit_account_id ? getAccountName(data.debit_account_id) : 'Select a Debit Account'}{' '}
                                            {/* Use data */}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                        <Command>
                                            <CommandInput placeholder="Search account..." />
                                            <CommandList className="max-h-60 overflow-y-auto">
                                                {' '}
                                                {/* Added max-h and overflow-y-auto */}
                                                <CommandEmpty>No account found.</CommandEmpty>
                                                <CommandGroup>
                                                    {accounts.map((account) => (
                                                        <CommandItem
                                                            key={account.id}
                                                            value={`${account.name} (${account.type})`} // Value for search
                                                            onSelect={(currentValue) => {
                                                                const selectedAccount = accounts.find(
                                                                    (acc) => `${acc.name} (${acc.type})` === currentValue,
                                                                );
                                                                if (selectedAccount) {
                                                                    handleAccountSelect(
                                                                        'debit_account_id', // Changed name
                                                                        String(selectedAccount.id),
                                                                        setIsDebitSelectOpen,
                                                                    );
                                                                }
                                                            }}
                                                        >
                                                            <Check
                                                                className={cn(
                                                                    'mr-2 h-4 w-4',
                                                                    data.debit_account_id === String(account.id) ? 'opacity-100' : 'opacity-0', // Use data
                                                                )}
                                                            />
                                                            {account.name} ({account.type})
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                                {formErrors.debit_account_id && <p className="mt-1 text-sm text-red-600">{formErrors.debit_account_id}</p>}{' '}
                                {/* Use formErrors */}
                            </div>
                            {/* Credit Account - Searchable Combobox */}
                            <div>
                                <Label htmlFor="credit_account_id" className="mb-1">
                                    {' '}
                                    {/* Changed htmlFor */}
                                    Credit Account
                                </Label>
                                <Popover open={isCreditSelectOpen} onOpenChange={setIsCreditSelectOpen}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={isCreditSelectOpen}
                                            className={cn(
                                                'w-full justify-between',
                                                !data.credit_account_id && 'text-muted-foreground', // Use data
                                                formErrors.credit_account_id && 'border-red-500', // Use formErrors
                                            )}
                                        >
                                            {data.credit_account_id ? getAccountName(data.credit_account_id) : 'Select a Credit Account'}{' '}
                                            {/* Use data */}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                        <Command>
                                            <CommandInput placeholder="Search account..." />
                                            <CommandList className="max-h-60 overflow-y-auto">
                                                {' '}
                                                {/* Added max-h and overflow-y-auto */}
                                                <CommandEmpty>No account found.</CommandEmpty>
                                                <CommandGroup>
                                                    {accounts.map((account) => (
                                                        <CommandItem
                                                            key={account.id}
                                                            value={`${account.name} (${account.type})`}
                                                            onSelect={(currentValue) => {
                                                                const selectedAccount = accounts.find(
                                                                    (acc) => `${acc.name} (${acc.type})` === currentValue,
                                                                );
                                                                if (selectedAccount) {
                                                                    handleAccountSelect(
                                                                        'credit_account_id', // Changed name
                                                                        String(selectedAccount.id),
                                                                        setIsCreditSelectOpen,
                                                                    );
                                                                }
                                                            }}
                                                        >
                                                            <Check
                                                                className={cn(
                                                                    'mr-2 h-4 w-4',
                                                                    data.credit_account_id === String(account.id) ? 'opacity-100' : 'opacity-0', // Use data
                                                                )}
                                                            />
                                                            {account.name} ({account.type})
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                                {formErrors.credit_account_id && <p className="mt-1 text-sm text-red-600">{formErrors.credit_account_id}</p>}{' '}
                                {/* Use formErrors */}
                            </div>
                            <div className="md:col-span-2">
                                <Label htmlFor="amount" className="mb-1">
                                    Amount
                                </Label>
                                <div className="relative">
                                    <Input
                                        type="number"
                                        id="amount"
                                        name="amount"
                                        value={data.amount} // Use data
                                        onChange={handleChange}
                                        step="0.01"
                                        min="0.01"
                                        placeholder="0.00"
                                        className={`pl-8 ${formErrors.amount ? 'border-red-500' : ''}`} // Use formErrors
                                    />
                                    <span className="absolute top-1/2 left-3 -translate-y-1/2 font-semibold text-gray-500">$</span>
                                </div>
                                {formErrors.amount && <p className="mt-1 text-sm text-red-600">{formErrors.amount}</p>} {/* Use formErrors */}
                            </div>
                            <div className="mt-4 flex justify-end md:col-span-2">
                                <Button type="submit" disabled={processing}>
                                    {/* Disable button during processing */}
                                    <PlusCircle className="mr-2" size={20} /> {processing ? 'Recording...' : 'Record Transaction'}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                {/* Transactions List */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <List className="mr-2 text-blue-500" size={18} />
                            Transaction History
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Deferred data="transactions" fallback={<SkeletonTable rowCount={5} columnCount={columns.length} />}>
                            <DataTable columns={columns} data={pageProps.transactions || initialTransactions || []} meta={tableMeta} />
                        </Deferred>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
