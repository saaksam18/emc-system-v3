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
import { columns, TableMeta } from '@/components/rentals/columns'; // Adjust path
import { Create } from '@/components/rentals/sheets/create'; // Adjust path

// --- Type Imports ---
// Make sure these types are correctly defined in '@/types'
import type { BreadcrumbItem, Customers, Deposits, RentalsType, User, Vehicle, VehicleStatusType } from '@/types'; // Added 'type' keyword

// --- Utility Imports ---
import { DataTable } from '@/components/rentals/data-table';
import { ChangeDeposit } from '@/components/rentals/sheets/change-deposit';
import { ChangeVehicle } from '@/components/rentals/sheets/change-vehicle';
import { ExtendContract } from '@/components/rentals/sheets/extend-contract';
import { Pickup } from '@/components/rentals/sheets/pick-up';
import { Return } from '@/components/rentals/sheets/return';
import { Show } from '@/components/rentals/sheets/show';
import { TemporaryReturn } from '@/components/rentals/sheets/temporary-return';
import { cn } from '@/lib/utils'; // For Tailwind class merging (Ensure this path is correct)
import { NotebookTabs, Settings } from 'lucide-react'; // Icons

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
        title: 'Rentals',
        href: '/rentals', // Ensure this route exists and is correct
    },
];

// --- Page Props Interface ---
interface PageProps {
    rentals: RentalsType[];
    availableVehicles: Vehicle[] | null;
    vehicleStatuses: VehicleStatusType[] | null;
    customers: Customers[] | null;
    depositTypes: Deposits[] | null;
    users: User[] | null;
    auth: { user: User };
    flash?: {
        success?: string;
        error?: string;
        errors?: Record<string, string | string[]>;
    };
    [key: string]: any;
}

// --- CustomersIndex Component ---
const RentalsIndex: React.FC<PageProps> = ({ rentals: initialRentals, availableVehicles, vehicleStatuses, customers, depositTypes, users }) => {
    // Destructure initial props
    const { props: pageProps } = usePage<PageProps>();

    // Sheet State
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [selectedRow, setSelectedRow] = useState<RentalsType | null>(null); // For showing details
    const [sheetMode, setSheetMode] = useState<
        'show' | 'create' | 'edit' | 'temporary' | 'extend' | 'exVehicle' | 'exDeposit' | 'pick-up' | 'return'
    >('create');
    const [edit, setEdit] = useState<RentalsType | null>(null); // For editing

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
    const handleCreate = () => {
        setSheetMode('create');
        setSelectedRow(null);
        setEdit(null);
        setIsSheetOpen(true);
    };

    const handleShow = useCallback((rentals: RentalsType) => {
        setSheetMode('show');
        setSelectedRow(rentals);
        setEdit(null);
        setIsSheetOpen(true);
    }, []);

    const handleEdit = useCallback((rentalToEdit: RentalsType) => {
        setSheetMode('edit');
        setSelectedRow(null); // Clear show details view
        setEdit(rentalToEdit); // Set data for edit form
        setIsSheetOpen(true);
    }, []);

    const handleTemporary = useCallback((rentalToEdit: RentalsType) => {
        setSheetMode('temporary');
        setSelectedRow(rentalToEdit);
        setEdit(rentalToEdit);
        setIsSheetOpen(true);
    }, []);

    const handleExtend = useCallback((rentalToEdit: RentalsType) => {
        setSheetMode('extend');
        setSelectedRow(rentalToEdit);
        setEdit(rentalToEdit);
        setIsSheetOpen(true);
    }, []);

    const handleExchangeVehicle = useCallback((rentalToEdit: RentalsType) => {
        setSheetMode('exVehicle');
        setSelectedRow(rentalToEdit);
        setEdit(rentalToEdit);
        setIsSheetOpen(true);
    }, []);

    const handleExchangeDeposit = useCallback((rentalToEdit: RentalsType) => {
        setSheetMode('exDeposit');
        setSelectedRow(rentalToEdit);
        setEdit(rentalToEdit);
        setIsSheetOpen(true);
    }, []);

    const handlePickUp = useCallback((rentalToEdit: RentalsType) => {
        setSheetMode('pick-up');
        setSelectedRow(rentalToEdit);
        setEdit(rentalToEdit);
        setIsSheetOpen(true);
    }, []);

    const handleReturn = useCallback((rentalToEdit: RentalsType) => {
        setSheetMode('return');
        setSelectedRow(rentalToEdit);
        setEdit(rentalToEdit);
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
            // FIX: Pass the vehicleStatuses array directly
            vehicleStatuses: vehicleStatuses,
            globalFilter: globalFilter,
            onGlobalFilterChange: setGlobalFilter,
            create: handleCreate,
            show: handleShow,
            edit: handleEdit,
            extend: handleExtend,
            exVehicle: handleExchangeVehicle,
            exDeposit: handleExchangeDeposit,
            pickUp: handlePickUp,
            temporaryReturn: handleTemporary,
            return: handleReturn,
        }),
        // Dependencies remain the same
        [vehicleStatuses, globalFilter, handleCreate, handleShow, handleEdit],
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Customers Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Top Cards (Consider making these dynamic or removing if static) */}
                <div className="grid auto-rows-min gap-4 md:grid-cols-3">
                    <Card>
                        <CardHeader>
                            <CardTitle>Money Deposit</CardTitle>
                            <CardDescription>Overview of scooter rental deposit.</CardDescription>
                        </CardHeader>
                        {/* Add CardContent with actual data/stats if available */}
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Hard Deposit</CardTitle>
                            <CardDescription>Overview of scooter rental hard deposit (Passport, etc...).</CardDescription>
                        </CardHeader>
                        {/* Add CardContent with actual data/stats if available */}
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Overdue Rentors</CardTitle>
                            <CardDescription>Overview of customers late payments.</CardDescription>
                        </CardHeader>
                        {/* Add CardContent with actual data/stats if available */}
                    </Card>
                </div>

                {/* Main Customers Table Card */}
                <Card>
                    <CardHeader>
                        <CardTitle>Rentals Management</CardTitle>
                        <CardDescription>View, create, edit, and manage rental records.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {/* Filter and Action Buttons */}
                        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <Input
                                placeholder="Filter rentals..." // Updated placeholder
                                value={globalFilter}
                                onChange={(event: React.ChangeEvent<HTMLInputElement>) => setGlobalFilter(event.target.value)}
                                className="w-full sm:max-w-xs"
                            />
                            <div className="flex gap-2">
                                <Button variant="default" onClick={handleCreate} className="w-full shrink-0 sm:w-auto">
                                    {/* Changed variant to default */}
                                    <NotebookTabs className="mr-2 h-4 w-4" /> Create
                                </Button>
                                {/* Removed Settings button for now, add back if needed */}
                                <Link href={'/rentals/settings'}>
                                    <Button variant="outline" className="flex w-full shrink-0 items-center gap-2 sm:w-auto">
                                        <Settings className="mr-2 h-4 w-4" /> Setting
                                    </Button>
                                </Link>
                            </div>
                        </div>

                        {/* Customer Data Table with Skeleton Fallback */}
                        <Deferred data="rentals" fallback={<SkeletonTable rowCount={10} columnCount={columns.length} />}>
                            <DataTable
                                columns={columns}
                                // Use latest data from usePage if available, else initial props
                                data={pageProps.rentals || initialRentals || []}
                                meta={tableMeta}
                            />
                        </Deferred>
                    </CardContent>
                </Card>

                {/* Sheet for Create/Edit/Show */}
                <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                    <SheetContent className="overflow-y-auto sm:max-w-lg">
                        {/* Show Details View */}
                        {sheetMode === 'show' && selectedRow && (
                            <>
                                <SheetHeader>
                                    <SheetTitle>{selectedRow?.name || 'N/A'} Details:</SheetTitle>
                                    <SheetDescription>Viewing details for rental: {selectedRow?.name || 'N/A'}</SheetDescription>
                                </SheetHeader>
                                <Show selectedRow={selectedRow} />
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
                                    <SheetTitle>Create New Rental</SheetTitle>
                                    <SheetDescription>Enter the details for the new rental.</SheetDescription>
                                </SheetHeader>
                                <Create
                                    customers={customers}
                                    availableVehicles={availableVehicles}
                                    vehicleStatuses={pageProps.vehicleStatuses || vehicleStatuses || []}
                                    depositTypes={depositTypes}
                                    users={users}
                                    onSubmitSuccess={handleFormSubmitSuccess}
                                />
                            </>
                        )}

                        {/* Extend Form View */}
                        {sheetMode === 'extend' && edit && (
                            <>
                                <SheetHeader>
                                    <SheetTitle>Edit Rental Status for customer: {edit.full_name}</SheetTitle>
                                    <SheetDescription>Update the rental's details.</SheetDescription>
                                </SheetHeader>
                                <ExtendContract
                                    selectedRow={selectedRow}
                                    vehicleStatuses={pageProps.vehicleStatuses || vehicleStatuses || []}
                                    users={users}
                                    onSubmitSuccess={handleFormSubmitSuccess}
                                />
                            </>
                        )}

                        {/* Change vehicle Form View */}
                        {sheetMode === 'exVehicle' && edit && (
                            <>
                                <SheetHeader>
                                    <SheetTitle>Edit Rental Status for customer: {edit.full_name}</SheetTitle>
                                    <SheetDescription>Update the rental's details.</SheetDescription>
                                </SheetHeader>
                                <ChangeVehicle
                                    availableVehicles={availableVehicles}
                                    selectedRow={selectedRow}
                                    vehicleStatuses={pageProps.vehicleStatuses || vehicleStatuses || []}
                                    users={users}
                                    onSubmitSuccess={handleFormSubmitSuccess}
                                />
                            </>
                        )}

                        {/* Change deposit Form View */}
                        {sheetMode === 'exDeposit' && edit && (
                            <>
                                <SheetHeader>
                                    <SheetTitle>Edit Rental Status for customer: {edit.full_name}</SheetTitle>
                                    <SheetDescription>Update the rental's details.</SheetDescription>
                                </SheetHeader>
                                <ChangeDeposit
                                    selectedRow={selectedRow}
                                    depositTypes={pageProps.depositTypes || depositTypes || []}
                                    users={users}
                                    onSubmitSuccess={handleFormSubmitSuccess}
                                />
                            </>
                        )}

                        {/* Pick up Form View */}
                        {sheetMode === 'pick-up' && edit && (
                            <>
                                <SheetHeader>
                                    <SheetTitle>Edit Rental Status for customer: {edit.full_name}</SheetTitle>
                                    <SheetDescription>Update the rental's details.</SheetDescription>
                                </SheetHeader>
                                <Pickup
                                    selectedRow={selectedRow}
                                    vehicleStatuses={pageProps.vehicleStatuses || vehicleStatuses || []}
                                    depositTypes={depositTypes}
                                    users={users}
                                    onSubmitSuccess={handleFormSubmitSuccess}
                                />
                            </>
                        )}

                        {/* Temporary Form View */}
                        {sheetMode === 'temporary' && edit && (
                            <>
                                <SheetHeader>
                                    <SheetTitle>Edit Rental Status for customer: {edit.full_name}</SheetTitle>
                                    <SheetDescription>Update the rental's details.</SheetDescription>
                                </SheetHeader>
                                <TemporaryReturn
                                    selectedRow={selectedRow}
                                    vehicleStatuses={pageProps.vehicleStatuses || vehicleStatuses || []}
                                    users={users}
                                    onSubmitSuccess={handleFormSubmitSuccess}
                                />
                            </>
                        )}

                        {/* Return Form View */}
                        {sheetMode === 'return' && edit && (
                            <>
                                <SheetHeader>
                                    <SheetTitle>Edit Rental Status for customer: {edit.full_name}</SheetTitle>
                                    <SheetDescription>Update the rental's details.</SheetDescription>
                                </SheetHeader>
                                <Return
                                    selectedRow={selectedRow}
                                    vehicleStatuses={pageProps.vehicleStatuses || vehicleStatuses || []}
                                    users={users}
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

export default RentalsIndex;
