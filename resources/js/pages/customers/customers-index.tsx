import { columns, TableMeta } from '@/components/customers/columns';
import { DataTable } from '@/components/customers/data-table';
import { Create } from '@/components/customers/sheets/create';
import { Edit } from '@/components/customers/sheets/edit';
import { Show } from '@/components/customers/sheets/show';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import AppLayout from '@/layouts/app-layout';
import { BreadcrumbItem, ContactTypes, Customers, User } from '@/types';
import { Deferred, Head, Link, router, usePage } from '@inertiajs/react';
import { Settings, User2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
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
    contactTypes: ContactTypes[];
    auth: { user: User };
    flash?: {
        success?: string;
        error?: string;
        errors?: Record<string, string | string[]>;
    };
    [key: string]: any;
}

export default function CustomersIndex({ customers, contactTypes }: PageProps) {
    const { props: pageProps } = usePage<PageProps>();

    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<Customers | null>(null);

    const [date, setDate] = useState<DateRange | undefined>(undefined); // Default to undefined initially

    // Other UI State
    const [sheetMode, setSheetMode] = useState<'show' | 'create' | 'edit'>('create');
    const [editCustomer, setEditCustomer] = useState<Customers | null>(null);
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

    // --- Handlers for Sheet Actions ---
    const handleCreateClick = () => {
        setSheetMode('create');
        setSelectedCustomer(null); // Clear details view
        setEditCustomer(null); // Clear editing view
        setIsSheetOpen(true);
        // You'll likely want a separate form component rendered conditionally based on sheetMode
    };

    const handleShowDetails = useCallback((customer: Customers) => {
        setSheetMode('show'); // Set mode to show details
        setSelectedCustomer(customer);
        setEditCustomer(null); // Clear editing view
        setIsSheetOpen(true);
    }, []);

    const handleEditCustomer = useCallback((customerToEdit: Customers) => {
        setSheetMode('edit');
        setSelectedCustomer(customerToEdit); // Clear details view
        setEditCustomer(customerToEdit);
        setIsSheetOpen(true);
        // You'll likely want a separate form component rendered conditionally based on sheetMode
    }, []);

    const handleFormSubmitSuccess = () => {
        setIsSheetOpen(false);
        router.reload({ only: ['customers'] });
    };

    // Create the meta object to pass to the table
    const tableMeta: TableMeta = {
        // Pass filter state and handler if you want filtering within the table component itself
        globalFilter: globalFilter,
        onGlobalFilterChange: setGlobalFilter,
        createCustomer: handleCreateClick, // Pass create handler
        showDetails: handleShowDetails,
        editCustomer: handleEditCustomer,
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
                            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <Input
                                    placeholder="Filter customer..." // Updated placeholder
                                    value={globalFilter}
                                    onChange={(event) => setGlobalFilter(event.target.value)}
                                    className="w-full sm:max-w-xs"
                                />
                                <div className="flex gap-2">
                                    <Button variant="outline" onClick={handleCreateClick} className="w-full sm:w-auto">
                                        <User2 className="mr-2 h-4 w-4" /> Create Customer
                                    </Button>
                                    <Button variant="outline" className="w-full sm:w-auto">
                                        <Link href={'/customers/settings'} className="flex items-center gap-2">
                                            <Settings className="mr-2 h-4 w-4" /> Setting
                                        </Link>
                                    </Button>
                                </div>
                            </div>
                            <Deferred data="customers" fallback={<div className="p-4 text-center">Loading vehicles data...</div>}>
                                <DataTable columns={columns} data={pageProps.customers || []} meta={tableMeta} />
                            </Deferred>
                        </CardContent>
                    </Card>
                </div>

                <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                    <SheetContent className="overflow-y-auto sm:max-w-lg">
                        {/* Conditionally render Sheet content based on mode */}
                        {sheetMode === 'show' && selectedCustomer && (
                            <>
                                <SheetHeader>
                                    <SheetTitle>{selectedCustomer?.full_name || 'N/A'} Details:</SheetTitle>
                                    <SheetDescription>Viewing details for customer name: {selectedCustomer?.full_name || 'N/A'}</SheetDescription>
                                </SheetHeader>

                                <Show selectedCustomer={selectedCustomer} />
                                <SheetFooter>
                                    <SheetClose asChild>
                                        <Button type="button" variant="outline">
                                            Close
                                        </Button>
                                    </SheetClose>
                                </SheetFooter>
                            </>
                        )}

                        {sheetMode === 'create' && (
                            <>
                                <SheetHeader>
                                    <SheetTitle>Create New Customer</SheetTitle>
                                    <SheetDescription>Enter the details for the new customer.</SheetDescription>
                                </SheetHeader>
                                {/* Placeholder for your Customer Create Form Component */}
                                <Create contactTypes={contactTypes} onSubmitSuccess={handleFormSubmitSuccess} />
                            </>
                        )}

                        {sheetMode === 'edit' && editCustomer && (
                            <>
                                <SheetHeader>
                                    <SheetTitle>Edit Customer: {editCustomer.full_name}</SheetTitle>
                                    <SheetDescription>Update the customer's details.</SheetDescription>
                                </SheetHeader>
                                {/* Placeholder for your Customer Edit Form Component */}
                                <Edit selectedCustomer={selectedCustomer} contactTypes={contactTypes} onSubmitSuccess={handleFormSubmitSuccess} />
                            </>
                        )}
                    </SheetContent>
                </Sheet>
            </div>
        </AppLayout>
    );
}
