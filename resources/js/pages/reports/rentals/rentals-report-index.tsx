import React, { useMemo, useState } from 'react';

// --- Inertia Imports ---
import { Deferred, Head, usePage } from '@inertiajs/react';

// --- Layout Imports ---
import AppLayout from '@/layouts/app-layout';

// --- UI Component Imports (shadcn/ui) ---
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// --- Type Imports ---
import { columns, TableMeta } from '@/components/reports/rental-transactions/columns';
import { DataTable } from '@/components/reports/rental-transactions/data-table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { BreadcrumbItem, User } from '@/types';

// --- Utility Imports ---
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
    columnWidths = ['w-12', 'w-2/5', 'w-1/4', 'w-1/6', 'w-16'], // Default widths, adjust as needed for customers table
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
        title: 'Reports',
        href: '/reports', // Ensure this route exists and is correct
    },
];

// Define the TypeScript interfaces for the data structure
interface StatusBreakdown {
    statusName: string;
    count: number;
    percentageInClass: number; // Percentage within its class
}

interface VehicleClassData {
    totalVehiclesInClass: number;
    classPercentageOfTotal: number;
    statusBreakdown: StatusBreakdown[];
}

interface OverallStatusPercentage {
    statusName: string;
    count: number;
    percentageOfTotal: number; // Percentage of all vehicles
}

// --- Page Props Interface ---
interface PageProps {
    auth: { user: User };
    transactionCounts?: { [key: string]: number }; // Made optional
    // Updated to match the combined structure from the controller
    vehicleReportData?: {
        // Made optional
        classBreakdown?: { [key: string]: VehicleClassData }; // Made optional
        overallStatusPercentages?: OverallStatusPercentage[]; // Made optional
    };
    grandTotalVehicles?: number; // Made optional
    flash?: {
        success?: string;
        error?: string;
        errors?: Record<string, string | string[]>;
    };
    rentals?: any[]; // Added rentals as optional
    [key: string]: any;
}

// --- VehiclesIndex Component ---
const RentalsReportIndex: React.FC<PageProps> = ({ rentals: initialRentals, transactionCounts, vehicleReportData, grandTotalVehicles }) => {
    const { props: pageProps } = usePage<PageProps>();
    // Ensure classBreakdown and overallStatusPercentages are always objects/arrays
    const { classBreakdown = {}, overallStatusPercentages = [] } = vehicleReportData ?? {};

    const [globalFilter, setGlobalFilter] = useState('');

    const tableMeta: TableMeta = useMemo(
        () => ({
            globalFilter: globalFilter,
            onGlobalFilterChange: setGlobalFilter,
        }),
        // Dependencies remain the same
        [globalFilter],
    );

    // --- Render ---
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Vehicle Dashboard" />

            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="grid auto-rows-min gap-4 md:grid-cols-5">
                    {/* Card for Rental Transactions (Existing) */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Rental Transactions</CardTitle>
                            <CardDescription>Overview of scooter rental transaction of each days.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Separator />
                            <Deferred data="transactionCounts" fallback={<div>No transaction counts available.</div>}>
                                <>
                                    {/* Use nullish coalescing to ensure transactionCounts is an object */}
                                    {Object.keys(transactionCounts ?? {}).length > 0 ? (
                                        Object.entries(transactionCounts ?? {}).map(([statusName, count]) => (
                                            <div key={statusName} className="mt-4 flex h-5 items-center justify-between space-x-4 text-sm">
                                                <div>{statusName}</div>
                                                <Separator orientation="vertical" />
                                                <Badge variant="secondary">{count}</Badge>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="mt-4 flex h-5 items-center justify-between space-x-4 text-sm">
                                            <p>No transaction counts available.</p>
                                        </div>
                                    )}
                                </>
                            </Deferred>
                        </CardContent>
                    </Card>

                    {/* Card for Rental Percentages (Vehicle Classes) - Adjusted to use classBreakdown */}
                    <Card className="col-span-1 md:col-span-1 lg:col-span-3">
                        {/* Adjusted col-span to fit new card */}
                        <CardHeader>
                            <CardTitle>Vehicle Class Breakdown</CardTitle>
                            <CardDescription>Overview of each vehicle class with status breakdown.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Deferred data="vehicleReportData" fallback={<div>Loading vehicle class data...</div>}>
                                <>
                                    {/* Use nullish coalescing to ensure classBreakdown is an object */}
                                    {Object.keys(classBreakdown ?? {}).length === 0 ? (
                                        <div className="mt-4 flex h-5 items-center justify-between space-x-4 text-sm">
                                            <p>No vehicle class data available.</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-4 gap-4">
                                            {/* Removed md:grid-cols-2 lg:grid-cols-4 to make it a single column within this card */}
                                            {/* Iterate over each vehicle class */}
                                            {Object.entries(classBreakdown ?? {}).map(([className, classData]) => {
                                                return (
                                                    <Card key={className}>
                                                        <CardHeader>
                                                            {/* Reduced padding */}
                                                            <CardTitle>{className}</CardTitle> {/* Smaller title */}
                                                            <CardDescription>
                                                                {/* Smaller description */}
                                                                <span className="font-medium">Total:</span> {classData.totalVehiclesInClass} (
                                                                {classData.classPercentageOfTotal}%)
                                                            </CardDescription>
                                                        </CardHeader>
                                                        <CardContent>
                                                            {/* Reduced padding */}
                                                            {/* Display status breakdown for the current class */}
                                                            {classData.statusBreakdown.length > 0 ? (
                                                                <div className="border-t pt-2">
                                                                    <ul className="list-inside list-disc space-y-1">
                                                                        {classData.statusBreakdown.map((status, index) => (
                                                                            <li key={index} className="text-xs">
                                                                                {' '}
                                                                                {/* Smaller text */}
                                                                                {status.statusName}: {status.count}{' '}
                                                                                <Badge variant="secondary" className="text-xs">
                                                                                    {status.percentageInClass}%
                                                                                </Badge>{' '}
                                                                                {/* Smaller badge text */}
                                                                            </li>
                                                                        ))}
                                                                    </ul>
                                                                </div>
                                                            ) : (
                                                                <p className="mt-2 text-xs text-gray-500">No status breakdown.</p>
                                                            )}
                                                        </CardContent>
                                                    </Card>
                                                );
                                            })}
                                        </div>
                                    )}
                                </>
                            </Deferred>
                        </CardContent>
                    </Card>

                    {/* Card for Overall Vehicle Summary (New) */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Overall Vehicle Summary</CardTitle>
                            <CardDescription>Total vehicles and their overall status distribution.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Separator />
                            <div className="mt-4">
                                <h4 className="mb-2 text-sm font-semibold">Overall Status Percentages:</h4>
                                {/* Use nullish coalescing for overallStatusPercentages */}
                                {overallStatusPercentages.length === 0 ? (
                                    <p className="text-sm">No overall status data available.</p>
                                ) : (
                                    <ul className="list-inside list-disc space-y-1">
                                        {overallStatusPercentages
                                            .filter((status) => status.count > 0) // Filter out statuses with count 0
                                            .map((status, index) => (
                                                <li key={index} className="text-sm">
                                                    <span className="font-medium">{status.statusName}:</span> {status.count}{' '}
                                                    <Badge variant="outline">{status.percentageOfTotal}%</Badge>
                                                </li>
                                            ))}
                                    </ul>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Bottom Section: Data Table Card */}
                <Card>
                    <CardHeader>
                        <CardTitle>Rental Transactions Table</CardTitle>
                        <CardDescription>Overview of scooter rental transaction of each days in table.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {/* Customer Data Table with Skeleton Fallback */}
                        <Deferred data="rentals" fallback={<SkeletonTable rowCount={10} columnCount={columns.length} />}>
                            <DataTable
                                columns={columns}
                                // Use latest data from usePage if available, else initial props
                                data={pageProps.rentals || initialRentals || []}
                                meta={tableMeta}
                            />
                        </Deferred>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
};

// Export the component
export default RentalsReportIndex;
