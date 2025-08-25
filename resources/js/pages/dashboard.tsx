// parent component:
import DashboardChartsSection from '@/components/dashboards/dashboard-charts-section';
import DepositAndOverdueCountSection from '@/components/dashboards/deposit-and-overdue-count-section';
import LatePaymentSection from '@/components/dashboards/late-payments/late-payment';
import VehicleStockChartsSection from '@/components/dashboards/vehicle-stock-charts-section';
import { PlaceholderPattern } from '@/components/ui/placeholder-pattern';
import AppLayout from '@/layouts/app-layout';
import { RentalsType, User, type BreadcrumbItem } from '@/types';
import { Head, usePage } from '@inertiajs/react';
import { useEffect } from 'react';
import { toast } from 'sonner';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
];

interface DashboardProps {
    rentals: RentalsType[];
    depositAndOverdueData?: {
        overdueRentalsCount: number;
        numericDepositSum: number;
        textDepositCount: number;
    };
    users: User[];
    flash?: {
        success?: string;
        error?: string;
        errors?: Record<string, string | string[]>;
    };
    [key: string]: any;
}

export default function Dashboard({ rentals, users, chartData, depositAndOverdueData }: DashboardProps) {
    const { props: pageProps } = usePage<DashboardProps>();

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
    // You no longer need to pass chartData here, DashboardChartsSection will fetch it
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="grid auto-rows-min gap-4 md:grid-cols-3">
                    <DepositAndOverdueCountSection depositAndOverdueData={depositAndOverdueData} />
                    <div className="border-sidebar-border/70 dark:border-sidebar-border relative aspect-video overflow-hidden rounded-xl border">
                        <PlaceholderPattern className="absolute inset-0 size-full stroke-neutral-900/20 dark:stroke-neutral-100/20" />
                    </div>
                    <VehicleStockChartsSection initialData={chartData} />
                </div>
                {/* DashboardChartsSection will now fetch its own data */}
                <DashboardChartsSection />
                <LatePaymentSection rentals={rentals} users={users} />
            </div>
        </AppLayout>
    );
}
