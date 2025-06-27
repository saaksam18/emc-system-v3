import {
    BarController,
    BarElement,
    CategoryScale,
    Chart as ChartJS,
    Legend,
    LinearScale,
    LineController,
    LineElement,
    PointElement,
    Title,
    Tooltip,
} from 'chart.js';
import React from 'react';
import { Chart } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, BarController, LineController, Title, Tooltip, Legend);

// Define the type for an individual chart data item
interface ChartDataItem {
    label: string; // e.g., "Jan '23"
    month_key: string; // e.g., "2023-01" (though not directly used here, good for consistency)
    totalFleet: number; // Total number of vehicles in fleet at this point
    totalRented: number; // Total number of vehicles rented at this point
    totalStock: number; // Total number of vehicles in stock (available) at this point
    [key: string]: any; // Allow for dynamic class keys like 'totalClassScooter'
}

// Define the props for the RentalChart component
interface RentalChartProps {
    chartData: ChartDataItem[] | undefined;
    vehicleClasses: { id: number | string; name: string; color: string; key_name: string }[] | undefined;
}

// VehicleStockChart component - now using Chart.js, forwarded ref for export
const RentalChart = React.forwardRef(({ chartData, vehicleClasses }: RentalChartProps, ref: React.ForwardedRef<ChartJS>) => {
    // console.log('chartData (in RentalChart):', chartData); // For debugging
    // console.log('vehicleClasses (in RentalChart):', vehicleClasses); // For debugging

    // Check if chartData or vehicleClasses are missing/empty
    if (!chartData || chartData.length === 0 || !vehicleClasses || vehicleClasses.length === 0) {
        return <div className="text-muted-foreground flex h-full items-center justify-center">No chart data or vehicle classes available.</div>;
    }

    // Prepare datasets for Chart.js
    const datasets: any = [];

    // Add datasets for each vehicle class (as stacked bars), representing RENTED vehicles by class
    vehicleClasses.forEach((vc) => {
        datasets.push({
            type: 'bar',
            label: `Rented: ${vc.name}`, // Clarify label for bars
            data: chartData.map((item) => item[vc.key_name] || 0), // Use key_name for data access
            backgroundColor: vc.color,
            borderColor: vc.color,
            borderWidth: 1,
            stack: 'rentedVehiclesByClass', // Stack all rented vehicle class bars together
            borderRadius: 4,
        });
    });

    // Add dataset for TOTAL RENTED (as a line)
    datasets.push({
        type: 'line',
        label: 'Total Rented',
        data: chartData.map((item) => item.totalRented),
        borderColor: '#FF7F0E', // Orange, distinct color
        backgroundColor: '#FF7F0E',
        fill: false,
        tension: 0.4,
        yAxisID: 'y',
        order: 1, // Render after bars but before fleet/stock for visual hierarchy
        pointRadius: 0, // REMOVED DOTS
        pointBackgroundColor: '#FF7F0E',
        pointBorderColor: '#fff',
        pointHoverRadius: 0, // REMOVED DOTS ON HOVER
        pointHoverBackgroundColor: '#FF7F0E',
        pointHoverBorderColor: '#fff',
    });

    // Add dataset for TOTAL STOCK (as a line)
    datasets.push({
        type: 'line',
        label: 'Total Stock (Available)',
        data: chartData.map((item) => item.totalStock),
        borderColor: '#04a96d', // Green, distinct color
        backgroundColor: '#04a96d',
        fill: false,
        tension: 0.4,
        yAxisID: 'y',
        order: 2, // Render after total rented
        pointRadius: 0, // REMOVED DOTS
        pointBackgroundColor: '#04a96d',
        pointBorderColor: '#fff',
        pointHoverRadius: 0, // REMOVED DOTS ON HOVER
        pointHoverBackgroundColor: '#04a96d',
        pointHoverBorderColor: '#fff',
    });

    // Add dataset for TOTAL FLEET (as a line)
    datasets.push({
        type: 'line',
        label: 'Total Fleet',
        data: chartData.map((item) => item.totalFleet),
        borderColor: '#1c3151', // Dark blue, distinct color
        backgroundColor: '#1c3151',
        fill: false,
        tension: 0.4,
        yAxisID: 'y',
        order: 3, // Render last to be on top of others
        pointRadius: 0, // REMOVED DOTS
        pointBackgroundColor: '#1c3151',
        pointBorderColor: '#fff',
        pointHoverRadius: 0, // REMOVED DOTS ON HOVER
        pointHoverBackgroundColor: '#1c3151',
        pointHoverBorderColor: '#fff',
    });

    const data = {
        labels: chartData.map((item) => item.label),
        datasets: datasets,
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom' as const,
                labels: {
                    usePointStyle: false, // Changed to false to make legend markers square
                    boxWidth: 20, // Adjusted width for better visibility for line legends
                    padding: 20, // Spacing between legend items
                    font: {
                        size: 12, // Smaller font for legend
                    },
                },
            },
            title: {
                display: false,
            },
            tooltip: {
                mode: 'index' as const,
                intersect: false,
                callbacks: {
                    title: function (context: any) {
                        return `Date: ${context[0].label}`;
                    },
                    label: function (context: any) {
                        let label = context.dataset.label || '';
                        if (label) {
                            label += ': ';
                        }
                        if (context.parsed.y !== null) {
                            label += context.parsed.y;
                        }
                        return label;
                    },
                    // You can remove or modify the footer if the individual labels provide enough info
                    // footer: function (context: any) {
                    //     // Example of getting specific values for the footer if needed
                    //     const dataIndex = context[0].dataIndex;
                    //     const currentItem = chartData[dataIndex];
                    //     return `Fleet: ${currentItem.totalFleet}, Stock: ${currentItem.totalStock}, Rented: ${currentItem.totalRented}`;
                    // },
                },
                backgroundColor: 'rgba(0, 0, 0, 0.7)', // Darker tooltip background
                titleFont: { size: 14, weight: 'bold' },
                bodyFont: { size: 12 },
                footerFont: { size: 12, weight: 'bold' },
                padding: 10,
                cornerRadius: 6,
            },
        },
        scales: {
            x: {
                stacked: true, // Keep bars stacked on X-axis
                grid: {
                    display: false, // Set to false to remove vertical grid lines
                    drawOnChartArea: false, // Ensure grid lines don't draw on chart area
                },
                ticks: {
                    color: '#666', // Darker grey for labels
                    font: {
                        size: 11, // Smaller font for x-axis labels
                    },
                },
                title: {
                    display: false,
                    text: 'Date',
                },
            },
            y: {
                beginAtZero: true,
                stacked: false, // Important: Set to false so lines are not stacked on bars
                grid: {
                    display: true,
                    drawOnChartArea: true,
                    drawTicks: false,
                    color: 'rgba(0, 0, 0, 0.05)', // Very light grey grid lines
                    lineWidth: 1,
                },
                ticks: {
                    color: '#666', // Darker grey for labels
                    font: {
                        size: 11, // Smaller font for y-axis labels
                    },
                    callback: function (value: number | string) {
                        // Only show integer ticks, and ensure they are not too dense
                        if (Number.isInteger(Number(value))) {
                            return value;
                        }
                        return '';
                    },
                },
                title: {
                    display: false,
                    text: 'Count', // Generic "Count" as it covers different metrics
                },
            },
        },
    };

    return (
        <div style={{ position: 'relative', height: '100%', width: '100%' }}>
            <Chart type="bar" data={data} options={options} ref={ref} />
        </div>
    );
});
RentalChart.displayName = 'RentalChart';

export default RentalChart;
