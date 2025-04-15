import { columns } from '@/components/customers/columns';
import { DataTable } from '@/components/customers/data-table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { BreadcrumbItem, Customers, User } from '@/types';
import { Deferred, Head, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { DateRange } from 'react-day-picker';
import { toast } from 'sonner';

// --- Breadcrumbs ---
const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Customers',
        href: '/customers', // Ensure this route exists and is correct
    },
];

// --- Page Props Interface ---
interface PageProps {
    users: User[];
    customers: Customers[];
    auth: { user: User };
    flash?: {
        success?: string;
        error?: string;
        errors?: Record<string, string | string[]>;
    };
    [key: string]: any;
}

export default function CustomersIndex({ customers }: PageProps) {
    const { props: pageProps } = usePage<PageProps>();

    const [date, setDate] = useState<DateRange | undefined>(undefined); // Default to undefined initially

    // Other UI State
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [sheetMode, setSheetMode] = useState<'create' | 'edit'>('create');
    const [editingCustomer, setEditingCustomer] = useState<Customers | null>(null);
    const [globalFilter, setGlobalFilter] = useState('');
    // Effect for flash messages (keep this)
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
    const handleCreateClick = () => {
        setSheetMode('create');
        setEditingCustomer(null);
        setIsSheetOpen(true);
    };

    const handleEditCustomer = (customerToEdit: Customers) => {
        setSheetMode('edit');
        setEditingCustomer(customerToEdit);
        setIsSheetOpen(true);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Customers Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="grid auto-rows-min gap-4 md:grid-cols-3">
                    <div className="relative overflow-hidden">
                        <Card>
                            <CardHeader>
                                <CardTitle>Scooter Rentors</CardTitle>
                                <CardDescription>Showing historical rental data. Use the date picker to filter the chart.</CardDescription>
                            </CardHeader>
                        </Card>
                    </div>
                    <div className="relative overflow-hidden">
                        <Card>
                            <CardHeader>
                                <CardTitle>Visa Customers</CardTitle>
                                <CardDescription>Showing historical rental data. Use the date picker to filter the chart.</CardDescription>
                            </CardHeader>
                        </Card>
                    </div>
                    <div className="relative overflow-hidden">
                        <Card>
                            <CardHeader>
                                <CardTitle>Work Permit Customers</CardTitle>
                                <CardDescription>Showing historical rental data. Use the date picker to filter the chart.</CardDescription>
                            </CardHeader>
                        </Card>
                    </div>
                </div>
                <div className="relative overflow-hidden">
                    <Card>
                        <CardHeader>
                            <CardTitle>Customers Data Table</CardTitle>
                            <CardDescription>Showing historical rental data. Use the date picker to filter the chart.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Deferred data="customers" fallback={<div className="p-4 text-center">Loading vehicles data...</div>}>
                                <DataTable columns={columns} data={pageProps.customers || []} />
                            </Deferred>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
