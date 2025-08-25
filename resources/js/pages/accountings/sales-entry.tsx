// resources/js/Pages/SalesEntry.tsx
import AppLayout from '@/layouts/app-layout';
import { BreadcrumbItem, ChartOfAccountTypes, ContactTypes, Customers, SaleTransaction } from '@/types';
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
import { DataTable } from '@/components/accountings/data-table';
import { columns, TableMeta } from '@/components/accountings/sales-entries/columns';
import { Create } from '@/components/customers/sheets/create';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';

// --- Type Definitions ---
type PaymentType = 'cash' | 'bank' | 'credit';

interface SaleFormData {
    sale_date: string;
    customer_name: string;
    item_description: string;
    memo_ref_no: string;
    amount: string;
    payment_type: PaymentType;
    credit_account_id: string;
    debit_target_account_id: string;
}

interface SalesEntryProps {
    customers: Customers[];
    contactTypes: ContactTypes[];
    sales: SaleTransaction[];
    chartOfAccounts: ChartOfAccountTypes[];
    flash?: {
        success?: string;
        error?: string;
        errors?: Record<string, string | string[]>;
    };
}

// --- Hooks ---
const useFlashMessages = () => {
    const { props } = usePage<SalesEntryProps>();
    useEffect(() => {
        const flash = props.flash;
        if (flash?.success) toast.success(flash.success);
        if (flash?.error) toast.error(flash.error);
        if (flash?.errors) {
            Object.values(flash.errors)
                .flat()
                .forEach((msg) => msg && toast.error(String(msg)));
        }
    }, [props.flash]);
};

const useSalesForm = ({ chartOfAccounts }: { chartOfAccounts: ChartOfAccountTypes[] }) => {
    const incomeAccounts = useMemo(() => chartOfAccounts.filter((acc) => acc.type === 'Revenue'), [chartOfAccounts]);
    const specificBankAccounts = useMemo(() => chartOfAccounts.filter((acc) => acc.type === 'Asset' && acc.name.includes('Bank')), [chartOfAccounts]);

    const form = useForm<SaleFormData>({
        sale_date: format(new Date(), 'yyyy-MM-dd'),
        customer_name: '',
        item_description: '',
        memo_ref_no: '',
        amount: '',
        payment_type: 'cash',
        credit_account_id: '',
        debit_target_account_id: '',
    });

    const { data, setData, post, processing, errors, reset } = form;

    useEffect(() => {
        if (data.payment_type === 'cash') {
            setData('debit_target_account_id', '');
        } else if (['bank', 'credit'].includes(data.payment_type) && specificBankAccounts.length > 0) {
            if (!specificBankAccounts.some((acc) => String(acc.id) === data.debit_target_account_id)) {
                setData('debit_target_account_id', String(specificBankAccounts[0].id));
            }
        } else {
            setData('debit_target_account_id', '');
        }
    }, [data.payment_type, specificBankAccounts, setData]);

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (['bank', 'credit'].includes(data.payment_type) && !data.debit_target_account_id) {
            toast.error('Please select a specific Bank account.');
            return;
        }
        post(route('sales.store'), {
            onSuccess: () => {
                reset();
            },
            onError: (err) => {
                console.error('Form submission errors:', err);
                toast.error('Failed to record sale. Please check your inputs.');
            },
        });
    };

    const getAccountName = (accountId: string, accounts: ChartOfAccountTypes[]) => {
        const account = accounts.find((acc) => String(acc.id) === accountId);
        return account ? `${account.name} (${account.type})` : 'Select account';
    };

    return { form, handleSubmit, incomeAccounts, specificBankAccounts, getAccountName };
};

// --- Components ---

const FormItem = ({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) => (
    <div>
        <Label className="mb-1">{label}</Label>
        {children}
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
);

interface AccountComboboxProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    value: string;
    onSelect: (value: string) => void;
    accounts: ChartOfAccountTypes[];
    getAccountName: (accountId: string, accounts: ChartOfAccountTypes[]) => string;
    placeholder: string;
    searchPlaceholder: string;
    error: boolean;
}

const AccountCombobox: React.FC<AccountComboboxProps> = ({
    open,
    onOpenChange,
    value,
    onSelect,
    accounts,
    getAccountName,
    placeholder,
    searchPlaceholder,
    error,
}) => (
    <Popover open={open} onOpenChange={onOpenChange}>
        <PopoverTrigger asChild>
            <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className={cn('dark:bg-background w-full justify-between', !value && 'text-muted-foreground', error && 'border-red-500')}
            >
                {value ? getAccountName(value, accounts) : placeholder}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
            <Command>
                <CommandInput placeholder={searchPlaceholder} />
                <CommandList>
                    <CommandEmpty>No account found.</CommandEmpty>
                    <CommandGroup>
                        {accounts.map((account) => (
                            <CommandItem key={account.id} value={`${account.name} (${account.type})`} onSelect={() => onSelect(String(account.id))}>
                                <Check className={cn('mr-2 h-4 w-4', value === String(account.id) ? 'opacity-100' : 'opacity-0')} />
                                {account.name} ({account.type})
                            </CommandItem>
                        ))}
                    </CommandGroup>
                </CommandList>
            </Command>
        </PopoverContent>
    </Popover>
);

interface SalesFormProps {
    chartOfAccounts: ChartOfAccountTypes[];
    customers: Customers[];
    onNewCustomerClick: () => void;
}

const SalesForm: React.FC<SalesFormProps> = ({ chartOfAccounts, customers, onNewCustomerClick }) => {
    const { form, handleSubmit, incomeAccounts, specificBankAccounts, getAccountName } = useSalesForm({ chartOfAccounts });
    const { data, setData, processing, errors } = form;
    const [open, setOpen] = useState({ date: false, customer: false, income: false, debit: false });

    const handleOpenChange = (name: keyof typeof open, value: boolean) => setOpen((prev) => ({ ...prev, [name]: value }));

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center">
                    <DollarSign className="mr-2 text-green-500" size={18} /> Record New Sale
                </CardTitle>
            </CardHeader>
            <CardContent>
                <Card className="dark:bg-sidebar border-green-200 bg-green-50 p-6 shadow-none dark:border-green-950">
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <FormItem label="Sale Date" error={errors.sale_date}>
                            <Popover open={open.date} onOpenChange={(v) => handleOpenChange('date', v)}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={'outline'}
                                        className={cn(
                                            'dark:bg-background w-full justify-between text-left font-normal',
                                            !data.sale_date && 'text-muted-foreground',
                                        )}
                                    >
                                        {data.sale_date ? format(new Date(data.sale_date), 'PPP') : 'Select date'}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={data.sale_date ? new Date(data.sale_date) : undefined}
                                        captionLayout="dropdown"
                                        onSelect={(d) => {
                                            setData('sale_date', d ? format(d, 'yyyy-MM-dd') : '');
                                            handleOpenChange('date', false);
                                        }}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </FormItem>

                        <FormItem label="Memo/Ref No. (Optional)" error={errors.memo_ref_no}>
                            <div className="relative">
                                <Input
                                    type="text"
                                    name="memo_ref_no"
                                    value={data.memo_ref_no}
                                    onChange={(e) => setData('memo_ref_no', e.target.value)}
                                    placeholder="e.g., Invoice #1001"
                                    className="dark:bg-background bg-background"
                                />
                                <BookOpen className="text-muted-foreground absolute top-1/2 right-3 -translate-y-1/2" size={18} />
                            </div>
                        </FormItem>

                        <FormItem label="Customer Name" error={errors.customer_name}>
                            <div className="flex w-full gap-2">
                                <Button variant="default" size="icon" onClick={onNewCustomerClick} type="button" className="shrink-0">
                                    <PlusCircle className="h-4 w-4" />
                                </Button>
                                <Popover open={open.customer} onOpenChange={(v) => handleOpenChange('customer', v)}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            className={cn(
                                                'dark:bg-background flex-grow justify-between',
                                                !data.customer_name && 'text-muted-foreground',
                                            )}
                                        >
                                            {data.customer_name || 'Select or type customer name'}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                        <Command>
                                            <CommandInput
                                                placeholder="Search or add customer..."
                                                value={data.customer_name}
                                                onValueChange={(v) => setData('customer_name', v)}
                                            />
                                            <CommandList>
                                                <CommandEmpty>
                                                    No customer found. <span className="font-semibold">Type to add new.</span>
                                                </CommandEmpty>
                                                <CommandGroup>
                                                    {customers.map((c) => (
                                                        <CommandItem
                                                            key={c.id}
                                                            value={c.name}
                                                            onSelect={() => {
                                                                setData('customer_name', c.name);
                                                                handleOpenChange('customer', false);
                                                            }}
                                                        >
                                                            <Check
                                                                className={cn(
                                                                    'mr-2 h-4 w-4',
                                                                    data.customer_name === c.name ? 'opacity-100' : 'opacity-0',
                                                                )}
                                                            />
                                                            {c.name}
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </FormItem>

                        <FormItem label="Item Description (What was sold)" error={errors.item_description}>
                            <div className="relative">
                                <Input
                                    type="text"
                                    name="item_description"
                                    value={data.item_description}
                                    onChange={(e) => setData('item_description', e.target.value)}
                                    placeholder="e.g., Consulting service"
                                    className="dark:bg-background bg-background"
                                />
                                <ShoppingBag className="text-muted-foreground absolute top-1/2 right-3 -translate-y-1/2" size={18} />
                            </div>
                        </FormItem>

                        <FormItem label="Sale Amount" error={errors.amount}>
                            <div className="relative">
                                <Input
                                    type="number"
                                    name="amount"
                                    value={data.amount}
                                    onChange={(e) => setData('amount', e.target.value)}
                                    step="0.01"
                                    min="0.01"
                                    placeholder="0.00"
                                    className="dark:bg-background bg-background pl-8"
                                />
                                <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2 font-semibold">$</span>
                            </div>
                        </FormItem>

                        <FormItem label="Income Account" error={errors.credit_account_id}>
                            <AccountCombobox
                                open={open.income}
                                onOpenChange={(v) => handleOpenChange('income', v)}
                                value={data.credit_account_id}
                                onSelect={(v) => {
                                    setData('credit_account_id', v);
                                    handleOpenChange('income', false);
                                }}
                                accounts={incomeAccounts}
                                getAccountName={getAccountName}
                                placeholder="Select an Income Account"
                                searchPlaceholder="Search income account..."
                                error={!!errors.credit_account_id}
                            />
                        </FormItem>

                        <FormItem label="Payment Type" error={errors.payment_type}>
                            <RadioGroup
                                value={data.payment_type}
                                onValueChange={(v: PaymentType) => setData('payment_type', v)}
                                className="mt-1 flex h-[38px] items-center space-x-4"
                            >
                                {(['cash', 'bank', 'credit'] as const).map((type) => (
                                    <div key={type} className="flex items-center space-x-2">
                                        <RadioGroupItem value={type} id={`paymentType${type}`} />
                                        <Label htmlFor={`paymentType${type}`} className="flex items-center text-sm capitalize">
                                            {type === 'cash' && <Banknote className="mr-1 text-green-500" size={16} />}
                                            {type === 'bank' && <CreditCard className="mr-1 text-indigo-500" size={16} />}
                                            {type === 'credit' && <CreditCard className="mr-1 text-blue-500" size={16} />}
                                            {type === 'credit' ? 'On Credit' : type}
                                        </Label>
                                    </div>
                                ))}
                            </RadioGroup>
                        </FormItem>

                        {['bank', 'credit'].includes(data.payment_type) && (
                            <FormItem label="Target Bank Account" error={errors.debit_target_account_id}>
                                <AccountCombobox
                                    open={open.debit}
                                    onOpenChange={(v) => handleOpenChange('debit', v)}
                                    value={data.debit_target_account_id}
                                    onSelect={(v) => {
                                        setData('debit_target_account_id', v);
                                        handleOpenChange('debit', false);
                                    }}
                                    accounts={specificBankAccounts}
                                    getAccountName={getAccountName}
                                    placeholder="Select Bank Account"
                                    searchPlaceholder="Search bank account..."
                                    error={!!errors.debit_target_account_id}
                                />
                            </FormItem>
                        )}

                        <div className="mt-4 flex justify-start md:col-span-2">
                            <Button type="submit" disabled={processing} className="border border-green-600">
                                <PlusCircle className="mr-2" size={20} /> {processing ? 'Recording...' : 'Record Sale'}
                            </Button>
                        </div>
                    </form>
                </Card>
            </CardContent>
        </Card>
    );
};

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Sales Entry', href: '/sales' }];

export default function SalesEntry({ customers: initialCustomers, contactTypes, sales: initialSales, chartOfAccounts }: SalesEntryProps) {
    const { props: pageProps } = usePage<SalesEntryProps>();
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    useFlashMessages();

    const handleFormSubmitSuccess = () => {
        setIsSheetOpen(false);
        router.reload({ only: ['customers'] });
    };

    const handleDelete = (id: number) => {
        if (confirm('Are you sure you want to delete this sale? This will also affect related GL entries.')) {
            router.delete(route('sales.destroy', id), {
                onSuccess: () => toast.success('Sale deleted successfully!'),
                onError: (errors) => {
                    toast.error('Failed to delete sale.');
                    console.error('Deletion errors:', errors);
                },
            });
        }
    };

    const tableMeta: TableMeta = useMemo(() => ({ onDelete: handleDelete }), []);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <Head title="Sales Entry" />

                <SalesForm chartOfAccounts={chartOfAccounts} customers={initialCustomers} onNewCustomerClick={() => setIsSheetOpen(true)} />

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <ClipboardCheck className="mr-2 text-green-500" size={18} />
                            Recorded Sales
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Deferred data="sales" fallback={<SkeletonTable rowCount={5} columnCount={columns.length} />}>
                            <DataTable columns={columns} data={initialSales} meta={tableMeta} />
                        </Deferred>
                    </CardContent>
                </Card>

                <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                    <SheetContent className="overflow-y-auto sm:max-w-lg">
                        <SheetHeader>
                            <SheetTitle>Create New Customer</SheetTitle>
                            <SheetDescription>Enter the details for the new customer.</SheetDescription>
                        </SheetHeader>
                        <Create contactTypes={pageProps.contactTypes || contactTypes || []} onSubmitSuccess={handleFormSubmitSuccess} />
                    </SheetContent>
                </Sheet>
            </div>
        </AppLayout>
    );
}

// --- Skeleton Components ---
const Skeleton = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
    <div ref={ref} className={cn('bg-muted animate-pulse rounded-md', className || '')} {...props} />
));
Skeleton.displayName = 'Skeleton';

interface SkeletonTableProps {
    rowCount?: number;
    columnCount?: number;
    minWidth?: string;
    columnWidths?: string[];
}

function SkeletonTable({
    rowCount = 5,
    columnCount = 4,
    minWidth = '600px',
    columnWidths = ['w-1/12', 'w-1/6', 'w-1/5', 'w-1/4', 'w-1/6', 'w-1/12', 'w-1/12'],
}: SkeletonTableProps) {
    return (
        <div className="border-border overflow-x-auto rounded-lg border shadow-sm">
            <table style={{ minWidth }} className="bg-card text-card-foreground w-full table-auto border-collapse">
                <thead className="bg-muted/50">
                    <tr>
                        {Array.from({ length: columnCount }).map((_, index) => (
                            <th key={`skel-head-${index}`} className="text-muted-foreground p-3 text-left text-sm font-semibold">
                                <Skeleton className={`h-5 ${columnWidths[index % columnWidths.length] || 'w-full'}`} />
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-border divide-y">
                    {Array.from({ length: rowCount }).map((_, rowIndex) => (
                        <tr key={`skeleton-row-${rowIndex}`} className="hover:bg-muted/50">
                            {Array.from({ length: columnCount }).map((_, colIndex) => (
                                <td key={`skeleton-cell-${rowIndex}-${colIndex}`} className="p-3">
                                    <Skeleton className={`h-4 ${columnWidths[colIndex % columnWidths.length] || 'w-full'}`} />
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
