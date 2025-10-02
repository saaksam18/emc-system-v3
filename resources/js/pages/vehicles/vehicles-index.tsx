import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'; // Added React import
import { useReactToPrint } from 'react-to-print';

// --- Inertia Imports ---
import { Deferred, Head, Link, router, usePage } from '@inertiajs/react';

// --- Layout Imports ---
import AppLayout from '@/layouts/app-layout'; // Adjust path if needed

// --- UI Component Imports (shadcn/ui) ---
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label'; // Added Label import
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { toast } from 'sonner'; // For notifications

// --- Custom Component Imports ---
import { columns, TableMeta } from '@/components/vehicles/columns'; // Adjust path
import { DataTable } from '@/components/vehicles/data-table'; // Adjust path
import { columns as stockCBCColumn } from '@/components/vehicles/stock-cbc-columns'; // Adjust path
import { DataTable as StockCBCDataTable } from '@/components/vehicles/stock-cbc-data-table'; // Adjust path
import { columns as stockCBMColumn } from '@/components/vehicles/stock-cbm-columns'; // Adjust path
// Note: Using StockCBCDataTable for CBM as well, ensure columns match or use a separate CBM DataTable if needed
// import { DataTable as StockCBMDataTable } from '@/components/vehicles/stock-cbm-data-table'; // If you have a separate one
import { Create } from '@/components/vehicles/sheets/create'; // Adjust path
import { Edit } from '@/components/vehicles/sheets/edit'; // Adjust path
import { Show } from '@/components/vehicles/sheets/show'; // Adjust path
import { columns as stockColumn } from '@/components/vehicles/stock-columns'; // Adjust path
import { DataTable as StockDataTable } from '@/components/vehicles/stock-data-table'; // Adjust path

// --- Type Imports ---
// Make sure these types are correctly defined in '@/types'
import type {
    BreadcrumbItem,
    Customers,
    User,
    Vehicle,
    VehicleClass,
    VehicleCountByClass,
    VehicleCountByModel,
    VehicleMakerType,
    VehicleModelType,
    VehicleStatusType,
} from '@/types'; // Added 'type' keyword

// --- Utility Imports ---
import { cn } from '@/lib/utils'; // For Tailwind class merging
// Import necessary date-fns functions
import DashboardChartsSection from '@/components/dashboards/dashboard-charts-section';
import { SoldOrStolen } from '@/components/vehicles/sheets/sold-or-stolen';
import { endOfDay, isValid, isWithinInterval, parse, startOfDay, startOfMonth } from 'date-fns';
import { Bike, Printer, Settings } from 'lucide-react'; // Icons
import type { DateRange } from 'react-day-picker'; // Type for date range picker, added 'type' keyword

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
    columnWidths = ['w-12', 'w-2/5', 'w-1/4', 'w-1/6', 'w-16'], // Default widths
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
        title: 'Vehicle',
        href: '/vehicles', // Ensure this route exists and is correct
    },
];

// --- Page Props Interface ---
interface PageProps {
    users: User[];
    vehicle_class: VehicleClass[];
    vehicle_models: VehicleModelType[];
    vehicle_makers: VehicleMakerType[];
    vehicle_status: VehicleStatusType[];
    vehicles?: Vehicle[];
    vehicles_stock?: Vehicle[];
    vehicles_stock_cbc?: VehicleCountByClass[];
    vehicles_stock_cbm?: VehicleCountByModel[];
    chartData?: any[]; // Define a more specific type if possible { date: string; totalMoto: number; [key: string]: any }
    vehicleClasses?: { id: number | string; name: string; color: string }[];
    customers: Customers[] | null;
    auth: { user: User };
    flash?: {
        success?: string;
        error?: string;
        errors?: Record<string, string | string[]>;
    };
    [key: string]: any;
}

// --- VehiclesIndex Component ---
const VehiclesIndex: React.FC<PageProps> = () => {
    // Use React.FC for typing
    // --- Hooks ---
    const { props: pageProps } = usePage<PageProps>();

    // State for chart data lazy loading
    const [isChartLoading, setIsChartLoading] = useState(!pageProps.chartData || !pageProps.vehicleClasses);

    // State for Date Range Picker
    const [date, setDate] = useState<DateRange | undefined>(undefined); // Default to undefined initially

    // Other UI State
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
    const [sheetMode, setSheetMode] = useState<'show' | 'create' | 'edit' | 'sold-or-stolen'>('create');
    const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
    const [globalFilter, setGlobalFilter] = useState('');

    // --- Effects ---

    // Effect for LAZY LOADING chart data
    useEffect(() => {
        const needsFetching = !pageProps.chartData || !pageProps.vehicleClasses;
        if (needsFetching) {
            setIsChartLoading(true);
            router.reload({
                only: ['chartData', 'vehicleClasses'],
                onSuccess: () => {
                    /* Handled by next effect */
                },
                onError: (errors) => {
                    console.error('Failed to load deferred chart data:', errors);
                    toast.error('Failed to load chart data.');
                    setIsChartLoading(false);
                },
            });
        } else {
            setIsChartLoading(false); // Already loaded
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Runs once on mount

    // Effect to update loading state when deferred props arrive
    useEffect(() => {
        if (pageProps.chartData && pageProps.vehicleClasses) {
            setIsChartLoading(false);
        }
    }, [pageProps.chartData, pageProps.vehicleClasses]);

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

    // --- Filtering Logic (Frontend) ---

    const filteredChartData = useMemo(() => {
        if (!pageProps.chartData || !date?.from || !date?.to) {
            return pageProps.chartData || [];
        }

        const rangeStart = startOfDay(date.from);
        const rangeEnd = endOfDay(date.to);

        return pageProps.chartData.filter((item) => {
            if (!item?.date) return false;
            const baseDate = new Date();
            const cleanedDateStr = String(item.date).replace("'", '');
            const parsedMonthDate = parse(cleanedDateStr, 'MMM yy', baseDate);

            if (!isValid(parsedMonthDate)) {
                console.warn(`Invalid date format encountered: ${item.date}`);
                return false;
            }
            const monthStart = startOfMonth(parsedMonthDate);
            return isWithinInterval(monthStart, { start: rangeStart, end: rangeEnd });
        });
    }, [pageProps.chartData, date]);

    // --- Handlers for Sheet Actions ---
    const handleCreateClick = () => {
        setSheetMode('create');
        setSelectedVehicle(null);
        setEditingVehicle(null);
        setIsSheetOpen(true);
    };

    const handleShowDetails = useCallback((vehicle: Vehicle) => {
        setSheetMode('show');
        setSelectedVehicle(vehicle);
        setEditingVehicle(null);
        setIsSheetOpen(true);
    }, []);

    const handleEditVehicle = useCallback((vehicleToEdit: Vehicle) => {
        setSheetMode('edit');
        setSelectedVehicle(null);
        setEditingVehicle(vehicleToEdit);
        setIsSheetOpen(true);
    }, []);

    const handleSoldOrStolen = useCallback((vehicleToEdit: Vehicle) => {
        setSheetMode('sold-or-stolen');
        setSelectedVehicle(vehicleToEdit);
        setEditingVehicle(vehicleToEdit);
        setIsSheetOpen(true);
    }, []);

    const handleFormSubmitSuccess = () => {
        setIsSheetOpen(false);
        // Reload necessary data, adjust 'only' array as needed
        router.reload({ only: ['vehicles', 'vehicles_stock', 'vehicles_stock_cbc', 'vehicles_stock_cbm', 'chartData'] });
    };

    // --- Table Meta ---
    const tableMeta: TableMeta = useMemo(
        () => ({
            // Memoize meta object
            globalFilter: globalFilter,
            onGlobalFilterChange: setGlobalFilter,
            showDetails: handleShowDetails,
            editVehicle: handleEditVehicle,
            soldOrStolen: handleSoldOrStolen,
        }),
        [globalFilter, handleShowDetails, handleEditVehicle],
    ); // Dependencies

    // Print

    const contentRef = useRef<HTMLDivElement>(null);
    const reactToPrintFn = useReactToPrint({ contentRef });

    // --- Render ---
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Vehicle Management" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Top Section: Chart Card */}
                <DashboardChartsSection />

                {/* Bottom Section: Data Table Card */}
                <Card>
                    <CardHeader>
                        <CardTitle>Vehicles Management</CardTitle>
                        <CardDescription>View, create, edit, and manage vehicle records.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {/* Sheet Trigger and Filter/Actions moved outside Sheet */}
                        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Filter vehicles (by any field)..."
                                    value={globalFilter}
                                    onChange={(event: React.ChangeEvent<HTMLInputElement>) => setGlobalFilter(event.target.value)}
                                    className="w-full sm:max-w-xs"
                                />
                                <Button variant="outline" onClick={() => reactToPrintFn()} className="w-full shrink-0 sm:w-auto">
                                    {/* Added shrink-0 */}
                                    <Printer className="mr-2 h-4 w-4" /> Print Stock
                                </Button>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="default" onClick={handleCreateClick} className="w-full shrink-0 sm:w-auto">
                                    {/* Added shrink-0 */}
                                    <Bike className="mr-2 h-4 w-4" /> Create Vehicle
                                </Button>
                                {/* FIX: Wrap Button inside Link, remove asChild from Button */}
                                <Link href={'/settings/vehicles'}>
                                    <Button variant="outline" className="flex w-full shrink-0 items-center gap-2 sm:w-auto">
                                        <Settings className="mr-2 h-4 w-4" /> Setting
                                    </Button>
                                </Link>
                            </div>
                        </div>

                        {/* Main Vehicle Data Table */}
                        <Deferred data="vehicles" fallback={<SkeletonTable rowCount={5} columnCount={columns.length} />}>
                            <DataTable columns={columns} data={pageProps.vehicles || []} meta={tableMeta} />
                        </Deferred>

                        {/* Sheet Definition */}
                        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                            <SheetContent className="overflow-y-auto sm:max-w-lg">
                                {sheetMode === 'show' && selectedVehicle && (
                                    <>
                                        <SheetHeader>
                                            <SheetTitle>Vehicle No. {selectedVehicle?.vehicle_no || 'N/A'} Details:</SheetTitle>
                                            <SheetDescription>
                                                Viewing details for vehicle no: {selectedVehicle?.vehicle_no || 'N/A'}
                                            </SheetDescription>
                                        </SheetHeader>
                                        <Show selectedVehicle={selectedVehicle} />
                                        <SheetFooter>
                                            <SheetClose asChild>
                                                <Button type="button" variant="outline">
                                                    Close
                                                </Button>
                                            </SheetClose>
                                        </SheetFooter>
                                    </>
                                )}
                                {sheetMode === 'create' && (
                                    <>
                                        <SheetHeader>
                                            {/* UPDATED: More accurate title */}
                                            <SheetTitle>Create New Vehicle</SheetTitle>
                                            <SheetDescription>Enter the details for the new vehicle.</SheetDescription>
                                        </SheetHeader>
                                        <Create
                                            // Use latest props from usePage if available
                                            vehicle_class={pageProps.vehicle_class || []}
                                            vehicle_status={pageProps.vehicle_status || []}
                                            vehicle_models={pageProps.vehicle_models || []}
                                            vehicle_makers={pageProps.vehicle_makers || []}
                                            onSubmitSuccess={handleFormSubmitSuccess}
                                        />
                                    </>
                                )}
                                {sheetMode === 'edit' && editingVehicle && (
                                    <>
                                        <SheetHeader>
                                            {/* UPDATED: More accurate title */}
                                            <SheetTitle>Edit Vehicle: {editingVehicle.vehicle_no}</SheetTitle>
                                            <SheetDescription>Update the vehicle's details.</SheetDescription>
                                        </SheetHeader>
                                        <Edit
                                            // Pass editingVehicle which holds the data
                                            vehicle={editingVehicle}
                                            onUpdateSuccess={handleFormSubmitSuccess}
                                            // Use latest props from usePage if available
                                            vehicle_class={pageProps.vehicle_class || []}
                                            vehicle_status={pageProps.vehicle_status || []}
                                            vehicle_models={pageProps.vehicle_models || []}
                                            vehicle_makers={pageProps.vehicle_makers || []}
                                        />
                                    </>
                                )}
                                {sheetMode === 'sold-or-stolen' && editingVehicle && (
                                    <>
                                        <SheetHeader>
                                            {/* UPDATED: More accurate title */}
                                            <SheetTitle>Edit Vehicle: {editingVehicle.vehicle_no}</SheetTitle>
                                            <SheetDescription>Update the vehicle's details.</SheetDescription>
                                        </SheetHeader>
                                        <SoldOrStolen
                                            vehicle={selectedVehicle}
                                            vehicle_status={pageProps.vehicle_status || []}
                                            customers={pageProps.customers}
                                            users={pageProps.users}
                                            onSubmitSuccess={handleFormSubmitSuccess}
                                        />
                                    </>
                                )}
                            </SheetContent>
                        </Sheet>
                    </CardContent>
                </Card>

                {/* Hidden Section for Printing */}
                <div className="mt-4 hidden">
                    {/* Use the ref here */}
                    <div ref={contentRef}>
                        {/* Wrap content in Card for consistent styling (optional) */}
                        <CardHeader>
                            <CardTitle>Stock Check List</CardTitle>
                            <CardDescription>Check the checkbox and make sure the vehicles location.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid md:grid-cols-3">
                                <div className="col-span-2">
                                    {/* Removed border/overflow styles */}
                                    <Label className="mb-2 block">Vehicle Stock List</Label> {/* Added label */}
                                    <Deferred
                                        data="vehicles_stock"
                                        fallback={<SkeletonTable rowCount={10} columnCount={stockColumn.length} minWidth="450px" />}
                                    >
                                        <StockDataTable columns={stockColumn} data={pageProps.vehicles_stock || []} />
                                    </Deferred>
                                </div>
                                <div>
                                    <div>
                                        <Label className="mb-2 block">Count by Classes</Label>
                                        {/* Removed border/overflow styles */}
                                        <Deferred
                                            data="vehicles_stock_cbc"
                                            fallback={<SkeletonTable rowCount={3} columnCount={stockCBCColumn.length} minWidth="200px" />}
                                        >
                                            <StockCBCDataTable columns={stockCBCColumn} data={pageProps.vehicles_stock_cbc || []} />
                                        </Deferred>
                                    </div>
                                    <div>
                                        <Label className="mb-2 block">Count by Models</Label>
                                        {/* Removed border/overflow styles */}
                                        <Deferred
                                            data="vehicles_stock_cbm"
                                            fallback={<SkeletonTable rowCount={5} columnCount={stockCBMColumn.length} minWidth="200px" />}
                                        >
                                            {/* Assuming StockCBCDataTable can handle CBM columns, otherwise use StockCBMDataTable */}
                                            <StockCBCDataTable columns={stockCBMColumn} data={pageProps.vehicles_stock_cbm || []} />
                                        </Deferred>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
};

// Export the component
export default VehiclesIndex; // Assuming this is how you export
