import React, { useCallback, useEffect, useMemo, useState } from 'react';

// --- Inertia Imports ---
import { Deferred, Head, usePage } from '@inertiajs/react';

// --- Layout Imports ---
import AppLayout from '@/layouts/app-layout';

// --- UI Component Imports (shadcn/ui) ---
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

// --- Custom Component Imports ---

// --- Type Imports ---
import type { BreadcrumbItem, User, Vendor } from '@/types';

// --- Utility Imports ---
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import Create from '@/components/vendors/sheets/create';
import Edit from '@/components/vendors/sheets/edit';
import { columns, TableMeta } from '@/components/vendors/tables/columns';
import { DataTable } from '@/components/vendors/tables/data-table';
import SettingsLayout from '@/layouts/settings/layout';
import { cn } from '@/lib/utils';
import { PlusCircle } from 'lucide-react';

// --- Skeleton Loader Components ---

const Skeleton = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>, ref) => {
        return <div ref={ref} className={cn('bg-muted animate-pulse rounded-md', className || '')} {...props} />;
    },
);
Skeleton.displayName = 'Skeleton';

interface SkeletonTableProps {
    rowCount?: number;
    columnCount?: number;
    minWidth?: string;
    columnWidths?: string[];
}

function SkeletonTable({ rowCount = 5, columnCount = 4, minWidth = '500px', columnWidths = ['w-1/3', 'w-1/2', 'w-16'] }: SkeletonTableProps) {
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
        title: 'Settings',
        href: '/settings/accountings',
    },
    {
        title: 'Vendors',
        href: route('settings.vendors.index'),
    },
];

// --- Page Props Interface ---
interface PageProps {
    users: User[];
    vendors: Vendor[];
    auth: { user: User };
    flash?: {
        success?: string;
        error?: string;
        errors?: Record<string, string | string[]> | undefined | null;
    };
    [key: string]: any;
}

// --- VendorsIndex Component ---
const Vendors: React.FC<PageProps> = ({ vendors: initialVendors }) => {
    const { props: pageProps } = usePage<PageProps>();
    const vendors = useMemo(() => pageProps.vendors || [], [pageProps.vendors]);

    // Sheet State
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
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
    const handleCreate = () => {
        setSheetMode('create');
        setSelectedVendor(null);
        setIsSheetOpen(true);
    };

    const handleEdit = useCallback((vendorToEdit: Vendor) => {
        setSheetMode('edit');
        setSelectedVendor(vendorToEdit);
        setIsSheetOpen(true);
    }, []);

    const handleFormSubmitSuccess = () => {
        setIsSheetOpen(false);
        setSelectedVendor(null);
    };

    const handleSheetOpenChange = (open: boolean) => {
        setIsSheetOpen(open);
        if (!open) {
            setSelectedVendor(null);
        }
    };

    // --- Table Meta ---
    const tableMeta: TableMeta = useMemo(
        () => ({
            globalFilter: globalFilter,
            onGlobalFilterChange: setGlobalFilter,
            edit: handleEdit,
        }),
        [globalFilter, handleEdit],
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <SettingsLayout>
                <Head title="Vendors" />
                <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Vendors</CardTitle>
                            <CardDescription>View, create, and manage vendors.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <Input
                                    placeholder="Filter vendors..."
                                    value={globalFilter}
                                    onChange={(event: React.ChangeEvent<HTMLInputElement>) => setGlobalFilter(event.target.value)}
                                    className="w-full sm:max-w-xs"
                                />
                                <Button variant="default" onClick={handleCreate} className="w-full shrink-0 sm:w-auto">
                                    <PlusCircle className="mr-2 h-4 w-4" /> Create
                                </Button>
                            </div>
                            <Deferred data="vendors" fallback={<SkeletonTable rowCount={10} columnCount={columns.length} />}>
                                <DataTable columns={columns} data={pageProps.vendors || initialVendors || []} meta={tableMeta} />
                            </Deferred>
                        </CardContent>
                    </Card>

                    <Sheet open={isSheetOpen} onOpenChange={handleSheetOpenChange}>
                        <SheetContent className="overflow-y-auto sm:max-w-lg">
                            {sheetMode === 'create' && (
                                <>
                                    <SheetHeader>
                                        <SheetTitle>Create New Vendor</SheetTitle>
                                        <SheetDescription>Enter the details for the new vendor.</SheetDescription>
                                    </SheetHeader>
                                    <Create onSubmitSuccess={handleFormSubmitSuccess} />
                                </>
                            )}

                            {sheetMode === 'edit' && selectedVendor && (
                                <>
                                    <SheetHeader>
                                        <SheetTitle>Edit Vendor: {selectedVendor.name}</SheetTitle>
                                        <SheetDescription>Update the vendor's details.</SheetDescription>
                                    </SheetHeader>
                                    <Edit vendor={selectedVendor} onSubmitSuccess={handleFormSubmitSuccess} />
                                </>
                            )}
                        </SheetContent>
                    </Sheet>
                </div>
            </SettingsLayout>
        </AppLayout>
    );
};

export default Vendors;
