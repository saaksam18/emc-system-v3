import React, { useCallback, useEffect, useMemo, useState } from 'react'; // Added React import and useMemo

// --- Inertia Imports ---
// Removed Deferred as it's not used here for the primary data
import { Deferred, Head, usePage } from '@inertiajs/react';

// --- Layout Imports ---
import AppLayout from '@/layouts/app-layout'; // Adjust path if needed

// --- UI Component Imports (shadcn/ui) ---
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { toast } from 'sonner'; // For notifications

// --- Custom Component Imports ---
// Updated paths for settings components
import { Create } from '@/components/customers/sheets/settings/create'; // Adjust path
import { Edit } from '@/components/customers/sheets/settings/edit'; // Adjust path
import { columns, TableMeta } from '@/components/customers/sheets/settings/tables/columns'; // Adjust path
import { DataTable } from '@/components/customers/sheets/settings/tables/data-table'; // Adjust path

// --- Type Imports ---
// Make sure these types are correctly defined in '@/types'
import type { BreadcrumbItem, ContactTypes, User } from '@/types'; // Added 'type' keyword

// --- Utility Imports ---
import SettingsLayout from '@/layouts/settings/layout';
import { cn } from '@/lib/utils'; // For Tailwind class merging (Ensure this path is correct)
import { BookUser } from 'lucide-react'; // Icons

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
    minWidth = '500px', // Adjusted default min-width for potentially fewer columns
    columnWidths = ['w-1/3', 'w-1/2', 'w-16'], // Default widths, adjust as needed for contact types table
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
        href: '/customers',
    },
    {
        title: 'Settings',
        href: '/customers/settings',
    },
];

// --- Page Props Interface ---
interface PageProps {
    users: User[];
    contactTypes: ContactTypes[]; // Ensure this is always an array
    auth: { user: User };
    flash?: {
        success?: string;
        error?: string;
        // Make errors potentially undefined or an object
        errors?: Record<string, string | string[]> | undefined | null;
    };
    // Allow other props that might be passed
    [key: string]: any;
}

// --- SettingsIndex Component ---
const SettingsIndex: React.FC<PageProps> = ({ contactTypes: initialContactTypes }) => {
    // Use React.FC
    const { props: pageProps } = usePage<PageProps>();
    // Ensure contactTypes is always an array, even if props are initially undefined
    const contactTypes = useMemo(() => pageProps.contactTypes || [], [pageProps.contactTypes]);

    // Sheet State
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [selectedContactType, setSelectedContactType] = useState<ContactTypes | null>(null); // Used for both Show and Edit
    const [sheetMode, setSheetMode] = useState<'show' | 'create' | 'edit'>('create');

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
        setSelectedContactType(null);
        setIsSheetOpen(true);
    };

    const handleShowDetails = useCallback((contactType: ContactTypes) => {
        setSheetMode('show');
        setSelectedContactType(contactType);
        setIsSheetOpen(true);
    }, []);

    const handleEditContactType = useCallback((contactTypeToEdit: ContactTypes) => {
        setSheetMode('edit');
        setSelectedContactType(contactTypeToEdit);
        setIsSheetOpen(true);
    }, []);

    const handleFormSubmitSuccess = () => {
        setIsSheetOpen(false);
        setSelectedContactType(null);
    };

    // Close sheet handler
    const handleSheetOpenChange = (open: boolean) => {
        setIsSheetOpen(open);
        if (!open) {
            setSelectedContactType(null); // Reset selection when sheet closes
        }
    };

    // --- Table Meta ---
    const tableMeta: TableMeta = useMemo(
        () => ({
            globalFilter: globalFilter,
            onGlobalFilterChange: setGlobalFilter,
            createContactTypes: handleCreateClick, // Pass handler if needed by columns/table
            showDetails: handleShowDetails,
            editContactTypes: handleEditContactType,
        }),
        [globalFilter, handleCreateClick, handleShowDetails, handleEditContactType],
    ); // Dependencies

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <SettingsLayout>
                <Head title="Contact Type Settings" />
                <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Contact Types</CardTitle>
                            <CardDescription>View, create, and manage customer contact types.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {/* Filter and Action Buttons */}
                            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <Input
                                    placeholder="Filter contact types..."
                                    value={globalFilter}
                                    onChange={(event: React.ChangeEvent<HTMLInputElement>) => setGlobalFilter(event.target.value)}
                                    className="w-full sm:max-w-xs"
                                />
                                <Button variant="default" onClick={handleCreateClick} className="w-full shrink-0 sm:w-auto">
                                    {/* Changed variant */}
                                    <BookUser className="mr-2 h-4 w-4" /> Create
                                </Button>
                            </div>
                            {/* } */}
                            <Deferred data="contactTypes" fallback={<SkeletonTable rowCount={10} columnCount={columns.length} />}>
                                <DataTable
                                    columns={columns}
                                    // Use latest data from usePage if available, else initial props
                                    data={pageProps.contactTypes || initialContactTypes || []}
                                    meta={tableMeta}
                                />
                            </Deferred>
                            {/* Removed Deferred as data is expected to be present initially */}
                        </CardContent>
                    </Card>

                    {/* Sheet for Create/Edit/Show */}
                    <Sheet open={isSheetOpen} onOpenChange={handleSheetOpenChange}>
                        <SheetContent className="overflow-y-auto sm:max-w-lg">
                            {/* Show Details View */}
                            {/* {sheetMode === 'show' && selectedContactType && (
                                <>
                                    <SheetHeader>
                                        <SheetTitle>{selectedContactType.name} Details</SheetTitle>
                                        <SheetDescription>Viewing details for contact type: {selectedContactType.name}</SheetDescription>
                                    </SheetHeader>
                                    <Show selectedContactType={selectedContactType} />
                                    <SheetFooter>
                                        <SheetClose asChild>
                                            <Button type="button" variant="outline">
                                                Close
                                            </Button>
                                        </SheetClose>
                                    </SheetFooter>
                                </>
                            )} */}

                            {/* Create Form View */}
                            {sheetMode === 'create' && (
                                <>
                                    <SheetHeader>
                                        <SheetTitle>Create New Contact Type</SheetTitle>
                                        <SheetDescription>Enter the details for the new contact type.</SheetDescription>
                                    </SheetHeader>
                                    <Create onSubmitSuccess={handleFormSubmitSuccess} />
                                </>
                            )}

                            {/* Edit Form View */}
                            {sheetMode === 'edit' && selectedContactType && (
                                <>
                                    <SheetHeader>
                                        <SheetTitle>Edit Contact Type: {selectedContactType.name}</SheetTitle>
                                        <SheetDescription>Update the contact type's details.</SheetDescription>
                                    </SheetHeader>
                                    <Edit
                                        contactType={selectedContactType} // Pass data to edit form
                                        onSubmitSuccess={handleFormSubmitSuccess}
                                    />
                                </>
                            )}
                        </SheetContent>
                    </Sheet>
                </div>
            </SettingsLayout>
        </AppLayout>
    );
};

export default SettingsIndex;
