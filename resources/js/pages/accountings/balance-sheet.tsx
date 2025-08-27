import AppLayout from '@/layouts/app-layout';
import { Account, BalanceSheetProps, BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { format, parseISO } from 'date-fns';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { DatePicker } from '@/components/date-picker';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Balance Sheet',
        href: '/balance-sheet',
    },
];

export default function BalanceSheet({ balanceSheet, asOfDate }: BalanceSheetProps) {
    // Use usePage() hook to access the Inertia page props.
    // Explicitly cast the props to your defined interface for type safety.
    const { props: pageProps } = usePage<BalanceSheetProps>();

    // State for the selectable "As Of" date
    // Initialize with parsed date for date-fns, then format back to string for input value
    const [selectedAsOfDate, setSelectedAsOfDate] = useState<Date>(parseISO(asOfDate || format(new Date(), 'yyyy-MM-dd')));

    useEffect(() => {
        const flash = pageProps.flash;
        if (flash?.success) {
            toast.success(flash.success);
        }
        if (flash?.error) {
            toast.error(flash.error);
        }
    }, [pageProps.flash]);

    // useEffect hook to trigger a new report generation when the selected date changes
    useEffect(() => {
        if (selectedAsOfDate) {
            const formattedSelectedDate = format(selectedAsOfDate, 'yyyy-MM-dd');
            if (formattedSelectedDate !== asOfDate) {
                router.get(route('balance.sheet'), { as_of_date: formattedSelectedDate }, { preserveState: true });
            }
        }
    }, [selectedAsOfDate, asOfDate]);

    // Helper function to format currency values
    const formatCurrency = (value: number): string => {
        return value.toLocaleString('en-US', {
            style: 'currency',
            currency: 'USD', // Adjust currency code as needed
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    };

    // Helper function to format dates for display using date-fns
    const formatDateForDisplay = (dateString: string): string => {
        return format(parseISO(dateString), 'MMMM do, yyyy');
    };

    // Helper function to apply color classes based on value (positive/negative)
    const getValueClass = (value: number): string => {
        // Ensure value is treated as a number
        const numValue = parseFloat(value.toString());
        if (numValue > 0) return 'text-green-600';
        if (numValue < 0) return 'text-red-600';
        return 'text-gray-600';
    };

    return (
        // AppLayout is your main layout wrapper (e.g., with navigation, header, etc.)
        <AppLayout breadcrumbs={breadcrumbs}>
            {/* Head component for setting document title and meta tags */}
            <Head title="Balance Sheet" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="overflow-hidden bg-white p-6 shadow-xl sm:rounded-lg">
                        <h2 className="mb-4 text-2xl font-semibold text-gray-800">Balance Sheet Statement</h2>

                        {/* Date selection and display */}
                        <div className="mb-6 flex items-center justify-between">
                            <h3 className="text-lg font-medium text-gray-700">As of Date: {formatDateForDisplay(asOfDate)}</h3>
                            <div className="flex items-center space-x-2">
                                <label htmlFor="as_of_date" className="block text-sm font-medium text-gray-700">
                                    As of Date:
                                </label>
                                <DatePicker date={selectedAsOfDate} setDate={setSelectedAsOfDate} />
                            </div>
                        </div>

                        {/* Main Balance Sheet sections: Assets, Liabilities, Equity */}
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                            {/* Assets Section */}
                            <div className="rounded-lg bg-gray-50 p-4 shadow-sm">
                                <h4 className="mb-3 text-lg font-semibold text-gray-800">Assets</h4>
                                <ul className="space-y-1 text-sm text-gray-700">
                                    {balanceSheet.assets && balanceSheet.assets.length > 0 ? (
                                        balanceSheet.assets.map((account: Account) => (
                                            <li key={account.id} className="flex justify-between">
                                                <span>{account.name}</span>
                                                <span className={getValueClass(account.balance)}>{formatCurrency(account.balance)}</span>
                                            </li>
                                        ))
                                    ) : (
                                        <li className="text-gray-500">No asset accounts with balances for this period.</li>
                                    )}
                                </ul>
                                <div className="mt-4 flex justify-between border-t border-gray-200 pt-3 font-bold text-gray-800">
                                    <span>Total Assets</span>
                                    <span className={getValueClass(balanceSheet.totalAssets)}>{formatCurrency(balanceSheet.totalAssets)}</span>
                                </div>
                            </div>

                            {/* Liabilities Section */}
                            <div className="rounded-lg bg-gray-50 p-4 shadow-sm">
                                <h4 className="mb-3 text-lg font-semibold text-gray-800">Liabilities</h4>
                                <ul className="space-y-1 text-sm text-gray-700">
                                    {balanceSheet.liabilities && balanceSheet.liabilities.length > 0 ? (
                                        balanceSheet.liabilities.map((account: Account) => (
                                            <li key={account.id} className="flex justify-between">
                                                <span>{account.name}</span>
                                                <span className={getValueClass(account.balance)}>{formatCurrency(account.balance)}</span>
                                            </li>
                                        ))
                                    ) : (
                                        <li className="text-gray-500">No liability accounts with balances for this period.</li>
                                    )}
                                </ul>
                                <div className="mt-4 flex justify-between border-t border-gray-200 pt-3 font-bold text-gray-800">
                                    <span>Total Liabilities</span>
                                    <span className={getValueClass(balanceSheet.totalLiabilities)}>
                                        {formatCurrency(balanceSheet.totalLiabilities)}
                                    </span>
                                </div>
                            </div>

                            {/* Equity Section */}
                            <div className="rounded-lg bg-gray-50 p-4 shadow-sm">
                                <h4 className="mb-3 text-lg font-semibold text-gray-800">Equity</h4>
                                <ul className="space-y-1 text-sm text-gray-700">
                                    {balanceSheet.equity && balanceSheet.equity.length > 0 ? (
                                        balanceSheet.equity.map((account: Account) => (
                                            <li key={account.id} className="flex justify-between">
                                                <span>{account.name}</span>
                                                <span className={getValueClass(account.balance)}>{formatCurrency(account.balance)}</span>
                                            </li>
                                        ))
                                    ) : (
                                        <li className="text-gray-500">No equity accounts with balances for this period.</li>
                                    )}
                                </ul>
                                <div className="mt-4 flex justify-between border-t border-gray-200 pt-3 font-bold text-gray-800">
                                    <span>Total Equity</span>
                                    <span className={getValueClass(balanceSheet.totalEquity)}>{formatCurrency(balanceSheet.totalEquity)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Reconciliation Check: Assets = Liabilities + Equity */}
                        <div className="mt-8 flex items-center justify-between border-t-2 border-gray-300 pt-4 text-xl font-bold text-gray-900">
                            <span>Assets = Liabilities + Equity Check</span>
                            <span>
                                {formatCurrency(balanceSheet.totalAssets)} ={' '}
                                {formatCurrency(balanceSheet.totalLiabilities + balanceSheet.totalEquity)}
                            </span>
                            <span className={getValueClass(balanceSheet.totalAssets - (balanceSheet.totalLiabilities + balanceSheet.totalEquity))}>
                                Difference: {formatCurrency(balanceSheet.totalAssets - (balanceSheet.totalLiabilities + balanceSheet.totalEquity))}
                            </span>
                        </div>

                        {/* Optional: Display Net Profit/Loss component for verification */}
                        {balanceSheet.netProfitLossComponent !== undefined && (
                            <div className="mt-4 text-sm text-gray-600">
                                <p>Net Profit/Loss included in Equity (for confirmation): {formatCurrency(balanceSheet.netProfitLossComponent)}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
