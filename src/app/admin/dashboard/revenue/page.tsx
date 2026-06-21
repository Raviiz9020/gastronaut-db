
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useOrder } from '@/context/order-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Download, Calendar as CalendarIcon } from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

export default function AdminRevenuePage() {
  const { orders } = useOrder();
  
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [filter, setFilter] = useState('today');
  const [isClient, setIsClient] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // Set initial date range on client mount to avoid hydration mismatch
    setDateRange({ from: new Date(), to: new Date() });
  }, []);


  const deliveredOrders = useMemo(() => {
    return orders.filter(order => order.status === 'Delivered' || order.status === 'Picked Up');
  }, [orders]);

  const filteredOrders = useMemo(() => {
    if (!dateRange?.from) {
      return deliveredOrders;
    }
    
    return deliveredOrders.filter(order => {
        if (!order.createdAt) return false; // Guard against missing createdAt
        const orderDate = new Date(order.createdAt);
        const fromDate = new Date(dateRange.from!);
        fromDate.setHours(0,0,0,0);
        const toDate = dateRange.to ? new Date(dateRange.to) : new Date(dateRange.from);
        toDate.setHours(23,59,59,999);
        return orderDate >= fromDate && orderDate <= toDate;
    });
  }, [deliveredOrders, dateRange]);

  const totalRevenue = useMemo(() => {
    return filteredOrders.reduce((sum, order) => sum + order.totalPrice, 0);
  }, [filteredOrders]);

  const handleExport = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + ["Order ID", "Customer Name", "Date", "Items", "Total Price"].join(",") + "\n"
      + filteredOrders.map(o => {
          const itemsString = o.items.map(item => `${item.quantity}x ${item.name}`).join('; ');
          return [
            o.orderId,
            o.customer.name,
            o.createdAt ? format(new Date(o.createdAt), 'dd/MM/yyyy') : 'N/A',
            `"${itemsString}"`,
            o.totalPrice.toFixed(2)
          ].join(",");
        }).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `revenue_report_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handleFilterChange = (value: string) => {
    setFilter(value);
    const now = new Date();
    switch (value) {
      case 'today':
        setDateRange({ from: now, to: now });
        break;
      case 'last7':
        setDateRange({ from: subDays(now, 6), to: now });
        break;
      case 'thisMonth':
        setDateRange({ from: startOfMonth(now), to: endOfMonth(now) });
        break;
      case 'thisYear':
        setDateRange({ from: startOfYear(now), to: endOfYear(now) });
        break;
      case 'all':
      default:
        setDateRange(undefined);
        break;
    }
  };

  if (!isClient) {
    return null; // or a loading skeleton
  }

  return (
    <div className="flex-1 space-y-8 p-8 pt-6">
      <Card className="rounded-3xl">
        <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                <CardTitle className="text-xl">
                    Total Revenue for Period: <span className="text-primary">₹{totalRevenue.toFixed(2)}</span>
                </CardTitle>
                <div className="flex flex-col md:flex-row items-center gap-2">
                    <Select value={filter} onValueChange={handleFilterChange}>
                        <SelectTrigger className="w-full md:w-[180px]">
                            <SelectValue placeholder="Select date range" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="today">Today</SelectItem>
                            <SelectItem value="last7">Last 7 Days</SelectItem>
                            <SelectItem value="thisMonth">This Month</SelectItem>
                            <SelectItem value="thisYear">This Year</SelectItem>
                            <SelectItem value="all">Select Range</SelectItem>
                        </SelectContent>
                    </Select>
                    <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                        <PopoverTrigger asChild>
                            <Button
                            id="date"
                            variant={"outline"}
                            className={cn(
                                "w-full md:w-auto justify-start text-left font-normal",
                                !dateRange && "text-muted-foreground"
                            )}
                            >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dateRange?.from ? (
                                dateRange.to ? (
                                <>
                                    {format(dateRange.from, "LLL dd, y")} -{" "}
                                    {format(dateRange.to, "LLL dd, y")}
                                </>
                                ) : (
                                format(dateRange.from, "LLL dd, y")
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
                            defaultMonth={dateRange?.from}
                            selected={dateRange}
                            onSelect={(newDate) => {
                                setDateRange(newDate);
                                if (newDate?.to) {
                                    setIsCalendarOpen(false);
                                }
                                if (newDate) {
                                    setFilter('custom'); // Set filter to custom when a date is picked
                                }
                            }}
                            numberOfMonths={1}
                            />
                        </PopoverContent>
                    </Popover>
                    <Button onClick={handleExport} disabled={filteredOrders.length === 0} className="w-full md:w-auto">
                        <Download className="mr-2 h-4 w-4"/>
                        Export CSV
                    </Button>
                </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Items</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.length > 0 ? (
                filteredOrders.map(order => (
                  <TableRow key={order.orderId}>
                    <TableCell className="font-medium">{order.orderId}</TableCell>
                    <TableCell>{order.customer.name}</TableCell>
                    <TableCell>
                      {order.createdAt ? format(new Date(order.createdAt), 'dd/MM/yy') : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <ul className="space-y-1">
                        {order.items.map((item, index) => (
                          <li key={`${order.orderId}-${item.cartItemId || index}`} className="text-xs">{item.quantity}x {item.name}</li>
                        ))}
                      </ul>
                    </TableCell>
                    <TableCell className="text-right">₹{order.totalPrice.toFixed(2)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No completed orders in the selected period.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
