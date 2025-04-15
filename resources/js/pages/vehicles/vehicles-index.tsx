import { useEffect, useMemo, useRef, useState } from 'react'; // Import useMemo
import { useReactToPrint } from 'react-to-print';

// --- Inertia Imports ---
import { Deferred, Head, router, usePage } from '@inertiajs/react';

// --- Layout Imports ---
import AppLayout from '@/layouts/app-layout'; // Adjust path if needed

// --- UI Component Imports (shadcn/ui) ---
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Sheet, SheetTrigger } from '@/components/ui/sheet';
import { toast } from 'sonner'; // For notifications

// --- Custom Component Imports ---
import { columns } from '@/components/vehicles/columns'; // Adjust path
import { DataTable } from '@/components/vehicles/data-table'; // Adjust path
import { SheetForm } from '@/components/vehicles/sheet-form'; // Adjust path
import { columns as stockCBCColumn } from '@/components/vehicles/stock-cbc-columns';
import { DataTable as StockCBCDataTable } from '@/components/vehicles/stock-cbc-data-table';
import { columns as stockCBMColumn } from '@/components/vehicles/stock-cbm-columns';
import { VehicleStockChart } from '@/components/vehicles/stock-chart'; // Adjust path
import { columns as stockColumn } from '@/components/vehicles/stock-columns';
import { DataTable as StockDataTable } from '@/components/vehicles/stock-data-table'; // Adjust path

// --- Type Imports ---
// Make sure these types are correctly defined in '@/types'
import {
    type BreadcrumbItem,
    User,
    Vehicle,
    VehicleClass,
    VehicleCountByClass,
    VehicleCountByModel,
    VehicleMakerType,
    VehicleModelType,
    VehicleStatusType,
} from '@/types';

// --- Utility Imports ---
import { cn } from '@/lib/utils'; // For Tailwind class merging
// Import necessary date-fns functions
import { Label } from '@/components/ui/label';
import { endOfDay, format, isValid, isWithinInterval, parse, startOfDay, startOfMonth } from 'date-fns';
import { Bike, CalendarIcon, Printer } from 'lucide-react'; // Icons
import { DateRange } from 'react-day-picker'; // Type for date range picker

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
    auth: { user: User };
    flash?: {
        success?: string;
        error?: string;
        errors?: Record<string, string | string[]>;
    };
    [key: string]: any;
}

export default function VehiclesIndex() {
    // --- Hooks ---
    const { props: pageProps } = usePage<PageProps>();

    // State for chart data lazy loading
    const [isChartLoading, setIsChartLoading] = useState(!pageProps.chartData || !pageProps.vehicleClasses);

    // State for Date Range Picker
    const [date, setDate] = useState<DateRange | undefined>(undefined); // Default to undefined initially

    // Other UI State
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [sheetMode, setSheetMode] = useState<'create' | 'edit'>('create');
    const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
    const [globalFilter, setGlobalFilter] = useState('');

    // --- Effects ---

    // Effect for LAZY LOADING chart data (keep this)
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
            setIsChartLoading(false);
        }
    }, []); // Runs once on mount

    // Effect to update loading state when deferred props arrive
    useEffect(() => {
        if (pageProps.chartData && pageProps.vehicleClasses) {
            setIsChartLoading(false);
        }
    }, [pageProps.chartData, pageProps.vehicleClasses]);

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

    // --- Filtering Logic (Frontend) ---

    const filteredChartData = useMemo(() => {
        // Return empty array if data isn't loaded yet or if no date range is selected
        if (!pageProps.chartData || !date?.from || !date?.to) {
            return pageProps.chartData || []; // Return original data or empty array if no range selected
        }

        const rangeStart = startOfDay(date.from);
        const rangeEnd = endOfDay(date.to);

        return pageProps.chartData.filter((item) => {
            if (!item?.date) return false; // Skip items without a date

            // Parse the date string (e.g., 'Jan '24')
            // Need a base date for parse to infer century correctly
            const baseDate = new Date();
            // Clean the string ('Jan 24') and parse ('MMM yy')
            const cleanedDateStr = String(item.date).replace("'", '');
            const parsedMonthDate = parse(cleanedDateStr, 'MMM yy', baseDate);

            if (!isValid(parsedMonthDate)) {
                console.warn(`Invalid date format encountered: ${item.date}`);
                return false; // Skip invalid dates
            }

            // Check if the month of the data point falls within the selected range
            const monthStart = startOfMonth(parsedMonthDate);
            // Check if the first day of the item's month is within the selected interval
            return isWithinInterval(monthStart, { start: rangeStart, end: rangeEnd });
        });
    }, [pageProps.chartData, date]); // Re-run memo only if data or date range changes

    const handleCreateClick = () => {
        setSheetMode('create');
        setEditingVehicle(null);
        setIsSheetOpen(true);
    };

    const handleEditVehicle = (vehicleToEdit: Vehicle) => {
        setSheetMode('edit');
        setEditingVehicle(vehicleToEdit);
        setIsSheetOpen(true);
    };

    const handleFormSubmitSuccess = () => {
        setIsSheetOpen(false);
        router.reload({ only: ['vehicles'] });
    };

    const contentRef = useRef<HTMLDivElement>(null);
    const reactToPrintFn = useReactToPrint({ contentRef });

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Vehicle Dashboard" />

            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Top Section: Chart Card */}
                <Card>
                    <CardHeader>
                        <CardTitle>Vehicles Stock Over Time</CardTitle>
                        <CardDescription>Showing historical rental data. Use the date picker to filter the chart.</CardDescription>
                        {/* Controls for Chart - Date Range Picker */}
                        <div className="flex w-full flex-col flex-wrap items-center gap-2 pt-4 sm:w-auto sm:flex-row">
                            {/* Date Range Picker - UNCOMMENTED */}
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        id="date"
                                        variant={'outline'}
                                        className={cn('w-full justify-start text-left font-normal sm:w-[260px]', !date && 'text-muted-foreground')}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {date?.from ? (
                                            date.to ? (
                                                <>
                                                    {format(date.from, 'LLL dd, y')} - {format(date.to, 'LLL dd, y')}
                                                </>
                                            ) : (
                                                format(date.from, 'LLL dd, y')
                                            )
                                        ) : (
                                            <span>Pick a date range</span>
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="end">
                                    <Calendar
                                        initialFocus
                                        mode="range"
                                        defaultMonth={date?.from}
                                        selected={date}
                                        onSelect={setDate}
                                        numberOfMonths={2}
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[250px]">
                            {isChartLoading ? (
                                <div className="flex h-full items-center justify-center">
                                    <p className="text-muted-foreground">Loading Chart Data...</p>
                                </div>
                            ) : (
                                // Render chart with FILTERED data
                                <VehicleStockChart
                                    chartData={filteredChartData} // Use the filtered data
                                    vehicleClasses={pageProps.vehicleClasses || []}
                                />
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Bottom Section: Data Table Card */}

                <Card>
                    <CardHeader>
                        <CardTitle>Vehicles Management</CardTitle>
                        <CardDescription>View, create, edit, and manage vehicle records.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Filter vehicles (by any field)..."
                                        value={globalFilter}
                                        onChange={(event) => setGlobalFilter(event.target.value)}
                                        className="w-full sm:max-w-xs"
                                    />

                                    <Button variant="outline" onClick={() => reactToPrintFn()} className="w-full sm:w-auto">
                                        <Printer className="mr-2 h-4 w-4" /> Print Stock
                                    </Button>
                                </div>
                                <SheetTrigger asChild>
                                    <Button variant="default" onClick={handleCreateClick} className="w-full sm:w-auto">
                                        <Bike className="mr-2 h-4 w-4" /> Create Vehicle
                                    </Button>
                                </SheetTrigger>
                            </div>
                            <SheetForm
                                key={sheetMode === 'edit' ? editingVehicle?.id : 'create'}
                                mode={sheetMode}
                                initialData={editingVehicle}
                                onSubmitSuccess={handleFormSubmitSuccess}
                                vehicle_class={pageProps.vehicle_class || []}
                                vehicle_status={pageProps.vehicle_status || []}
                                vehicle_models={pageProps.vehicle_models || []}
                                vehicle_makers={pageProps.vehicle_makers || []}
                            />
                        </Sheet>

                        <Deferred data="vehicles" fallback={<div className="p-4 text-center">Loading vehicles data...</div>}>
                            <DataTable
                                columns={columns}
                                data={pageProps.vehicles || []}
                                // Pass the edit handler function and roles via meta
                                // Ensure your DataTable component forwards meta to useReactTable
                                meta={{
                                    editVehicle: handleEditVehicle,
                                    globalFilter: globalFilter,
                                }}
                            />
                        </Deferred>
                    </CardContent>
                </Card>
                <div className="hidden">
                    <Card ref={contentRef}>
                        <CardHeader>
                            <CardTitle> Stock Check List</CardTitle>
                            <CardDescription>Check the checkbox and make sure the vehicles location.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-4 md:grid-cols-3">
                                <div className="border-sidebar-border/70 dark:border-sidebar-border relative col-span-2 overflow-hidden rounded-xl border">
                                    <Deferred data="vehicles_stock" fallback={<div className="p-4 text-center">Loading vehicles data...</div>}>
                                        <StockDataTable columns={stockColumn} data={pageProps.vehicles_stock || []} />
                                    </Deferred>
                                </div>
                                <div className="border-sidebar-border/70 dark:border-sidebar-border relative overflow-hidden rounded-xl border p-4">
                                    <Label>Count by Classes</Label>
                                    <ul className="list-disc space-y-1 pl-5">
                                        <Deferred
                                            data="vehicles_stock_cbc"
                                            fallback={<div className="p-4 text-center">Loading vehicles data...</div>}
                                        >
                                            <StockCBCDataTable columns={stockCBCColumn} data={pageProps.vehicles_stock_cbc || []} />
                                        </Deferred>
                                    </ul>
                                    <Label>Count by Models</Label>
                                    <Deferred data="vehicles_stock_cbm" fallback={<div className="p-4 text-center">Loading vehicles data...</div>}>
                                        <StockCBCDataTable columns={stockCBMColumn} data={pageProps.vehicles_stock_cbm || []} />
                                    </Deferred>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
