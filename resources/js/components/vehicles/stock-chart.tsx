import { Bar, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from 'recharts';

import { CardContent } from '@/components/ui/card'; // Assuming Shadcn UI structure
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'; // Assuming Shadcn UI structure
import { useMemo } from 'react';

interface vehicleClassesType {
    id: any;
    name: string;
    color: string;
}

interface chartDataType {
    data: any;
    totalMoto: any;
}

interface VehicleStockChartProps {
    chartData: chartDataType[];
    vehicleClasses: vehicleClassesType[];
    [key: string]: any;
}

// Main App component
export function VehicleStockChart({ chartData, vehicleClasses }: VehicleStockChartProps) {
    const chartConfig = useMemo(() => {
        const config = vehicleClasses.reduce((acc, vehicleClass) => {
            // Key in config uses the class ID (matching data keys)
            acc[vehicleClass.id] = {
                label: vehicleClass.name, // Display name
                color: vehicleClass.color, // Use color from backend
            };
            return acc;
        }, {});

        // Add config for the total line
        config.totalMoto = {
            label: 'TOTAL MOTO',
            color: '#8884d8', // Example color for total line
        };
        return config;
    }, [vehicleClasses]); // Dependency array for useMemo

    // Basic check for data
    if (!chartData || chartData.length === 0 || !vehicleClasses || vehicleClasses.length === 0) {
        return (
            <CardContent>
                <div className="flex h-[250px] items-center justify-center">
                    <p className="text-muted-foreground">No data or vehicle classes available for the chart.</p>
                </div>
            </CardContent>
        );
    }
    return (
        <CardContent>
            {/* Pass the dynamically generated config */}
            <ChartContainer config={chartConfig} className="text-primary h-[250px] w-full">
                <ComposedChart
                    accessibilityLayer
                    data={chartData} // Use the prop data
                    margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                >
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                    <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                    <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                    <ChartLegend content={<ChartLegendContent />} />

                    {/* Dynamically generate a <Bar> for each vehicle class */}
                    {vehicleClasses.map((vehicleClass) => (
                        <Bar
                            key={vehicleClass.id}
                            // dataKey MUST be a string and match the keys in chartData objects
                            dataKey={String(vehicleClass.id)}
                            stackId="onRent" // Stack bars for 'on rent' counts
                            fill={chartConfig[vehicleClass.id]?.color || '#ccc'} // Use configured color, fallback gray
                            radius={4}
                            // Name is used by default legend/tooltip unless overridden
                            name={vehicleClass.name}
                        />
                    ))}

                    {/* Line for Total Moto */}
                    <Line
                        dataKey="totalMoto"
                        type="monotone"
                        stroke={chartConfig.totalMoto.color}
                        strokeWidth={2}
                        dot={false}
                        name="TOTAL MOTO" // Explicitly name for legend/tooltip if needed
                    />
                </ComposedChart>
            </ChartContainer>
        </CardContent>
    );
}
