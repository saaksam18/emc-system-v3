// resources/js/Pages/TrialBalance.tsx
import AppLayout from '@/layouts/app-layout';
import { BreadcrumbItem, TrialBalanceProps } from '@/types';
import { Deferred, Head, router, usePage } from '@inertiajs/react';
import { format } from 'date-fns';
import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

// Shadcn UI Components
import { columns } from '@/components/accountings/trial-balance/columns'; // NEW PATH
import { DataTable } from '@/components/accountings/trial-balance/data-table'; // Re-use your existing DataTable component
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Calendar as CalendarIcon, Filter, Scale } from 'lucide-react'; // Icons for Trial Balance

// Re-use SkeletonTable from SalesEntry or create a dedicated one if needed
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

function SkeletonTable({
    rowCount = 5,
    columnCount = 4, // Adjust based on your TB columns
    minWidth = '600px',
    columnWidths = ['w-1/4', 'w-1/4', 'w-1/4', 'w-1/4'], // Adjust
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
        title: 'Reports',
        href: '',
    },
    {
        title: 'Trial Balance',
        href: '/trial-balance',
    },
];

export default function TrialBalance({ trialBalance, asOfDate: initialAsOfDate }: TrialBalanceProps) {
    const { props: pageProps } = usePage<TrialBalanceProps>();

    const [asOfDate, setAsOfDate] = useState<Date | undefined>(initialAsOfDate ? new Date(initialAsOfDate) : new Date());

    useEffect(() => {
        const flash = pageProps.flash;
        if (flash?.success) {
            toast.success(flash.success);
        }
        if (flash?.error) {
            toast.error(flash.error);
        }
    }, [pageProps.flash]);

    const handleApplyFilters = () => {
        const params: Record<string, string> = {};
        if (asOfDate) {
            params.as_of_date = format(asOfDate, 'yyyy-MM-dd');
        }

        router.get(route('trial-balance.index'), params, {
            preserveState: true,
            preserveScroll: true,
            onStart: () => toast.loading('Generating report...', { id: 'tb-report-toast' }),
            onSuccess: () => toast.success('Report generated!', { id: 'tb-report-toast' }),
            onError: () => toast.error('Failed to generate report.', { id: 'tb-report-toast' }),
        });
    };

    const totalDebits = useMemo(() => {
        return Array.isArray(trialBalance) ? trialBalance.reduce((sum, account) => sum + account.debit_balance, 0) : 0;
    }, [trialBalance]);

    const totalCredits = useMemo(() => {
        return Array.isArray(trialBalance) ? trialBalance.reduce((sum, account) => sum + account.credit_balance, 0) : 0;
    }, [trialBalance]);

    const formattedTotalDebits = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(totalDebits);

    const formattedTotalCredits = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(totalCredits);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <Head title="Trial Balance" />

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <Scale className="mr-2 text-purple-500" size={18} /> Trial Balance
                        </CardTitle>
                        <p className="text-muted-foreground text-sm">As of: {initialAsOfDate ? format(new Date(initialAsOfDate), 'PPP') : 'Today'}</p>
                    </CardHeader>
                    <CardContent>
                        <div className="mb-6 flex flex-wrap items-end gap-4">
                            {/* As Of Date Filter */}
                            <div className="flex flex-col gap-1">
                                <label className="text-sm font-medium text-gray-700">As of Date</label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={'outline'}
                                            className={cn('w-[180px] justify-between text-left font-normal', !asOfDate && 'text-muted-foreground')}
                                        >
                                            {asOfDate ? format(asOfDate, 'PPP') : 'Select date'}
                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar mode="single" selected={asOfDate} onSelect={setAsOfDate} captionLayout="dropdown" initialFocus />
                                    </PopoverContent>
                                </Popover>
                            </div>

                            {/* Filter Button */}
                            <div className="flex gap-2">
                                <Button onClick={handleApplyFilters} className="bg-purple-600 hover:bg-purple-700">
                                    <Filter className="mr-2 h-4 w-4" /> Generate Report
                                </Button>
                                {/* No clear filters needed for just one date */}
                            </div>
                        </div>

                        <Deferred data="trialBalance" fallback={<SkeletonTable />}>
                            <DataTable columns={columns} data={trialBalance} />
                        </Deferred>

                        {/* Totals Row */}
                        <div className="mt-4 flex justify-end">
                            <Card className="flex items-center gap-8 border border-purple-200 bg-purple-50 p-4">
                                <p className="font-semibold text-gray-700">Total Debits:</p>
                                <p className="text-lg font-bold text-purple-800">{formattedTotalDebits}</p>

                                <p className="font-semibold text-gray-700">Total Credits:</p>
                                <p className="text-lg font-bold text-purple-800">{formattedTotalCredits}</p>

                                {totalDebits.toFixed(2) === totalCredits.toFixed(2) ? (
                                    <p className="ml-4 font-semibold text-green-600">(Balanced)</p>
                                ) : (
                                    <p className="ml-4 font-semibold text-red-600">(Unbalanced!)</p>
                                )}
                            </Card>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
