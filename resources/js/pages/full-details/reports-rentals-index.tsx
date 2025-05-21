import { Deferred, Head, usePage } from '@inertiajs/react';
import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

// --- UI Components ---
import HeadingSmall from '@/components/heading-small'; // Assuming this path is correct
import { Input } from '@/components/ui/input';

// --- Table Components ---
import { columns, TableMeta } from '@/components/histories/table/columns'; // Assuming path
import { DataTable } from '@/components/histories/table/data-table'; // Assuming path

// --- Form Components ---

// --- Layouts ---
import AppLayout from '@/layouts/app-layout'; // Assuming path
import FullDetailsLayout from './layouts/full-details-layout'; // Assuming path

// --- Types ---
// Using 'import type' for type-only imports is good practice
import { Show } from '@/components/histories/sheets/show';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import type { BreadcrumbItem, RentalsType } from '@/types'; // Assuming path

// --- Utility Function for Class Names (like shadcn/ui uses) ---
/**
 * Utility function to conditionally join class names.
 * Filters out falsy values and joins the rest with spaces.
 * @param {...string} classes - Class names to join.
 * @returns {string} - Joined class names string.
 */
function cn(...classes: string[]): string {
    return classes.filter(Boolean).join(' ');
}

// --- Shadcn UI Skeleton Component ---
// (Typically added via CLI: `npx shadcn-ui@latest add skeleton`)
/**
 * Skeleton component for displaying loading placeholders.
 */
// FIX: Explicitly type the props object in the function signature
const Skeleton = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>, ref) => {
        return (
            <div
                ref={ref}
                // Apply base styles: pulse animation, rounded corners, muted background
                // Use the destructured className, defaulting to an empty string if undefined
                className={cn('bg-muted animate-pulse rounded-md', className || '')}
                // Spread the rest of the HTML attributes
                {...props}
            />
        );
    },
);
Skeleton.displayName = 'Skeleton';

// --- Skeleton Table Component ---
interface SkeletonTableProps {
    rowCount?: number;
    columnCount?: number;
}

/**
 * Renders a skeleton representation of the data table during loading.
 */
function SkeletonTable({ rowCount = 5, columnCount = 4 }: SkeletonTableProps) {
    // Define typical widths for skeleton columns to mimic the real table
    // Ensure these Tailwind classes are available in your project
    const columnWidths = ['w-12', 'w-2/5', 'w-1/4', 'w-1/6', 'w-16']; // Adjusted widths

    return (
        <div className="border-border overflow-x-auto rounded-lg border shadow-sm">
            {/* Added min-width to prevent excessive squishing on small screens */}
            <table className="bg-card text-card-foreground w-full min-w-[600px] table-auto border-collapse">
                {/* Skeleton Table Header */}
                <thead className="bg-muted/50">
                    <tr>
                        {/* Render skeleton headers based on columnCount */}
                        {Array.from({ length: columnCount }).map((_, index) => (
                            <th key={`skel-head-${index}`} className="text-muted-foreground p-3 text-left text-sm font-semibold">
                                {/* Use a slightly taller skeleton for headers */}
                                <Skeleton className={`h-5 ${columnWidths[index % columnWidths.length] || 'w-full'} bg-gray-300`} />
                            </th>
                        ))}
                    </tr>
                </thead>
                {/* Skeleton Table Body */}
                <tbody className="divide-border divide-y">
                    {/* Render skeleton rows */}
                    {Array.from({ length: rowCount }).map((_, rowIndex) => (
                        <tr key={`skeleton-row-${rowIndex}`} className="hover:bg-muted/50">
                            {/* Render skeleton cells based on columnCount */}
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

// --- Breadcrumbs Configuration ---
const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Customers',
        href: '/customers',
    },
    {
        title: 'Rental',
        href: '/reports/full-details/rentals',
    },
];

// --- Component Props Interface ---
// Define more specific props based on what Inertia provides
interface PageProps {
    rentals: RentalsType[]; // Make sure this matches the deferred prop name
    flash?: {
        success?: string;
        error?: string;
        // Use a more specific type for errors if possible, e.g., Record<string, string>
        errors?: Record<string, string | string[]>;
    };
    // Add other expected props from Inertia if known
    [key: string]: any; // Keep for flexibility if props vary
}

// --- VehiclesSettingClasses Component ---
// Use React.FC for functional components with props type
const ReportsRentalsIndex: React.FC<PageProps> = ({ rentals: initialRentals }) => {
    // Type the page props obtained from usePage
    const { props: pageProps } = usePage<PageProps>();

    // Sheet State
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [selectedRow, setSelectedRow] = useState<RentalsType | null>(null); // For showing details
    const [sheetMode, setSheetMode] = useState<'show'>('show');
    const [edit, setEdit] = useState<RentalsType | null>(null);

    // State for table filtering
    const [globalFilter, setGlobalFilter] = useState<string>('');

    // Effect for handling flash messages
    useEffect(() => {
        const flash = pageProps.flash;
        if (flash?.success) {
            toast.success(flash.success);
        }
        if (flash?.error) {
            toast.error(flash.error);
        }
        // Handle validation errors
        if (flash?.errors && typeof flash.errors === 'object' && flash.errors !== null) {
            Object.values(flash.errors)
                .flat() // Flatten in case errors are arrays of strings
                .forEach((message) => {
                    if (message) {
                        // Ensure message is not empty/null
                        toast.error(String(message)); // Convert to string just in case
                    }
                });
        }
    }, [pageProps.flash]); // Dependency array includes flash object

    const handleShow = useCallback((rentals: RentalsType) => {
        setSheetMode('show');
        setSelectedRow(rentals);
        setEdit(null);
        setIsSheetOpen(true);
    }, []);

    // Memoize table meta object if necessary, especially if DataTable re-renders often
    const tableMeta: TableMeta = React.useMemo(
        () => ({
            show: handleShow,
            globalFilter: globalFilter,
            onGlobalFilterChange: setGlobalFilter,
        }),
        [handleShow, globalFilter],
    ); // Dependencies for memoization

    // --- Render Logic ---
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Rental History" /> {/* More specific title */}
            <FullDetailsLayout>
                {/* Header Section */}
                <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    {/* Page Title and Description */}
                    <div>
                        <HeadingSmall title="Rental History" description="See full rental histories of the customer." />
                    </div>

                    {/* Actions: Filter and Create Button */}
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <Input
                            placeholder="Filter rental histories..."
                            value={globalFilter}
                            onChange={(event: React.ChangeEvent<HTMLInputElement>) => setGlobalFilter(event.target.value)}
                            className="w-full sm:max-w-xs" // Responsive width
                        />
                    </div>
                </div>

                {/* Data Table Section with Deferred Loading and Skeleton Fallback */}
                {/* Ensure the prop name 'vehicleClasses' matches what Inertia provides */}
                <Card className="p-4">
                    <Deferred data="rentals" fallback={<SkeletonTable rowCount={10} columnCount={columns.length} />}>
                        {/* The DataTable receives the actual data once loaded */}
                        <DataTable
                            columns={columns}
                            // Use the latest data from pageProps, fall back to initial, then empty array
                            data={pageProps.rentals || initialRentals || []}
                            meta={tableMeta} // Pass the memoized meta object
                        />
                    </Deferred>
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
                    </SheetContent>
                </Sheet>
            </FullDetailsLayout>
        </AppLayout>
    );
};

export default ReportsRentalsIndex;
