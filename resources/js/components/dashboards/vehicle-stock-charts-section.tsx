import React from 'react';
import VehicleStockChart from '../charts/vehicle-stock-chart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { ChartConfig } from '../ui/chart';

// Import your Zustand store
import { vehicleStockChartStore } from '@/Stores/vehicleStockChartStore';

interface VehicleStockChartsSectionProps {
    flash?: {
        success?: string;
        error?: string;
        errors?: Record<string, string | string[]>;
    };
    [key: string]: any;
}

export default function VehicleStockChartsSection({}: VehicleStockChartsSectionProps) {
    const {
        fetchedChartData,
        // vehicleClassIdToKeyName, // You might not need to select this if VehicleStockChart doesn't directly use it
        activeClassKey,
        loading,
        error,
        fetchChartData,
        // setActiveClassKey, // Not used directly here for display, but could be for interaction
        grandTotalAvailableVehicles, // <--- SELECT THIS FROM THE STORE
    } = vehicleStockChartStore();

    const baseChartConfig = {
        total: {
            label: 'Total Vehicles',
            color: 'var(--chart-total)',
        },
        available: {
            label: 'Available',
            color: 'var(--chart-available)',
        },
        unavailable: {
            label: 'Unavailable',
            color: 'var(--chart-unavailable)',
        },
    } satisfies ChartConfig;

    const dynamicChartConfig = React.useMemo(() => {
        const config: ChartConfig = { ...baseChartConfig };
        // Any dynamic config logic here based on fetchedChartData
        return config;
    }, [fetchedChartData]);

    React.useEffect(() => {
        fetchChartData();
    }, [fetchChartData]);

    const activeIndex = React.useMemo(() => {
        if (!activeClassKey || fetchedChartData.length === 0) return -1;
        return fetchedChartData.findIndex((item) => item.vehicle_class_key === activeClassKey);
    }, [activeClassKey, fetchedChartData]);

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Vehicle Stock</CardTitle>
                    <CardDescription>Current vehicle in stock. Includes under repair, reserved, etc.</CardDescription>
                    <CardContent>
                        <div className="flex h-24 items-center justify-center text-gray-500">
                            <svg
                                className="mr-3 h-5 w-5 animate-spin text-blue-500"
                                xmlns="http://www.w3.org/2020/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                            >
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                ></path>
                            </svg>
                            Loading chart data...
                        </div>
                    </CardContent>
                </CardHeader>
            </Card>
        );
    }

    if (error) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Vehicle Stock</CardTitle>
                    <CardDescription>Current vehicle in stock. Includes under repair, reserved, etc.</CardDescription>
                </CardHeader>

                <CardContent>
                    <CardTitle>Error loading data: {error.message}</CardTitle>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Vehicle Stock</CardTitle>
                <CardDescription>Current vehicle in stock. Includes under repair, reserved, etc.</CardDescription>
            </CardHeader>

            {fetchedChartData.length > 0 ? (
                <VehicleStockChart
                    data={fetchedChartData}
                    chartConfig={dynamicChartConfig}
                    activeMonth={activeClassKey}
                    activeIndex={activeIndex}
                    grandTotalAvailable={grandTotalAvailableVehicles} // <--- PASS IT AS A PROP
                />
            ) : (
                <p className="p-6 text-center text-gray-500">No vehicle stock data available.</p>
            )}
        </Card>
    );
}
