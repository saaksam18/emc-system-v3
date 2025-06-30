import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { endOfDay, format, getISOWeek, getYear, isWithinInterval, startOfDay, subMonths } from 'date-fns';
import { CalendarIcon, FileText, Image as ImageIcon } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { DateRange } from 'react-day-picker';
import RentalChart from '../charts/rental-chart';

// Import your new Zustand store
import { useChartStore } from '@/Stores/chartStore'; // Adjust the path as needed

// Define the types for the props this component receives
// vehicleClasses might now come directly from the store, but you can keep it as a prop
// if you want to allow overriding or initial values from Laravel.
// For true global state, it should come *only* from the store after the first fetch.
interface DashboardChartsSectionProps {
    // If you pass initialVehicleClasses from Laravel *and* want the store to eventually manage it,
    // you might need a brief synchronization or just rely purely on the store.
    // For simplicity, let's assume vehicleClasses comes from the store now.
}

export default function DashboardChartsSection({} /* no props needed if everything comes from store */ : DashboardChartsSectionProps) {
    // Use the store hook to access state and actions
    const { allHistoricalChartData, vehicleClasses, isLoading, error, fetchChartData } = useChartStore();

    const [date, setDate] = useState<DateRange | undefined>(() => ({
        from: subMonths(new Date(), 35),
        to: new Date(),
    }));
    const [filteredChartData, setFilteredChartData] = useState<any[]>([]);
    const [granularity, setGranularity] = useState('week');

    const chartRef = useRef(null);

    // Call the fetch action from the store when the component mounts
    useEffect(() => {
        // This will only fetch if data is not already present or not fresh (based on store logic)
        fetchChartData();
    }, [fetchChartData]); // fetchChartData from zustand store is stable

    // The filtering logic remains largely the same, but now uses data from the store
    useEffect(() => {
        if (!allHistoricalChartData || allHistoricalChartData.length === 0) {
            setFilteredChartData([]);
            return;
        }

        const fromDate = date?.from ? startOfDay(date.from) : null;
        const toDate = date?.to ? endOfDay(date.to) : null;

        let processedData: any[] = [];

        const dataWithinRange = allHistoricalChartData.filter((item) => {
            const itemDate = startOfDay(new Date(item.date_key));
            return fromDate && toDate ? isWithinInterval(itemDate, { start: fromDate, end: toDate }) : true;
        });

        if (granularity === 'day') {
            processedData = dataWithinRange;
        } else {
            const groupedData: { [key: string]: any } = {};

            dataWithinRange.forEach((item) => {
                let key: string;
                let label: string;
                let itemDate = new Date(item.date_key);

                if (granularity === 'year') {
                    key = format(itemDate, 'yyyy');
                    label = format(itemDate, 'yyyy');
                } else if (granularity === 'month') {
                    key = format(itemDate, 'yyyy-MM');
                    label = format(itemDate, 'MMM yy');
                } else if (granularity === 'week') {
                    key = `${getYear(itemDate)}-W${getISOWeek(itemDate)}`;
                    label = `Week ${getISOWeek(itemDate)}, ${getYear(itemDate)}`;
                } else {
                    key = format(itemDate, 'yyyy-MM-dd');
                    label = format(itemDate, 'MMM dd, yy');
                }

                if (!groupedData[key]) {
                    groupedData[key] = {
                        label: label,
                        totalFleet: 0,
                        totalRented: 0,
                        totalStock: 0,
                        _lastDateInPeriod: null,
                    };
                    vehicleClasses?.forEach((vc) => {
                        // Use vehicleClasses from store
                        groupedData[key][vc.key_name] = 0;
                    });
                }

                groupedData[key].totalRented += item.totalRented;
                vehicleClasses?.forEach((vc) => {
                    // Use vehicleClasses from store
                    groupedData[key][vc.key_name] += item[vc.key_name] || 0;
                });

                if (groupedData[key]._lastDateInPeriod === null || itemDate > groupedData[key]._lastDateInPeriod) {
                    groupedData[key].totalFleet = item.totalFleet;
                    groupedData[key].totalStock = item.totalStock;
                    groupedData[key]._lastDateInPeriod = itemDate;
                }
            });

            processedData = Object.values(groupedData).sort((a: any, b: any) => {
                if (granularity === 'year') {
                    return parseInt(a.label) - parseInt(b.label);
                }
                const dateA = a._lastDateInPeriod || new Date(a.label);
                const dateB = b._lastDateInPeriod || new Date(b.label);
                return dateA.getTime() - dateB.getTime();
            });

            processedData.forEach((item) => delete item._lastDateInPeriod);
        }

        setFilteredChartData(processedData);
    }, [allHistoricalChartData, date, granularity, vehicleClasses]); // Dependencies now include vehicleClasses from store

    const handleDownloadChart = useCallback((format: 'png' | 'jpeg') => {
        if (chartRef.current) {
            const chartInstance = chartRef.current as any;
            if (chartInstance.canvas) {
                const link = document.createElement('a');
                link.download = `vehicle-stock-chart.${format}`;
                link.href = chartInstance.canvas.toDataURL(`image/${format === 'jpeg' ? 'jpeg' : 'png'}`);
                link.click();
            } else {
                console.error('Chart canvas not available for download.');
                alert('Chart is not ready for download yet.');
            }
        }
    }, []);

    const handleDownloadCsv = useCallback(() => {
        if (!filteredChartData || filteredChartData.length === 0 || !vehicleClasses || vehicleClasses.length === 0) {
            alert('No data to export.');
            return;
        }

        const headers = ['Date', 'TOTAL FLEET', 'TOTAL RENTED', 'TOTAL STOCK', ...vehicleClasses.map((vc) => vc.name)];
        const rows = filteredChartData.map((item) => {
            const dateValue = item.label;
            const rowData = [`"${String(dateValue).replace(/"/g, '""')}"`, item.totalFleet || 0, item.totalRented || 0, item.totalStock || 0];
            vehicleClasses.forEach((vc) => {
                const classNameKey = vc.key_name;
                rowData.push(item[classNameKey] || 0);
            });
            return rowData.join(',');
        });

        const csvContent = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'vehicle_stock_data.csv';
        link.click();
        URL.revokeObjectURL(link.href);
    }, [filteredChartData, vehicleClasses]); // Use vehicleClasses from store

    return (
        <div>
            <Card className="shadow-md">
                <CardHeader>
                    <CardTitle>Vehicles Stock Over Time</CardTitle>
                    <CardDescription>
                        Showing historical rental data. Use the date picker and granularity options to filter the chart.
                    </CardDescription>
                    <div className="flex w-full flex-col flex-wrap items-start gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
                        {/* Date Range Picker */}
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
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar mode="range" defaultMonth={date?.from} selected={date} onSelect={setDate} numberOfMonths={2} />
                            </PopoverContent>
                        </Popover>

                        {/* Granularity Selector */}
                        <div className="flex items-center gap-2">
                            <Label htmlFor="granularity">Granularity:</Label>
                            <Select onValueChange={setGranularity} defaultValue={granularity}>
                                <SelectTrigger id="granularity" className="w-[120px]">
                                    <SelectValue placeholder="Select" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="day">Day</SelectItem>
                                    <SelectItem value="week">Week</SelectItem>
                                    <SelectItem value="month">Month</SelectItem>
                                    <SelectItem value="year">Year</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Export Buttons */}
                        <div className="flex flex-wrap gap-2 sm:ml-auto">
                            <Button variant="outline" size="sm" onClick={() => handleDownloadChart('png')}>
                                <ImageIcon className="mr-2 h-4 w-4" /> PNG
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleDownloadChart('jpeg')}>
                                <ImageIcon className="mr-2 h-4 w-4" /> JPEG
                            </Button>
                            <Button variant="outline" size="sm" onClick={handleDownloadCsv}>
                                <FileText className="mr-2 h-4 w-4" /> CSV
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="h-[250px]">
                        {isLoading ? ( // Use isLoading from the store
                            <div className="flex h-full items-center justify-center text-gray-500">
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
                        ) : error ? ( // Use error from the store
                            <div className="flex h-full flex-col items-center justify-center text-center text-red-500">
                                <p>Error: {error}</p>
                                <Button onClick={fetchChartData} className="mt-4">
                                    {/* Call store's fetch action */}
                                    Retry Load Chart
                                </Button>
                            </div>
                        ) : (
                            <RentalChart chartData={filteredChartData} vehicleClasses={vehicleClasses} ref={chartRef} />
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
