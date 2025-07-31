// resources/js/Pages/ProfitLoss.tsx
import AppLayout from '@/layouts/app-layout';
import { BreadcrumbItem, ProfitLossProps } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { format, parseISO } from 'date-fns'; // Import parseISO for string dates
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

// Shadcn UI Components
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Calendar as CalendarIcon, DollarSign, Filter } from 'lucide-react'; // Icons

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Profit & Loss',
        href: '/profit-loss',
    },
];

export default function ProfitLoss({ profitAndLoss, startDate: initialStartDate, endDate: initialEndDate }: ProfitLossProps) {
    const { props: pageProps } = usePage<ProfitLossProps>();

    const [startDate, setStartDate] = useState<Date | undefined>(initialStartDate ? parseISO(initialStartDate) : new Date());
    const [endDate, setEndDate] = useState<Date | undefined>(initialEndDate ? parseISO(initialEndDate) : new Date());

    useEffect(() => {
        const flash = pageProps.flash;
        if (flash?.success) {
            toast.success(flash.success);
        }
        if (flash?.error) {
            toast.error(flash.error);
        }
    }, [pageProps.flash]);

    const handleGenerateReport = () => {
        const params: Record<string, string> = {};
        if (startDate) {
            params.start_date = format(startDate, 'yyyy-MM-dd');
        }
        if (endDate) {
            params.end_date = format(endDate, 'yyyy-MM-dd');
        }

        router.get(route('profit-loss.index'), params, {
            preserveState: true,
            preserveScroll: true,
            onStart: () => toast.loading('Generating P&L Report...', { id: 'pnl-toast' }),
            onSuccess: () => toast.success('P&L Report generated!', { id: 'pnl-toast' }),
            onError: () => toast.error('Failed to generate P&L Report.', { id: 'pnl-toast' }),
        });
    };

    const formattedStartDate = startDate ? format(startDate, 'MMM dd, yyyy') : 'N/A';
    const formattedEndDate = endDate ? format(endDate, 'MMM dd, yyyy') : 'N/A';

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <Head title="Profit & Loss" />

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <span className="flex items-center">
                                <DollarSign className="mr-2 text-green-600" size={18} /> Profit & Loss Statement
                            </span>
                            <span className="text-muted-foreground text-sm">
                                For the Period: {formattedStartDate} to {formattedEndDate}
                            </span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="mb-6 flex flex-wrap items-end gap-4">
                            {/* Start Date Filter */}
                            <div className="flex flex-col gap-1">
                                <label className="text-sm font-medium text-gray-700">Start Date</label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={'outline'}
                                            className={cn('w-[180px] justify-between text-left font-normal', !startDate && 'text-muted-foreground')}
                                        >
                                            {startDate ? format(startDate, 'PPP') : 'Select date'}
                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar mode="single" selected={startDate} onSelect={setStartDate} captionLayout="dropdown" initialFocus />
                                    </PopoverContent>
                                </Popover>
                            </div>

                            {/* End Date Filter */}
                            <div className="flex flex-col gap-1">
                                <label className="text-sm font-medium text-gray-700">End Date</label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={'outline'}
                                            className={cn('w-[180px] justify-between text-left font-normal', !endDate && 'text-muted-foreground')}
                                        >
                                            {endDate ? format(endDate, 'PPP') : 'Select date'}
                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar mode="single" selected={endDate} onSelect={setEndDate} captionLayout="dropdown" initialFocus />
                                    </PopoverContent>
                                </Popover>
                            </div>

                            {/* Generate Report Button */}
                            <Button onClick={handleGenerateReport} className="bg-green-600 hover:bg-green-700">
                                <Filter className="mr-2 h-4 w-4" /> Generate Report
                            </Button>
                        </div>

                        {/* P&L Report Body */}
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                            {/* Revenues Section */}
                            <div className="col-span-1">
                                <h3 className="mb-3 text-lg font-semibold text-gray-800">Revenues</h3>
                                <div className="space-y-2">
                                    {profitAndLoss.revenues.length > 0 ? (
                                        profitAndLoss.revenues.map((item) => (
                                            <div key={item.id} className="flex items-center justify-between py-1">
                                                <span className="text-gray-700">{item.name}</span>
                                                <span className="font-medium">{formatCurrency(item.balance)}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-muted-foreground">No revenue transactions for this period.</p>
                                    )}
                                </div>
                                <Separator className="my-3" />
                                <div className="flex items-center justify-between py-1 font-bold text-gray-900">
                                    <span>Total Revenue</span>
                                    <span>{formatCurrency(profitAndLoss.totalRevenue)}</span>
                                </div>
                            </div>

                            {/* Expenses Section */}
                            <div className="col-span-1">
                                <h3 className="mb-3 text-lg font-semibold text-gray-800">Expenses</h3>
                                <div className="space-y-2">
                                    {profitAndLoss.expenses.length > 0 ? (
                                        profitAndLoss.expenses.map((item) => (
                                            <div key={item.id} className="flex items-center justify-between py-1">
                                                <span className="text-gray-700">{item.name}</span>
                                                <span className="font-medium">{formatCurrency(item.balance)}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-muted-foreground">No expense transactions for this period.</p>
                                    )}
                                </div>
                                <Separator className="my-3" />
                                <div className="flex items-center justify-between py-1 font-bold text-gray-900">
                                    <span>Total Expenses</span>
                                    <span>{formatCurrency(profitAndLoss.totalExpense)}</span>
                                </div>
                            </div>
                        </div>

                        <Separator className="my-6" />

                        {/* Net Profit/Loss */}
                        <div className="flex items-center justify-between rounded-md border border-blue-200 bg-blue-50 px-4 py-2">
                            <span className="text-xl font-bold text-blue-800">Net Profit / (Loss)</span>
                            <span className={cn('text-xl font-bold', profitAndLoss.netProfitLoss >= 0 ? 'text-green-700' : 'text-red-700')}>
                                {formatCurrency(profitAndLoss.netProfitLoss)}
                            </span>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
