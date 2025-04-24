import HeadingSmall from '@/components/heading-small';
import { Button } from '@/components/ui/button';
import { columns, TableMeta } from '@/components/vehicles/settings/classes/columns';
import { DataTable } from '@/components/vehicles/settings/classes/data-table';
import AppLayout from '@/layouts/app-layout';
// Use RoleObject if it matches the type definition used in UserForm and columns
// Or keep Role if that's the correct type throughout your app. Ensure consistency.
import { VehicleClass, type BreadcrumbItem } from '@/types';
import { Deferred, Head, router, usePage } from '@inertiajs/react';
import { UserPlus } from 'lucide-react';
// Import useState for managing component state
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

// --- Import the User Form Component ---
// Make sure the path is correct for your project structure
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import Create from '@/components/vehicles/settings/classes/sheets/create';
import { Edit } from '@/components/vehicles/settings/classes/sheets/edit';
import VehiclesSettingsLayout from './vehicles-settings-layout';

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
interface PageProps {
    vehicleClasses: VehicleClass[];
    flash?: {
        success?: string;
        error?: string;
        errors?: Record<string, string | string[]>;
    };
    [key: string]: any;
}

// --- UserIndex Component ---
function VehiclesSettingClasses({ vehicleClasses }: PageProps) {
    const { props: pageProps } = usePage<PageProps>();

    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [selectedClasses, setSelectedClasses] = useState<VehicleClass | null>(null);

    // Other UI State
    const [sheetMode, setSheetMode] = useState<'create' | 'edit'>('create');
    const [editClasses, setEditClasses] = useState<VehicleClass | null>(null);
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
    const handleCreate = () => {
        setSheetMode('create');
        setSelectedClasses(null); // Clear details view
        setEditClasses(null); // Clear editing view
        setIsSheetOpen(true);
    };

    const handleEdit = useCallback((vehicleToEdit: VehicleClass) => {
        setSheetMode('edit');
        setSelectedClasses(vehicleToEdit); // Clear details view
        setEditClasses(vehicleToEdit);
        setIsSheetOpen(true);
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
        edit: handleEdit,
    };

    // --- Render Logic ---
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Settings" />
            <VehiclesSettingsLayout>
                <div className="mb-4 flex items-center justify-between space-y-2">
                    {/* Adjusted layout for button */}
                    <div>
                        <HeadingSmall title="Vehicle Classes" description="See all the registered vehicle classes here." />
                    </div>
                    {/* Button to trigger Create User */}
                    {/* Filter Input and Create Button */}
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        {/* --- Global Filter Input --- */}
                        <Input
                            placeholder="Filter class..."
                            value={globalFilter}
                            onChange={(event) => setGlobalFilter(event.target.value)}
                            className="w-full sm:max-w-xs" // Adjust width as needed
                        />
                        <Button variant="default" onClick={handleCreate} className="w-full sm:w-auto">
                            <UserPlus className="mr-2 h-4 w-4" /> Create
                        </Button>
                    </div>
                </div>

                {/* User Data Table */}
                <Deferred data="vehicleClasses" fallback={<div className="p-4 text-center">Loading user data...</div>}>
                    <DataTable
                        columns={columns}
                        data={vehicleClasses || []}
                        // Pass the edit handler function and roles via meta
                        // Ensure your DataTable component forwards meta to useReactTable
                        meta={{
                            edit: handleEdit,
                            globalFilter: globalFilter, // Pass the filter value
                            onGlobalFilterChange: setGlobalFilter, // Pass the state setter function
                        }}
                    />
                </Deferred>

                <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                    <SheetContent className="overflow-y-auto sm:max-w-lg">
                        {/* Conditionally render Sheet content based on mode */}

                        {sheetMode === 'create' && (
                            <>
                                <SheetHeader>
                                    <SheetTitle>Create New Customer</SheetTitle>
                                    <SheetDescription>Enter the details for the new customer.</SheetDescription>
                                </SheetHeader>
                                {/* Placeholder for your Customer Create Form Component */}
                                <Create onSubmitSuccess={handleFormSubmitSuccess} />
                            </>
                        )}

                        {sheetMode === 'edit' && editClasses && (
                            <>
                                <SheetHeader>
                                    <SheetTitle>Edit Customer: {editClasses.name}</SheetTitle>
                                    <SheetDescription>Update the customer's details.</SheetDescription>
                                </SheetHeader>
                                {/* Placeholder for your Customer Edit Form Component */}
                                <Edit vehicleClass={selectedClasses} onSubmitSuccess={handleFormSubmitSuccess} />
                            </>
                        )}
                    </SheetContent>
                </Sheet>
            </VehiclesSettingsLayout>
        </AppLayout>
    );
}

export default VehiclesSettingClasses;
