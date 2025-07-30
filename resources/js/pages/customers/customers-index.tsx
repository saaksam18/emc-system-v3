import React, { useCallback, useEffect, useMemo, useState } from 'react'; // Added React import and useMemo

// --- Inertia Imports ---
import { Deferred, Head, Link, router, usePage } from '@inertiajs/react';

// --- Layout Imports ---
import AppLayout from '@/layouts/app-layout'; // Adjust path if needed

// --- UI Component Imports (shadcn/ui) ---
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { toast } from 'sonner'; // For notifications

// --- Custom Component Imports ---
import { columns, TableMeta } from '@/components/customers/columns'; // Adjust path
import { DataTable } from '@/components/customers/data-table'; // Adjust path
import { Create } from '@/components/customers/sheets/create'; // Adjust path
import { Edit } from '@/components/customers/sheets/edit'; // Adjust path
import { Show } from '@/components/customers/sheets/show'; // Adjust path

// --- Type Imports ---
// Make sure these types are correctly defined in '@/types'
import type { BreadcrumbItem, ContactTypes, Customers, User } from '@/types'; // Added 'type' keyword

// --- Utility Imports ---
import { cn } from '@/lib/utils'; // For Tailwind class merging (Ensure this path is correct)
import { Settings, User2 } from 'lucide-react'; // Icons

// --- Skeleton Loader Components ---

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
    columnWidths = ['w-12', 'w-2/5', 'w-1/4', 'w-1/6', 'w-16'], // Default widths, adjust as needed for customers table
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
        title: 'Customers',
        href: '/customers', // Ensure this route exists and is correct
    },
];

// --- Page Props Interface ---
interface PageProps {
    users: User[];
    customers: Customers[]; // Main data prop
    contactTypes: ContactTypes[]; // Needed for forms
    auth: { user: User };
    flash?: {
        success?: string;
        error?: string;
        errors?: Record<string, string | string[]>;
    };
    [key: string]: any;
}

// --- CustomersIndex Component ---
const CustomersIndex: React.FC<PageProps> = ({ customers: initialCustomers, contactTypes }) => {
    // Destructure initial props
    const { props: pageProps } = usePage<PageProps>();

    // Sheet State
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<Customers | null>(null); // For showing details
    const [sheetMode, setSheetMode] = useState<'show' | 'create' | 'edit'>('create');
    const [editCustomer, setEditCustomer] = useState<Customers | null>(null); // For editing

    // Filter State
    const [globalFilter, setGlobalFilter] = useState('');

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

    // --- Handlers for Sheet Actions ---
    const handleCreateClick = () => {
        setSheetMode('create');
        setSelectedCustomer(null);
        setEditCustomer(null);
        setIsSheetOpen(true);
    };

    const handleShowDetails = useCallback((customer: Customers) => {
        setSheetMode('show');
        setSelectedCustomer(customer);
        setEditCustomer(null);
        setIsSheetOpen(true);
    }, []);

    const handleEditCustomer = useCallback((customerToEdit: Customers) => {
        setSheetMode('edit');
        // Set both selected and edit? Decide based on Edit component needs.
        // Often, the Edit component only needs the data, not the 'selected' state.
        setSelectedCustomer(null); // Clear show details view
        setEditCustomer(customerToEdit); // Set data for edit form
        setIsSheetOpen(true);
    }, []);

    const handleFormSubmitSuccess = () => {
        setIsSheetOpen(false);
        // Reload only the customers data after submit
        router.reload({ only: ['customers'] });
    };

    // --- Table Meta ---
    // Memoize the meta object to avoid unnecessary re-renders of the DataTable
    const tableMeta: TableMeta = useMemo(
        () => ({
            globalFilter: globalFilter,
            onGlobalFilterChange: setGlobalFilter,
            createCustomer: handleCreateClick, // Pass create handler if needed by table/columns
            showDetails: handleShowDetails,
            editCustomer: handleEditCustomer,
        }),
        [globalFilter, handleCreateClick, handleShowDetails, handleEditCustomer],
    ); // Dependencies

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Customers Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Top Cards (Consider making these dynamic or removing if static) */}
                <div className="grid auto-rows-min gap-4 md:grid-cols-3">
                    <Card>
                        <CardHeader>
                            <CardTitle>Scooter Rentors</CardTitle>
                            <CardDescription>Overview of scooter rental customers.</CardDescription>
                        </CardHeader>
                        {/* Add CardContent with actual data/stats if available */}
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Visa Customers</CardTitle>
                            <CardDescription>Overview of customers on visas.</CardDescription>
                        </CardHeader>
                        {/* Add CardContent with actual data/stats if available */}
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Work Permit Customers</CardTitle>
                            <CardDescription>Overview of customers with work permits.</CardDescription>
                        </CardHeader>
                        {/* Add CardContent with actual data/stats if available */}
                    </Card>
                </div>

                {/* Main Customers Table Card */}
                <Card>
                    <CardHeader>
                        <CardTitle>Customers Management</CardTitle>
                        <CardDescription>View, create, edit, and manage customer records.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {/* Filter and Action Buttons */}
                        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <Input
                                placeholder="Filter customers..." // Updated placeholder
                                value={globalFilter}
                                onChange={(event: React.ChangeEvent<HTMLInputElement>) => setGlobalFilter(event.target.value)}
                                className="w-full sm:max-w-xs"
                            />
                            <div className="flex gap-2">
                                <Button variant="default" onClick={handleCreateClick} className="w-full shrink-0 sm:w-auto">
                                    {/* Changed variant to default */}
                                    <User2 className="mr-2 h-4 w-4" /> Create Customer
                                </Button>
                                {/* Removed Settings button for now, add back if needed */}
                                <Link href={'/settings/customers'}>
                                    <Button variant="outline" className="flex w-full shrink-0 items-center gap-2 sm:w-auto">
                                        <Settings className="mr-2 h-4 w-4" /> Setting
                                    </Button>
                                </Link>
                            </div>
                        </div>

                        {/* Customer Data Table with Skeleton Fallback */}
                        <Deferred data="customers" fallback={<SkeletonTable rowCount={10} columnCount={columns.length} />}>
                            <DataTable
                                columns={columns}
                                // Use latest data from usePage if available, else initial props
                                data={pageProps.customers || initialCustomers || []}
                                meta={tableMeta}
                            />
                        </Deferred>
                    </CardContent>
                </Card>

                {/* Sheet for Create/Edit/Show */}
                <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                    <SheetContent className="overflow-y-auto sm:max-w-lg">
                        {/* Show Details View */}
                        {sheetMode === 'show' && selectedCustomer && (
                            <>
                                <SheetHeader>
                                    <SheetTitle>{selectedCustomer?.full_name || 'N/A'} Details:</SheetTitle>
                                    <SheetDescription>Viewing details for customer: {selectedCustomer?.full_name || 'N/A'}</SheetDescription>
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

                        {/* Create Form View */}
                        {sheetMode === 'create' && (
                            <>
                                <SheetHeader>
                                    <SheetTitle>Create New Customer</SheetTitle>
                                    <SheetDescription>Enter the details for the new customer.</SheetDescription>
                                </SheetHeader>
                                <Create
                                    // Pass latest contactTypes from usePage if available
                                    contactTypes={pageProps.contactTypes || contactTypes || []}
                                    onSubmitSuccess={handleFormSubmitSuccess}
                                />
                            </>
                        )}

                        {/* Edit Form View */}
                        {sheetMode === 'edit' && editCustomer && (
                            <>
                                <SheetHeader>
                                    <SheetTitle>Edit Customer: {editCustomer.full_name}</SheetTitle>
                                    <SheetDescription>Update the customer's details.</SheetDescription>
                                </SheetHeader>
                                <Edit
                                    // Pass the customer data being edited
                                    selectedCustomer={editCustomer} // Pass editCustomer data here
                                    // Pass latest contactTypes from usePage if available
                                    contactTypes={pageProps.contactTypes || contactTypes || []}
                                    onSubmitSuccess={handleFormSubmitSuccess}
                                />
                            </>
                        )}
                    </SheetContent>
                </Sheet>
            </div>
        </AppLayout>
    );
};

export default CustomersIndex;
