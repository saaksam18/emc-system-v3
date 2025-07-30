'use client';

import { Label, Pie, PieChart, Sector } from 'recharts';
import { PieSectorDataItem } from 'recharts/types/polar/Pie';

import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

interface ChartDataItem {
    id: number;
    label: string;
    total: number;
    available: number;
    unavailable: number;
    vehicle_class_key: string;
    fill: string;
}

interface VehicleStockChartProps {
    data: ChartDataItem[];
    chartConfig: ChartConfig;
    activeMonth: string | null; // From `activeClassKey` in previous component
    activeIndex: number;
    grandTotalAvailable: number; // <--- ADD THIS PROP
}

export default function VehicleStockChart({ data, chartConfig, activeMonth, activeIndex, grandTotalAvailable }: VehicleStockChartProps) {
    const id = 'pie-interactive';

    return (
        <ChartContainer id={id} config={chartConfig} className="mx-auto aspect-square w-full max-w-[200px]">
            <PieChart>
                <ChartTooltip
                    cursor={false}
                    content={
                        <ChartTooltipContent
                            formatter={(value, name, item) => {
                                const dataItem = item.payload as ChartDataItem;
                                return (
                                    <div className="flex flex-col gap-1">
                                        <span className="font-semibold">{dataItem.label}</span>
                                        <span className="text-muted-foreground">Total: {dataItem.total} vehicles</span>
                                        <span className="text-muted-foreground">Available: {dataItem.available} vehicles</span>
                                        <span className="text-muted-foreground">Unavailable: {dataItem.unavailable} vehicles</span>
                                    </div>
                                );
                            }}
                        />
                    }
                />
                <Pie
                    data={data}
                    dataKey="available"
                    nameKey="label"
                    innerRadius={40}
                    activeIndex={activeIndex}
                    activeShape={({ outerRadius = 0, ...props }: PieSectorDataItem) => (
                        <g>
                            <Sector {...props} outerRadius={outerRadius + 2.5} />
                            <Sector {...props} outerRadius={outerRadius + 20} innerRadius={outerRadius + 10} />
                        </g>
                    )}
                    fill={(d: ChartDataItem) => d.fill}
                >
                    <Label
                        content={({ viewBox }) => {
                            if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                                return (
                                    <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                                        <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-3xl font-bold">
                                            {grandTotalAvailable}
                                        </tspan>
                                        <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 20} className="fill-muted-foreground">
                                            In Stock
                                        </tspan>
                                    </text>
                                );
                            }
                            return null;
                        }}
                    />
                </Pie>
            </PieChart>
        </ChartContainer>
    );
}
