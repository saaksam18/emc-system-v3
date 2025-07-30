import { Deferred, Head, router, usePage } from '@inertiajs/react';
import { UserPlus } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

// --- UI Components ---
import HeadingSmall from '@/components/heading-small'; // Assuming path
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';

// --- Table Components ---
// UPDATED: Import columns and TableMeta specifically for makers
import { columns, TableMeta } from '@/components/vehicles/settings/makers/columns'; // Assuming path
import { DataTable } from '@/components/vehicles/settings/makers/data-table'; // Assuming path

// --- Form Components ---
// UPDATED: Import Create and Edit components specifically for makers
import Create from '@/components/vehicles/settings/makers/sheets/create'; // Assuming path
import { Edit } from '@/components/vehicles/settings/makers/sheets/edit'; // Assuming path

// --- Layouts ---
import AppLayout from '@/layouts/app-layout'; // Assuming path

// --- Types ---
// UPDATED: Import VehicleMakerType
import SettingsLayout from '@/layouts/settings/layout';
import type { BreadcrumbItem, VehicleMakerType } from '@/types'; // Assuming path

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
const Skeleton = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>, ref) => {
        return (
            <div
                ref={ref}
                // Apply base styles: pulse animation, rounded corners, muted background
                className={cn('bg-muted animate-pulse rounded-md', className || '')}
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
// UPDATED: Breadcrumbs for Makers
const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Settings',
        href: '/settings',
    },
    {
        title: 'Makers', // Changed from Classes
        href: '/vehicles/settings/makers', // Changed from Classes
    },
];

// --- Component Props Interface ---
interface PageProps {
    // UPDATED: Prop name for makers
    vehicleMakers: VehicleMakerType[];
    flash?: {
        success?: string;
        error?: string;
        errors?: Record<string, string | string[]>;
    };
    [key: string]: any;
}

// --- VehiclesSettingMakers Component ---
// UPDATED: Component name and props destructuring
const VehiclesSettingMakers: React.FC<PageProps> = ({ vehicleMakers: initialVehicleMakers }) => {
    // Type the page props obtained from usePage
    const { props: pageProps } = usePage<PageProps>();

    // State for sheet management
    const [isSheetOpen, setIsSheetOpen] = useState<boolean>(false);
    const [sheetMode, setSheetMode] = useState<'create' | 'edit'>('create');
    // UPDATED: State variable name for the maker being edited
    const [editMaker, setEditMaker] = useState<VehicleMakerType | null>(null);

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
        // UPDATED: Clear the correct state variable
        setEditMaker(null);
        setIsSheetOpen(true);
    };

    // Use useCallback to memoize the handler
    const handleEdit = useCallback((makerToEdit: VehicleMakerType) => {
        setSheetMode('edit');
        // UPDATED: Set the correct state variable
        setEditMaker(makerToEdit);
        setIsSheetOpen(true);
    }, []);

    // Handler for successful form submission
    const handleFormSubmitSuccess = () => {
        setIsSheetOpen(false);
        // UPDATED: Reload the correct data key
        router.reload({ only: ['vehicleMakers'] });
    };

    // Memoize table meta object
    // UPDATED: Pass the correct state/handlers
    const tableMeta: TableMeta = React.useMemo(
        () => ({
            edit: handleEdit,
            globalFilter: globalFilter,
            onGlobalFilterChange: setGlobalFilter,
        }),
        [handleEdit, globalFilter],
    );

    // --- Render Logic ---
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            {/* UPDATED: Head title */}
            <Head title="Vehicle Makers Settings" />
            <SettingsLayout>
                {/* Header Section */}
                <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    {/* Page Title and Description */}
                    <div>
                        {/* UPDATED: Title and description */}
                        <HeadingSmall title="Vehicle Makers" description="Manage registered vehicle makers." />
                    </div>

                    {/* Actions: Filter and Create Button */}
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <Input
                            // UPDATED: Placeholder text
                            placeholder="Filter makers..."
                            value={globalFilter}
                            onChange={(event: React.ChangeEvent<HTMLInputElement>) => setGlobalFilter(event.target.value)}
                            className="w-full sm:max-w-xs"
                        />
                        <Button variant="default" onClick={handleCreate} className="w-full shrink-0 sm:w-auto">
                            {/* UPDATED: Button text */}
                            <UserPlus className="mr-2 h-4 w-4" /> Create Maker
                        </Button>
                    </div>
                </div>

                {/* Data Table Section with Deferred Loading and Skeleton Fallback */}
                {/* UPDATED: data prop name in Deferred */}
                <Deferred data="vehicleMakers" fallback={<SkeletonTable rowCount={10} columnCount={columns.length} />}>
                    <DataTable
                        columns={columns} // Use maker columns
                        // UPDATED: data prop passed to DataTable
                        data={pageProps.vehicleMakers || initialVehicleMakers || []}
                        meta={tableMeta} // Pass the memoized meta object
                    />
                </Deferred>

                {/* Sheet for Create/Edit Forms */}
                <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                    <SheetContent key={sheetMode} className="overflow-y-auto sm:max-w-lg">
                        {/* Conditional Rendering based on sheetMode */}
                        {sheetMode === 'create' && (
                            <>
                                <SheetHeader>
                                    {/* UPDATED: Sheet title/description */}
                                    <SheetTitle>Create New Vehicle Maker</SheetTitle>
                                    <SheetDescription>Enter the details for the new vehicle maker.</SheetDescription>
                                </SheetHeader>
                                {/* Use the Create component for makers */}
                                <Create onSubmitSuccess={handleFormSubmitSuccess} />
                            </>
                        )}

                        {/* UPDATED: Check the correct state variable */}
                        {sheetMode === 'edit' && editMaker && (
                            <>
                                <SheetHeader>
                                    {/* UPDATED: Sheet title/description */}
                                    <SheetTitle>Edit Vehicle Maker: {editMaker.name}</SheetTitle>
                                    <SheetDescription>Update the vehicle maker's details.</SheetDescription>
                                </SheetHeader>
                                {/* UPDATED: Pass the correct prop name 'vehicleMaker' to the Edit component */}
                                <Edit vehicleMaker={editMaker} onSubmitSuccess={handleFormSubmitSuccess} />
                            </>
                        )}
                    </SheetContent>
                </Sheet>
            </SettingsLayout>
        </AppLayout>
    );
};

export default VehiclesSettingMakers;
