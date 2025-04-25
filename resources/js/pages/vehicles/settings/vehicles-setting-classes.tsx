import { Deferred, Head, router, usePage } from '@inertiajs/react';
import { UserPlus } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

// --- UI Components ---
import HeadingSmall from '@/components/heading-small'; // Assuming this path is correct
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';

// --- Table Components ---
import { columns, TableMeta } from '@/components/vehicles/settings/classes/columns'; // Assuming path
import { DataTable } from '@/components/vehicles/settings/classes/data-table'; // Assuming path

// --- Form Components ---
import Create from '@/components/vehicles/settings/classes/sheets/create'; // Assuming path
import { Edit } from '@/components/vehicles/settings/classes/sheets/edit'; // Assuming path

// --- Layouts ---
import AppLayout from '@/layouts/app-layout'; // Assuming path
import VehiclesSettingsLayout from './vehicles-settings-layout'; // Assuming path

// --- Types ---
// Using 'import type' for type-only imports is good practice
import type { BreadcrumbItem, VehicleClass } from '@/types'; // Assuming path

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
        title: 'Vehicle',
        href: '/vehicles',
    },
    {
        title: 'Classes',
        href: '/vehicles/settings/classes',
    },
];

// --- Component Props Interface ---
// Define more specific props based on what Inertia provides
interface PageProps {
    vehicleClasses: VehicleClass[]; // Make sure this matches the deferred prop name
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
const VehiclesSettingClasses: React.FC<PageProps> = ({ vehicleClasses: initialVehicleClasses }) => {
    // Type the page props obtained from usePage
    const { props: pageProps } = usePage<PageProps>();

    // State for sheet management
    const [isSheetOpen, setIsSheetOpen] = useState<boolean>(false);
    const [sheetMode, setSheetMode] = useState<'create' | 'edit'>('create');
    const [editClasses, setEditClasses] = useState<VehicleClass | null>(null); // For passing data to Edit sheet

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

    // --- Handlers for Sheet Actions ---
    const handleCreate = () => {
        setSheetMode('create');
        setEditClasses(null); // Clear any previous edit data
        setIsSheetOpen(true);
    };

    // Use useCallback to memoize the handler if passed to child components frequently
    const handleEdit = useCallback((vehicleToEdit: VehicleClass) => {
        setSheetMode('edit');
        setEditClasses(vehicleToEdit); // Set data for the edit sheet
        setIsSheetOpen(true);
    }, []); // Empty dependency array means function is created once

    // Handler for successful form submission (Create or Edit)
    const handleFormSubmitSuccess = () => {
        setIsSheetOpen(false);
        // Reload data - adjust 'only' array based on what data needs refreshing
        // Ensure 'vehicleClasses' is the correct key for the data you need to reload
        router.reload({ only: ['vehicleClasses'] });
    };

    // Memoize table meta object if necessary, especially if DataTable re-renders often
    const tableMeta: TableMeta = React.useMemo(
        () => ({
            edit: handleEdit,
            globalFilter: globalFilter,
            onGlobalFilterChange: setGlobalFilter,
        }),
        [handleEdit, globalFilter],
    ); // Dependencies for memoization

    // --- Render Logic ---
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Vehicle Classes Settings" /> {/* More specific title */}
            <VehiclesSettingsLayout>
                {/* Header Section */}
                <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    {/* Page Title and Description */}
                    <div>
                        <HeadingSmall title="Vehicle Classes" description="Manage registered vehicle classes." />
                    </div>

                    {/* Actions: Filter and Create Button */}
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <Input
                            placeholder="Filter classes..."
                            value={globalFilter}
                            onChange={(event: React.ChangeEvent<HTMLInputElement>) => setGlobalFilter(event.target.value)}
                            className="w-full sm:max-w-xs" // Responsive width
                        />
                        <Button variant="default" onClick={handleCreate} className="w-full shrink-0 sm:w-auto">
                            {' '}
                            {/* Added shrink-0 */}
                            <UserPlus className="mr-2 h-4 w-4" /> Create Class
                        </Button>
                    </div>
                </div>

                {/* Data Table Section with Deferred Loading and Skeleton Fallback */}
                {/* Ensure the prop name 'vehicleClasses' matches what Inertia provides */}
                <Deferred data="vehicleClasses" fallback={<SkeletonTable rowCount={10} columnCount={columns.length} />}>
                    {/* The DataTable receives the actual data once loaded */}
                    <DataTable
                        columns={columns}
                        // Use the latest data from pageProps, fall back to initial, then empty array
                        data={pageProps.vehicleClasses || initialVehicleClasses || []}
                        meta={tableMeta} // Pass the memoized meta object
                    />
                </Deferred>

                {/* Sheet for Create/Edit Forms */}
                <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                    {/* Added key to force re-mount on mode change if needed, helps reset form state */}
                    <SheetContent key={sheetMode} className="overflow-y-auto sm:max-w-lg">
                        {/* Conditional Rendering based on sheetMode */}
                        {sheetMode === 'create' && (
                            <>
                                <SheetHeader>
                                    <SheetTitle>Create New Vehicle Class</SheetTitle>
                                    <SheetDescription>Enter the details for the new vehicle class.</SheetDescription>
                                </SheetHeader>
                                {/* Pass the success handler to the Create form */}
                                <Create onSubmitSuccess={handleFormSubmitSuccess} />
                            </>
                        )}

                        {sheetMode === 'edit' && editClasses && (
                            <>
                                <SheetHeader>
                                    <SheetTitle>Edit Vehicle Class: {editClasses.name}</SheetTitle>
                                    <SheetDescription>Update the vehicle class's details.</SheetDescription>
                                </SheetHeader>
                                {/* Pass the vehicle class data and success handler to the Edit form */}
                                <Edit vehicleClass={editClasses} onSubmitSuccess={handleFormSubmitSuccess} />
                            </>
                        )}
                    </SheetContent>
                </Sheet>
            </VehiclesSettingsLayout>
        </AppLayout>
    );
};

export default VehiclesSettingClasses;
