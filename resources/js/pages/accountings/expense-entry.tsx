// resources/js/Pages/ExpenseEntry.tsx
import AppLayout from '@/layouts/app-layout';
import { BreadcrumbItem, ChartOfAccountTypes, ExpenseTransaction, Vendor } from '@/types';
import { Deferred, Head, router, useForm, usePage } from '@inertiajs/react';
import { format } from 'date-fns';

// Shadcn UI Icons and components (from lucide-react)
import {
    Banknote,
    BookOpen,
    Calendar as CalendarIcon,
    Check,
    ChevronsUpDown,
    ClipboardCheck,
    CreditCard,
    DollarSign,
    PlusCircle,
    ShoppingBag,
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';

// Shadcn UI Components
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Shadcn Command for searchable dropdown
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';

// Shadcn DataTable components
import { columns, TableMeta } from '@/components/accountings/expenses-entries/columns'; // NEW PATH
import { DataTable } from '@/components/accountings/expenses-entries/data-table'; // Re-use DataTable component

// Shadcn Dialog Imports
import { Sheet, SheetContent } from '@/components/ui/sheet';
import Create from '@/components/vendors/sheets/create';

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
    minWidth?: string;
    columnWidths?: string[];
}

/**
 * Renders a skeleton representation of a data table during loading.
 */
function SkeletonTable({
    rowCount = 5,
    columnCount = 4,
    minWidth = '600px',
    columnWidths = ['w-1/12', 'w-1/6', 'w-1/5', 'w-1/4', 'w-1/6', 'w-1/12', 'w-1/12'],
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
                                    <Skeleton className={`h-4 ${columnWidths[colIndex % colIndex.length] || 'w-full'} bg-gray-300`} />
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
        title: 'Expense Entry',
        href: '/expenses',
    },
];

// --- Type Definitions ---
type PaymentType = 'cash' | 'bank'; // No 'credit' option for expenses in this simple setup

interface ExpenseFormData {
    expense_date: string;
    vendor_name: string;
    item_description: string;
    memo_ref_no: string;
    amount: string;
    payment_type: PaymentType;
    debit_account_id: string; // This is the Expense Account (will be debited)
    credit_target_account_id: string; // This is Cash or Bank Account (will be credited)
}

interface ExpenseEntryProps {
    vendors: Vendor[];
    expenses: ExpenseTransaction[];
    chartOfAccounts: ChartOfAccountTypes[];
    flash?: {
        success?: string;
        error?: string;
        errors?: Record<string, string | string[]>;
    };
}

export default function ExpenseEntry({ expenses: initialExpenses, chartOfAccounts, vendors: initialVendors }: ExpenseEntryProps) {
    const { props: pageProps } = usePage<ExpenseEntryProps>();

    const [isVendorSelectOpen, setIsVendorSelectOpen] = useState(false);
    const [isSheetOpen, setIsSheetOpen] = useState(false);

    const handleFormSubmitSuccess = () => {
        setIsSheetOpen(false);
        router.reload({ only: ['vendors'] });
    };

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

    // Filter accounts for Expense Account dropdown (Expense type)
    const expenseAccounts = useMemo(() => {
        return chartOfAccounts.filter((account: any) => account.type === 'Expense');
    }, [chartOfAccounts]);

    // Filter accounts for specific bank accounts (ABA, ACLEDA) - these will be credited
    const specificBankAccounts = useMemo(() => {
        return chartOfAccounts.filter((account: any) => account.type === 'Asset' && account.name.includes('Bank'));
    }, [chartOfAccounts]);

    const {
        data,
        setData,
        post,
        processing,
        errors: formErrors,
        reset,
        delete: inertiaDelete,
    } = useForm<ExpenseFormData>({
        expense_date: format(new Date(), 'yyyy-MM-dd'),
        vendor_name: '',
        item_description: '',
        memo_ref_no: '',
        amount: '',
        payment_type: 'cash',
        debit_account_id: '', // Initialize empty to show placeholder
        credit_target_account_id: '', // Initialize empty, will be cash or bank
    });

    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [isExpenseSelectOpen, setIsExpenseSelectOpen] = useState(false); // State for Expense Account combobox
    const [isCreditTargetSelectOpen, setIsCreditTargetSelectOpen] = useState(false); // State for Bank Account combobox (credit side)

    const currentCreditAccountOptions = specificBankAccounts; // Options for bank accounts

    // Effect to handle changes in payment type and set credit_target_account_id
    useEffect(() => {
        if (data.payment_type === 'cash') {
            setData('credit_target_account_id', ''); // Clear when 'cash' is selected
        } else if (data.payment_type === 'bank' && specificBankAccounts.length > 0) {
            // If changing to 'bank' and bank options exist, set a default
            if (!specificBankAccounts.some((acc) => String(acc.id) === data.credit_target_account_id)) {
                setData('credit_target_account_id', String(specificBankAccounts[0].id));
            }
        } else {
            // Fallback: clear if no valid default or no options
            setData('credit_target_account_id', '');
        }
    }, [data.payment_type, specificBankAccounts, setData]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setData(name as keyof ExpenseFormData, value);
    };

    const handlePaymentTypeChange = (value: PaymentType) => {
        setData('payment_type', value);
    };

    const handleDateChange = (selectedDate?: Date) => {
        if (selectedDate) {
            setData('expense_date', format(selectedDate, 'yyyy-MM-dd'));
        } else {
            setData('expense_date', '');
        }
        setIsDatePickerOpen(false);
    };

    // Handler for Expense Account selection
    const handleExpenseAccountSelect = (accountId: string) => {
        setData('debit_account_id', accountId);
        setIsExpenseSelectOpen(false);
    };

    // Handler for the specific bank account combobox (credit side)
    const handleCreditTargetAccountSelect = (accountId: string) => {
        setData('credit_target_account_id', accountId);
        setIsCreditTargetSelectOpen(false);
    };

    // Handler for vendor combobox selection
    const handleVendorSelect = (vendorName: string) => {
        setData('vendor_name', vendorName);
        setIsVendorSelectOpen(false);
    };

    // Function to handle vendor added from the dialog
    const handleVendorAddedFromDialog = (newVendorName: string) => {
        setData('vendor_name', newVendorName);
        // You might consider Inertia.reload({ only: ['vendors'], onSuccess: () => { ... } }); here if vendors list is not immediately updated
    };

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        // Client-side validation for credit_target_account_id when 'bank' is selected
        if (data.payment_type === 'bank' && !data.credit_target_account_id) {
            toast.error('Please select a specific Bank account.');
            return;
        }

        if (!data.vendor_name.trim()) {
            toast.error('Vendor name is required.');
            return;
        }
        if (!data.debit_account_id) {
            toast.error('Expense account is required.');
            return;
        }

        post(route('expenses.store'), {
            onSuccess: () => {
                reset();
                toast.success('Expense recorded successfully!');
            },
            onError: (errors) => {
                console.error('Form submission errors:', errors);
                toast.error('Failed to record expense. Please check your inputs.');
            },
        });
    };

    const handleDelete = (id: number) => {
        if (confirm('Are you sure you want to delete this expense? This will also affect related GL entries.')) {
            inertiaDelete(route('expenses.destroy', id), {
                onSuccess: () => {
                    toast.success('Expense deleted successfully!');
                },
                onError: (errors) => {
                    toast.error('Failed to delete expense.');
                    console.error('Deletion errors:', errors);
                },
            });
        }
    };

    const getAccountName = (accountId: string, accountsList: ChartOfAccountTypes[]) => {
        const account = accountsList.find((acc) => String(acc.id) === accountId);
        return account ? `${account.name} (${account.type})` : 'Select account';
    };

    const tableMeta: TableMeta = useMemo(
        () => ({
            onDelete: handleDelete,
        }),
        [],
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <Head title="Expense Entry" />

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <DollarSign className="mr-2 text-red-500" size={18} /> Record New Expense
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Card className="dark:bg-sidebar border-red-200 bg-red-50 shadow-none dark:border-red-500">
                            {/* Red accent for expenses */}
                            <CardContent>
                                <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    {/* Expense Date */}
                                    <div>
                                        <Label htmlFor="expense_date" className="mb-1">
                                            Expense Date
                                        </Label>
                                        <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant={'outline'}
                                                    className={cn(
                                                        'w-full justify-between text-left font-normal',
                                                        !data.expense_date && 'text-muted-foreground',
                                                        formErrors.expense_date && 'border-red-500',
                                                    )}
                                                >
                                                    {data.expense_date ? format(new Date(data.expense_date), 'PPP') : 'Select date'}
                                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={data.expense_date ? new Date(data.expense_date) : undefined}
                                                    captionLayout="dropdown"
                                                    onSelect={handleDateChange}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                        {formErrors.expense_date && <p className="mt-1 text-sm text-red-600">{formErrors.expense_date}</p>}
                                    </div>

                                    {/* Vendor Name Combobox and Add Vendor Button */}
                                    <div>
                                        <Label htmlFor="vendor_name" className="mb-1">
                                            Vendor Name
                                        </Label>
                                        <div className="flex w-full gap-2">
                                            <Popover open={isVendorSelectOpen} onOpenChange={setIsVendorSelectOpen}>
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        role="combobox"
                                                        aria-expanded={isVendorSelectOpen}
                                                        className={cn(
                                                            'flex-grow justify-between',
                                                            !data.vendor_name && 'text-muted-foreground',
                                                            formErrors.vendor_name && 'border-red-500',
                                                        )}
                                                    >
                                                        {data.vendor_name
                                                            ? initialVendors.find((vendor: Vendor) => vendor.name === data.vendor_name)?.name
                                                            : 'Select or type vendor name'}
                                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                                    <Command>
                                                        <CommandInput
                                                            placeholder="Search or add vendor..."
                                                            value={data.vendor_name}
                                                            onValueChange={(value) => setData('vendor_name', value)}
                                                        />
                                                        <CommandList className="max-h-60 overflow-y-auto">
                                                            <CommandEmpty>
                                                                No vendor found. <span className="font-semibold">Type to add new.</span>
                                                            </CommandEmpty>
                                                            <CommandGroup>
                                                                {initialVendors.map((vendor: Vendor) => (
                                                                    <CommandItem
                                                                        key={vendor.id}
                                                                        value={vendor.name}
                                                                        onSelect={() => handleVendorSelect(vendor.name)}
                                                                    >
                                                                        <Check
                                                                            className={cn(
                                                                                'mr-2 h-4 w-4',
                                                                                data.vendor_name === vendor.name ? 'opacity-100' : 'opacity-0',
                                                                            )}
                                                                        />
                                                                        {vendor.name}
                                                                    </CommandItem>
                                                                ))}
                                                            </CommandGroup>
                                                        </CommandList>
                                                    </Command>
                                                </PopoverContent>
                                            </Popover>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={() => setIsSheetOpen(true)}
                                                className="shrink-0"
                                                type="button"
                                            >
                                                <PlusCircle className="h-4 w-4" />
                                            </Button>
                                        </div>
                                        {formErrors.vendor_name && <p className="mt-1 text-sm text-red-600">{formErrors.vendor_name}</p>}
                                    </div>

                                    {/* Item Description & Memo/Ref No */}
                                    <div>
                                        <Label htmlFor="item_description" className="mb-1">
                                            Item Description (What was purchased)
                                        </Label>
                                        <div className="relative">
                                            <Input
                                                type="text"
                                                id="item_description"
                                                name="item_description"
                                                value={data.item_description}
                                                onChange={handleChange}
                                                placeholder="e.g., Office supplies, Utilities bill, Advertising"
                                                className={`${formErrors.item_description ? 'bg-background border-red-500' : 'bg-background'}`}
                                            />
                                            <ShoppingBag className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400" size={18} />
                                        </div>
                                        {formErrors.item_description && <p className="mt-1 text-sm text-red-600">{formErrors.item_description}</p>}
                                    </div>

                                    <div>
                                        <Label htmlFor="memo_ref_no" className="mb-1">
                                            Memo/Ref No. (Optional)
                                        </Label>
                                        <div className="relative">
                                            <Input
                                                type="text"
                                                id="memo_ref_no"
                                                name="memo_ref_no"
                                                value={data.memo_ref_no}
                                                onChange={handleChange}
                                                placeholder="e.g., Bill #123, Jan_Rent"
                                                className={`${formErrors.memo_ref_no ? 'bg-background border-red-500' : 'bg-background'}`}
                                            />
                                            <BookOpen className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400" size={18} />
                                        </div>
                                        {formErrors.memo_ref_no && <p className="mt-1 text-sm text-red-600">{formErrors.memo_ref_no}</p>}
                                    </div>

                                    {/* Amount & Expense Account Selection */}
                                    <div>
                                        <Label htmlFor="amount" className="mb-1">
                                            Expense Amount
                                        </Label>
                                        <div className="relative">
                                            <Input
                                                type="number"
                                                id="amount"
                                                name="amount"
                                                value={data.amount}
                                                onChange={handleChange}
                                                step="0.01"
                                                min="0.01"
                                                placeholder="0.00"
                                                className={`pl-8 ${formErrors.amount ? 'bg-background border-red-500' : 'bg-background'}`}
                                            />
                                            <span className="absolute top-1/2 left-3 -translate-y-1/2 font-semibold text-gray-500">$</span>
                                        </div>
                                        {formErrors.amount && <p className="mt-1 text-sm text-red-600">{formErrors.amount}</p>}
                                    </div>

                                    <div>
                                        <Label htmlFor="debit_account_id" className="mb-1">
                                            Expense Account
                                        </Label>
                                        <Popover open={isExpenseSelectOpen} onOpenChange={setIsExpenseSelectOpen}>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    role="combobox"
                                                    aria-expanded={isExpenseSelectOpen}
                                                    className={cn(
                                                        'w-full justify-between',
                                                        !data.debit_account_id && 'text-muted-foreground',
                                                        formErrors.debit_account_id && 'border-red-500',
                                                    )}
                                                >
                                                    {data.debit_account_id
                                                        ? getAccountName(data.debit_account_id, expenseAccounts)
                                                        : 'Select an Expense Account'}
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                                <Command>
                                                    <CommandInput placeholder="Search expense account..." />
                                                    <CommandList className="max-h-60 overflow-y-auto">
                                                        <CommandEmpty>No expense account found.</CommandEmpty>
                                                        <CommandGroup>
                                                            {expenseAccounts.map((account: any) => (
                                                                <CommandItem
                                                                    key={account.id}
                                                                    value={`${account.name} (${account.type})`}
                                                                    onSelect={(currentValue) => {
                                                                        const selectedAccount = expenseAccounts.find(
                                                                            (acc: any) => `${acc.name} (${acc.type})` === currentValue,
                                                                        );
                                                                        if (selectedAccount) {
                                                                            handleExpenseAccountSelect(String(selectedAccount.id));
                                                                        }
                                                                    }}
                                                                >
                                                                    <Check
                                                                        className={cn(
                                                                            'mr-2 h-4 w-4',
                                                                            data.debit_account_id === String(account.id)
                                                                                ? 'opacity-100'
                                                                                : 'opacity-0',
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
                                        {formErrors.debit_account_id && <p className="mt-1 text-sm text-red-600">{formErrors.debit_account_id}</p>}
                                    </div>

                                    {/* Payment Type Selection */}
                                    <div>
                                        <Label className="mb-1">Payment Type</Label>
                                        <RadioGroup
                                            defaultValue="cash"
                                            value={data.payment_type}
                                            onValueChange={handlePaymentTypeChange}
                                            className="mt-1 flex h-[38px] items-center space-x-4"
                                        >
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="cash" id="paymentTypeCash" />
                                                <Label htmlFor="paymentTypeCash" className="flex items-center text-sm text-gray-900">
                                                    <Banknote className="mr-1 text-green-500" size={16} /> Cash
                                                </Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="bank" id="paymentTypeBank" />
                                                <Label htmlFor="paymentTypeBank" className="flex items-center text-sm text-gray-900">
                                                    <CreditCard className="mr-1 text-indigo-500" size={16} /> Bank
                                                </Label>
                                            </div>
                                        </RadioGroup>
                                        {formErrors.payment_type && <p className="mt-1 text-sm text-red-600">{formErrors.payment_type}</p>}
                                    </div>

                                    {/* Conditional Bank Account Selection (for credit side) */}
                                    {data.payment_type === 'bank' && (
                                        <div>
                                            <Label htmlFor="credit_target_account_id" className="mb-1">
                                                Bank Account (Payment From)
                                            </Label>
                                            <Popover open={isCreditTargetSelectOpen} onOpenChange={setIsCreditTargetSelectOpen}>
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        role="combobox"
                                                        aria-expanded={isCreditTargetSelectOpen}
                                                        className={cn(
                                                            'w-full justify-between',
                                                            !data.credit_target_account_id && 'text-muted-foreground',
                                                            formErrors.credit_target_account_id && 'border-red-500',
                                                        )}
                                                    >
                                                        {data.credit_target_account_id
                                                            ? getAccountName(data.credit_target_account_id, currentCreditAccountOptions)
                                                            : 'Select Bank Account'}
                                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                                    <Command>
                                                        <CommandInput placeholder="Search bank account..." />
                                                        <CommandList className="max-h-60 overflow-y-auto">
                                                            <CommandEmpty>No bank account found.</CommandEmpty>
                                                            <CommandGroup>
                                                                {currentCreditAccountOptions.map((account: any) => (
                                                                    <CommandItem
                                                                        key={account.id}
                                                                        value={`${account.name} (${account.type})`}
                                                                        onSelect={(currentValue) => {
                                                                            const selectedAccount = currentCreditAccountOptions.find(
                                                                                (acc: any) => `${acc.name} (${acc.type})` === currentValue,
                                                                            );
                                                                            if (selectedAccount) {
                                                                                handleCreditTargetAccountSelect(String(selectedAccount.id));
                                                                            }
                                                                        }}
                                                                    >
                                                                        <Check
                                                                            className={cn(
                                                                                'mr-2 h-4 w-4',
                                                                                data.credit_target_account_id === String(account.id)
                                                                                    ? 'opacity-100'
                                                                                    : 'opacity-0',
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
                                            {formErrors.credit_target_account_id && (
                                                <p className="mt-1 text-sm text-red-600">{formErrors.credit_target_account_id}</p>
                                            )}
                                        </div>
                                    )}

                                    <div className="mt-4 flex justify-start md:col-span-2">
                                        <Button
                                            type="submit"
                                            disabled={processing}
                                            variant="default"
                                            className="border border-red-200 dark:border-red-500"
                                        >
                                            <ClipboardCheck className="mr-2" size={20} /> {processing ? 'Recording...' : 'Record Expense'}
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </CardContent>
                </Card>

                {/* Expenses List using DataTable */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <ClipboardCheck className="mr-2 text-red-500" size={18} />
                            Recorded Expenses
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Deferred data="expenses" fallback={<SkeletonTable rowCount={5} columnCount={columns.length} />}>
                            <DataTable columns={columns} data={initialExpenses} meta={tableMeta} />
                        </Deferred>
                    </CardContent>
                </Card>
            </div>
            {/* NEW: Render the Add Vendor Dialog */}
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetContent className="overflow-y-auto sm:max-w-lg">
                    <Create onSubmitSuccess={handleFormSubmitSuccess} />
                </SheetContent>
            </Sheet>
        </AppLayout>
    );
}
