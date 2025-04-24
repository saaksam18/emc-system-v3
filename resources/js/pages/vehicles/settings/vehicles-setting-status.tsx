import HeadingSmall from '@/components/heading-small';
import { Button } from '@/components/ui/button';
import { columns, TableMeta } from '@/components/vehicles/settings/status/columns';
import { DataTable } from '@/components/vehicles/settings/status/data-table';
import AppLayout from '@/layouts/app-layout';
// Use RoleObject if it matches the type definition used in UserForm and columns
// Or keep Role if that's the correct type throughout your app. Ensure consistency.
import { VehicleStatusType, type BreadcrumbItem } from '@/types';
import { Deferred, Head, router, usePage } from '@inertiajs/react';
import { UserPlus } from 'lucide-react';
// Import useState for managing component state
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

// --- Import the User Form Component ---
// Make sure the path is correct for your project structure
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import Create from '@/components/vehicles/settings/status/sheets/create';
import { Edit } from '@/components/vehicles/settings/status/sheets/edit';
import VehiclesSettingsLayout from './vehicles-settings-layout';

// --- Breadcrumbs Configuration ---
const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Vehicle',
        href: '/vehicles',
    },
    {
        title: 'Status',
        href: '/vehicles/settings/status',
    },
];

// --- Component Props Interface ---
interface PageProps {
    vehicleStatus: VehicleStatusType[];
    flash?: {
        success?: string;
        error?: string;
        errors?: Record<string, string | string[]>;
    };
    [key: string]: any;
}

// --- UserIndex Component ---
function VehiclesSettingStatus({ vehicleStatus }: PageProps) {
    const { props: pageProps } = usePage<PageProps>();

    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState<VehicleStatusType | null>(null);

    // Other UI State
    const [sheetMode, setSheetMode] = useState<'create' | 'edit'>('create');
    const [edit, setEdit] = useState<VehicleStatusType | null>(null);
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
        setSelectedStatus(null); // Clear details view
        setEdit(null); // Clear editing view
        setIsSheetOpen(true);
    };

    const handleEdit = useCallback((statusToEdit: VehicleStatusType) => {
        setSheetMode('edit');
        setSelectedStatus(statusToEdit); // Clear details view
        setEdit(statusToEdit);
        setIsSheetOpen(true);
    }, []);

    const handleFormSubmitSuccess = () => {
        setIsSheetOpen(false);
        router.reload({ only: ['vehicleStatus'] });
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
                <Deferred data="vehicleStatus" fallback={<div className="p-4 text-center">Loading user data...</div>}>
                    <DataTable
                        columns={columns}
                        data={vehicleStatus || []}
                        meta={{
                            edit: handleEdit,
                            globalFilter: globalFilter,
                            onGlobalFilterChange: setGlobalFilter,
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

                        {sheetMode === 'edit' && edit && (
                            <>
                                <SheetHeader>
                                    <SheetTitle>Edit Customer: {edit.status_name}</SheetTitle>
                                    <SheetDescription>Update the customer's details.</SheetDescription>
                                </SheetHeader>
                                {/* Placeholder for your Customer Edit Form Component */}
                                <Edit vehicleStatus={selectedStatus} onSubmitSuccess={handleFormSubmitSuccess} />
                            </>
                        )}
                    </SheetContent>
                </Sheet>
            </VehiclesSettingsLayout>
        </AppLayout>
    );
}

export default VehiclesSettingStatus;
