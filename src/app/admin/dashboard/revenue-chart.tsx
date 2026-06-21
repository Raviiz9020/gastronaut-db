

'use client';

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { ChartTooltip, ChartTooltipContent, ChartContainer, ChartConfig, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { format, parse } from 'date-fns';

const chartConfig = {
  revenue: {
    label: "Revenue",
    color: "hsl(139, 55%, 45%)", // Green
  },
  expenses: {
    label: "Expenses",
    color: "hsl(0, 84%, 60%)", // Red
  },
} satisfies ChartConfig;


interface RevenueExpenseChartProps {
    data: { date: string; revenue: number; expenses: number }[] | { hour: string, orders: number }[];
}

export default function RevenueExpenseChart({ data }: RevenueExpenseChartProps) {
    
    if (!data || data.length === 0) {
        return <div className="text-center text-muted-foreground p-4">No data to display</div>;
    }

    const isHourlyData = 'hour' in data[0];
    const showExpenses = 'expenses' in data[0] && data.some(d => (d as any).expenses > 0);

    const formatValue = (value: number): string => {
        if (isHourlyData) {
            return value.toString();
        }
        if (value > 999) {
            return `₹${(value / 1000).toFixed(1)}k`;
        }
        return `₹${value.toFixed(0)}`;
    };

    const tickFormatter = (value: string | number) => {
        if (typeof value === 'number') {
           return isHourlyData ? `${value}` : formatValue(value);
        }
        if (isHourlyData) {
            const hour = parseInt(value);
            return `${hour}`;
        }
        // For date data like "MMM d" (e.g., "Oct 12")
        try {
            // Attempt to parse the date and format it to just the day
            const date = parse(value, 'MMM d', new Date());
            return format(date, 'd');
        } catch (e) {
            // Fallback for any other string format
            return value;
        }
    };

    const chartData = isHourlyData 
        ? (data as { hour: string, orders: number }[]).map(d => ({ date: d.hour, revenue: d.orders, expenses: 0 }))
        : (data as { date: string; revenue: number; expenses: number }[]);


    return (
        <ChartContainer config={chartConfig} className="w-full h-full">
            <BarChart accessibilityLayer data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                    dataKey="date"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                    tickFormatter={tickFormatter}
                    interval={'preserveStartEnd'}
                    fontSize={12}
                />
                 <YAxis
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => formatValue(value as number)}
                    allowDecimals={false}
                    width={80}
                />
                <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="dot" formatter={(value, name) => {
                        const formattedValue = typeof value === 'number' && !isHourlyData ? `₹${value.toFixed(2)}` : value;
                        const finalName = name === 'revenue' && isHourlyData ? 'Orders' : name;
                        return (
                            <div className="flex flex-col items-start gap-0">
                                <span className="font-semibold">{formattedValue}</span>
                                <span className="text-muted-foreground text-xs capitalize">{finalName}</span>
                            </div>
                        )
                    }}/>}
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="revenue" fill="var(--color-revenue)" radius={4} name={isHourlyData ? 'Orders' : 'Revenue'} barSize={8} />
                {showExpenses && <Bar dataKey="expenses" fill="var(--color-expenses)" radius={4} barSize={8} />}
            </BarChart>
        </ChartContainer>
    )
}






