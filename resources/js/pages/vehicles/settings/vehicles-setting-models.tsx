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
// UPDATED: Import columns and TableMeta specifically for models
import { columns, TableMeta } from '@/components/vehicles/settings/model/columns'; // Assuming path
import { DataTable } from '@/components/vehicles/settings/model/data-table'; // Assuming path

// --- Form Components ---
// UPDATED: Import Create and Edit components specifically for models
import Create from '@/components/vehicles/settings/model/sheets/create'; // Assuming path
import { Edit } from '@/components/vehicles/settings/model/sheets/edit'; // Assuming path

// --- Layouts ---
import AppLayout from '@/layouts/app-layout'; // Assuming path
import VehiclesSettingsLayout from './vehicles-settings-layout'; // Assuming path

// --- Types ---
// UPDATED: Import VehicleModelType and VehicleMakerType
import type { BreadcrumbItem, VehicleMakerType, VehicleModelType } from '@/types'; // Assuming path

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
    // Adjust based on the actual columns for models
    const columnWidths = ['w-12', 'w-2/5', 'w-1/3', 'w-1/6', 'w-16'];

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
// UPDATED: Breadcrumbs for Models
const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Vehicle',
        href: '/vehicles',
    },
    {
        title: 'Models', // Changed
        href: '/vehicles/settings/models', // Changed
    },
];

// --- Component Props Interface ---
interface PageProps {
    // UPDATED: Prop name for models (using camelCase)
    VehicleActualModels: VehicleModelType[];
    // Prop for makers, needed for Create/Edit forms
    vehicleMakers: VehicleMakerType[] | null; // Allow null if it might not be present initially
    flash?: {
        success?: string;
        error?: string;
        errors?: Record<string, string | string[]>;
    };
    [key: string]: any;
}

// --- VehiclesSettingModels Component ---
// UPDATED: Component name and props destructuring (using camelCase for VehicleActualModels)
const VehiclesSettingModels: React.FC<PageProps> = ({
    VehicleActualModels: initialVehicleActualModels,
    vehicleMakers, // Destructure makers prop
}) => {
    // Type the page props obtained from usePage
    const { props: pageProps } = usePage<PageProps>();

    // State for sheet management
    const [isSheetOpen, setIsSheetOpen] = useState<boolean>(false);
    const [sheetMode, setSheetMode] = useState<'create' | 'edit'>('create');
    // UPDATED: State variable name for the model being edited
    const [editModel, setEditModel] = useState<VehicleModelType | null>(null);

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
        setEditModel(null);
        setIsSheetOpen(true);
    };

    // Use useCallback to memoize the handler
    const handleEdit = useCallback((modelToEdit: VehicleModelType) => {
        setSheetMode('edit');
        // UPDATED: Set the correct state variable
        setEditModel(modelToEdit);
        setIsSheetOpen(true);
    }, []);

    // Handler for successful form submission
    const handleFormSubmitSuccess = () => {
        setIsSheetOpen(false);
        // UPDATED: Reload the correct data key (matching the prop name)
        router.reload({ only: ['VehicleActualModels'] });
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
            <Head title="Vehicle Models Settings" />
            <VehiclesSettingsLayout>
                {/* Header Section */}
                <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    {/* Page Title and Description */}
                    <div>
                        {/* UPDATED: Title and description */}
                        <HeadingSmall title="Vehicle Models" description="Manage registered vehicle models." />
                    </div>

                    {/* Actions: Filter and Create Button */}
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <Input
                            // UPDATED: Placeholder text
                            placeholder="Filter models..."
                            value={globalFilter}
                            onChange={(event: React.ChangeEvent<HTMLInputElement>) => setGlobalFilter(event.target.value)}
                            className="w-full sm:max-w-xs"
                        />
                        <Button variant="default" onClick={handleCreate} className="w-full shrink-0 sm:w-auto">
                            {/* UPDATED: Button text */}
                            <UserPlus className="mr-2 h-4 w-4" /> Create Model
                        </Button>
                    </div>
                </div>

                {/* Data Table Section with Deferred Loading and Skeleton Fallback */}
                {/* UPDATED: data prop name in Deferred (matching the prop name) */}
                <Deferred data="VehicleActualModels" fallback={<SkeletonTable rowCount={10} columnCount={columns.length} />}>
                    <DataTable
                        columns={columns} // Use model columns
                        // UPDATED: data prop passed to DataTable (using camelCase)
                        // Use latest props from usePage if available, otherwise initial props
                        data={pageProps.VehicleActualModels || initialVehicleActualModels || []}
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
                                    <SheetTitle>Create New Vehicle Model</SheetTitle>
                                    <SheetDescription>Enter the details for the new vehicle model.</SheetDescription>
                                </SheetHeader>
                                {/* UPDATED: Use the Create component for models, pass vehicleMakers */}
                                <Create
                                    vehicleMakers={pageProps.vehicleMakers || vehicleMakers || []} // Pass makers data
                                    onSubmitSuccess={handleFormSubmitSuccess}
                                />
                            </>
                        )}

                        {/* UPDATED: Check the correct state variable */}
                        {sheetMode === 'edit' && editModel && (
                            <>
                                <SheetHeader>
                                    {/* UPDATED: Sheet title/description */}
                                    <SheetTitle>Edit Vehicle Model: {editModel.name}</SheetTitle>
                                    <SheetDescription>Update the vehicle model's details.</SheetDescription>
                                </SheetHeader>
                                {/* UPDATED: Pass the correct props 'vehicleModel' and 'vehicleMakers' to the Edit component */}
                                <Edit
                                    vehicleModel={editModel} // Pass the model being edited
                                    vehicleMakers={pageProps.vehicleMakers || vehicleMakers || []} // Pass makers data
                                    onSubmitSuccess={handleFormSubmitSuccess}
                                />
                            </>
                        )}
                    </SheetContent>
                </Sheet>
            </VehiclesSettingsLayout>
        </AppLayout>
    );
};

// UPDATED: Export the correctly named component
export default VehiclesSettingModels;
