import { Show } from '@/components/rentals/sheets/show';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { RentalsType, User } from '@/types';
import { Deferred, router, usePage } from '@inertiajs/react';
import React, { useCallback, useMemo, useState } from 'react';
import { Edit } from '../sheets/edit';
import { columns, TableMeta } from './tables/columns';
import { DataTable } from './tables/data-table';

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

// --- Page Props Interface ---
interface PageProps {
    rentals: RentalsType[];
    users: User[];
    [key: string]: any;
}

export default function LatePaymentSection({ rentals: initialRentals, vehicleStatuses, users }: PageProps) {
    const { props: pageProps } = usePage<PageProps>();
    // Sheet State
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [sheetMode, setSheetMode] = useState<'show' | 'edit'>('show');
    const [selectedRow, setSelectedRow] = useState<RentalsType | null>(null); // For showing details
    const [editRow, setEditRow] = useState<RentalsType | null>(null); // For editing

    // Filter State
    const [globalFilter, setGlobalFilter] = useState('');

    const handleShowDetails = useCallback((rental: RentalsType) => {
        setSheetMode('show');
        setSelectedRow(rental);
        setEditRow(null);
        setIsSheetOpen(true);
    }, []);

    const handleEditRow = useCallback((rentalToEdit: RentalsType) => {
        setSheetMode('edit');
        // Set both selected and edit? Decide based on Edit component needs.
        // Often, the Edit component only needs the data, not the 'selected' state.
        setSelectedRow(rentalToEdit); // Clear show details view
        setEditRow(rentalToEdit); // Set data for edit form
        setIsSheetOpen(true);
    }, []);

    const handleFormSubmitSuccess = () => {
        setIsSheetOpen(false);
        // Reload necessary data, adjust 'only' array as needed
        router.reload({ only: ['rentals'] });
    };

    // --- Table Meta ---
    // Memoize the meta object to avoid unnecessary re-renders of the DataTable
    const tableMeta: TableMeta = useMemo(
        () => ({
            globalFilter: globalFilter,
            onGlobalFilterChange: setGlobalFilter,
            show: handleShowDetails,
            edit: handleEditRow,
        }),
        [globalFilter, handleShowDetails, handleEditRow],
    );
    return (
        <Card>
            <CardHeader>
                <CardTitle>Rental Overdue</CardTitle>
                <CardDescription>Showing overdue rental data. Expand the action menu to update data.</CardDescription>
            </CardHeader>
            <CardContent>
                <Deferred data="rentals" fallback={<SkeletonTable rowCount={10} columnCount={columns.length} />}>
                    <DataTable
                        columns={columns}
                        // Use latest data from usePage if available, else initial props
                        data={pageProps.rentals || initialRentals || []}
                        meta={tableMeta}
                    />
                </Deferred>

                {/* Sheet Definition */}
                <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                    <SheetContent className="overflow-y-auto sm:max-w-lg">
                        {sheetMode === 'show' && selectedRow && (
                            <>
                                <SheetHeader>
                                    <SheetTitle>Vehicle No. {selectedRow?.vehicle_no || 'N/A'} Details:</SheetTitle>
                                    <SheetDescription>Viewing details for vehicle no: {selectedRow?.vehicle_no || 'N/A'}</SheetDescription>
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
                        {sheetMode === 'edit' && selectedRow && (
                            <>
                                <SheetHeader>
                                    <SheetTitle>Edit Rental Status for customer: {selectedRow.full_name}</SheetTitle>
                                    <SheetDescription>Update the rental's details.</SheetDescription>
                                </SheetHeader>
                                <Edit selectedRow={selectedRow} users={users} onSubmitSuccess={handleFormSubmitSuccess} />
                            </>
                        )}
                    </SheetContent>
                </Sheet>
            </CardContent>
        </Card>
    );
}
