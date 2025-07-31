import AppLayout from '@/layouts/app-layout'; // Adjust path if necessary
import { Head, router, usePage } from '@inertiajs/react';
import { format, parseISO } from 'date-fns';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

// Shadcn UI Components
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { BookText, Calendar as CalendarIcon, Filter } from 'lucide-react'; // Icons for Account Ledger

// DataTable and columns for Account Ledger
import { AccountLedgerTransaction, columns } from '@/components/accountings/account-ledger/columns'; // <--- New columns for this report
import { DataTable } from '@/components/accountings/data-table';
import { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Account Ledger',
        href: route('account.ledger.detail'),
    },
];
// --- TypeScript Interfaces ---

// Interface for Inertia's pagination data structure
interface PaginatedTransactions {
    data: AccountLedgerTransaction[]; // Use the new interface for table data
    links: { url: string | null; label: string; active: boolean }[];
    current_page: number;
    from: number;
    last_page: number;
    per_page: number;
    to: number;
    total: number;
}

// Interface for the account details
interface AccountDetails {
    id: number;
    name: string;
    type: string; // e.g., 'Asset', 'Liability', 'Equity', 'Revenue', 'Expense'
}

// Interface for the date range
interface DateRange {
    startDate: string;
    endDate: string;
}

// Interface for the overall page props received from Laravel
interface AccountLedgerPageProps {
    account: AccountDetails;
    transactions: PaginatedTransactions;
    dateRange: DateRange;
    openingBalance: number;
    flash: {
        success?: string;
        error?: string;
        errors?: Record<string, string>;
    };
    [key: string]: any;
}

// --- Breadcrumbs (optional, add if you use them in AppLayout) ---
// const breadcrumbs: BreadcrumbItem[] = [
//     { title: 'Reports', href: '' },
//     { title: 'Account Ledger', href: '' },
// ];

// Helper function for currency formatting (can be in a shared utility file)
const formatCurrency = (value: number): string => {
    return value.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

// Helper function for date input: ensures end date is inclusive for date-fns
function parseRangeEnd(dateString: string): Date {
    const date = parseISO(dateString);
    // Set to end of day to make the filter inclusive
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

// --- React Component ---

export default function AccountLedger({ account, transactions, dateRange, openingBalance }: AccountLedgerPageProps) {
    const { props: pageProps } = usePage<AccountLedgerPageProps>();

    // State for date filters
    const [currentStartDate, setCurrentStartDate] = useState<Date | undefined>(dateRange.startDate ? parseISO(dateRange.startDate) : undefined);
    const [currentEndDate, setCurrentEndDate] = useState<Date | undefined>(dateRange.endDate ? parseRangeEnd(dateRange.endDate) : undefined);

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

    // Function to handle changes in date filters
    const handleApplyFilters = () => {
        const params: Record<string, string> = {};
        if (currentStartDate) {
            params.start_date = format(currentStartDate, 'yyyy-MM-dd');
        }
        if (currentEndDate) {
            params.end_date = format(currentEndDate, 'yyyy-MM-dd');
        }

        router.get(route('account.ledger.detail', { accountId: account.id }), params, {
            preserveState: true,
            preserveScroll: true,
            onStart: () => toast.loading('Generating ledger...', { id: 'ledger-report-toast' }),
            onSuccess: () => toast.success('Ledger generated!', { id: 'ledger-report-toast' }),
            onError: () => toast.error('Failed to generate ledger.', { id: 'ledger-report-toast' }),
        });
    };

    // Memoize data for DataTable to prevent unnecessary re-renders
    const data = useMemo(() => transactions.data, [transactions.data]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Account Ledger: ${account.name}`} />

            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <BookText className="mr-2 text-blue-500" size={18} /> General Ledger Detail:{' '}
                            <span className="ml-2 text-indigo-600">{account.name}</span>
                        </CardTitle>
                        <p className="text-muted-foreground text-sm">Account Type: {account.type}</p>
                    </CardHeader>
                    <CardContent>
                        {/* Date Filters */}
                        <div className="mb-6 flex flex-wrap items-end gap-4">
                            <div className="flex flex-col gap-1">
                                <label className="text-sm font-medium text-gray-700">Start Date</label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={'outline'}
                                            className={cn(
                                                'w-[180px] justify-between text-left font-normal',
                                                !currentStartDate && 'text-muted-foreground',
                                            )}
                                        >
                                            {currentStartDate ? format(currentStartDate, 'PPP') : 'Select date'}
                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={currentStartDate}
                                            onSelect={setCurrentStartDate}
                                            captionLayout="dropdown"
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-sm font-medium text-gray-700">End Date</label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={'outline'}
                                            className={cn(
                                                'w-[180px] justify-between text-left font-normal',
                                                !currentEndDate && 'text-muted-foreground',
                                            )}
                                        >
                                            {currentEndDate ? format(currentEndDate, 'PPP') : 'Select date'}
                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={currentEndDate}
                                            onSelect={setCurrentEndDate}
                                            captionLayout="dropdown"
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>

                            {/* Filter Button */}
                            <div className="flex gap-2">
                                <Button onClick={handleApplyFilters} className="bg-blue-600 hover:bg-blue-700">
                                    <Filter className="mr-2 h-4 w-4" /> Apply Filter
                                </Button>
                                {/* Optionally add a Clear Filters button if needed */}
                            </div>
                        </div>
                        {/* Opening Balance */}
                        <div className="mb-4 flex items-center justify-between rounded-md bg-gray-100 px-4 py-2 text-lg font-semibold">
                            <span>Opening Balance (as of {currentStartDate ? format(currentStartDate, 'PPP') : 'selected start date'}):</span>
                            <span>{formatCurrency(openingBalance)}</span>
                        </div>
                        {/* DataTable for Transactions */}
                        <DataTable columns={columns} data={data} /> {/* Pass transactions for DataTable's internal pagination */}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
