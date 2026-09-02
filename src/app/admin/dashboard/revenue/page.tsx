'use client';

import { useState, useMemo, useEffect } from 'react';
import { useOrder } from '@/context/order-context';
import { useVendor } from '@/context/vendor-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Download,
  Calendar as CalendarIcon,
  IndianRupee,
  PackageCheck,
  TrendingUp,
  Utensils,
  Bike,
  Home,
  Search,
  X,
  PieChart,
  ShoppingBag,
  Award
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import type { Order } from '@/types';

export default function AdminRevenuePage() {
  const { orders } = useOrder();
  const { vendor } = useVendor();

  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [filter, setFilter] = useState('today');
  const [searchQuery, setSearchQuery] = useState('');
  const [isClient, setIsClient] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const now = new Date();
    setDateRange({ from: now, to: now });
  }, []);

  const deliveredOrders = useMemo(() => {
    return orders.filter(order => {
      const isDelivered = order.status === 'Delivered' || order.status === 'Picked Up';
      if (!vendor) return isDelivered;
      return isDelivered && order.vendorUsername === vendor.username;
    });
  }, [orders, vendor]);

  const filteredOrders = useMemo(() => {
    if (!dateRange?.from) {
      return deliveredOrders;
    }

    return deliveredOrders.filter(order => {
      if (!order.createdAt) return false;
      const orderDate = new Date(order.createdAt);
      const fromDate = new Date(dateRange.from!);
      fromDate.setHours(0, 0, 0, 0);
      const toDate = dateRange.to ? new Date(dateRange.to) : new Date(dateRange.from!);
      toDate.setHours(23, 59, 59, 999);
      return orderDate >= fromDate && orderDate <= toDate;
    });
  }, [deliveredOrders, dateRange]);

  const getVendorOrderRevenue = (order: any) => {
    if (order.subtotal !== undefined) {
      return Math.max(0, order.subtotal - (order.discountAmount || 0));
    }
    return order.totalPrice || 0;
  };

  // Financial KPI Calculations
  const totalRevenue = useMemo(() => {
    return filteredOrders.reduce((sum, order) => sum + getVendorOrderRevenue(order), 0);
  }, [filteredOrders]);

  const totalOrdersCount = filteredOrders.length;
  const aov = totalOrdersCount > 0 ? totalRevenue / totalOrdersCount : 0;

  // Channel Breakdown
  const channelMetrics = useMemo(() => {
    const metrics = {
      delivery: { count: 0, revenue: 0 },
      dineIn: { count: 0, revenue: 0 },
      pickup: { count: 0, revenue: 0 },
    };

    filteredOrders.forEach(o => {
      const rev = getVendorOrderRevenue(o);
      if (o.deliveryOption === 'Dine-In') {
        metrics.dineIn.count += 1;
        metrics.dineIn.revenue += rev;
      } else if (o.deliveryOption === 'Self Pickup') {
        metrics.pickup.count += 1;
        metrics.pickup.revenue += rev;
      } else {
        metrics.delivery.count += 1;
        metrics.delivery.revenue += rev;
      }
    });

    return metrics;
  }, [filteredOrders]);

  // Top Dishes by Sales
  const topDishes = useMemo(() => {
    const dishMap: Record<string, { name: string; quantity: number; revenue: number }> = {};

    filteredOrders.forEach(o => {
      o.items.forEach(item => {
        if (!dishMap[item.name]) {
          dishMap[item.name] = { name: item.name, quantity: 0, revenue: 0 };
        }
        dishMap[item.name].quantity += item.quantity || 1;
        dishMap[item.name].revenue += (item.price || 0) * (item.quantity || 1);
      });
    });

    return Object.values(dishMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [filteredOrders]);

  // Search filtered orders
  const searchedOrders = useMemo(() => {
    if (!searchQuery.trim()) return filteredOrders;
    const q = searchQuery.toLowerCase();
    return filteredOrders.filter(o =>
      (o.displayId && o.displayId.toLowerCase().includes(q)) ||
      o.orderId.toLowerCase().includes(q) ||
      o.customer.name.toLowerCase().includes(q) ||
      o.items.some(i => i.name.toLowerCase().includes(q))
    );
  }, [filteredOrders, searchQuery]);

  const handleExport = () => {
    const csvContent = "data:text/csv;charset=utf-8,"
      + ["Order ID", "Customer Name", "Date", "Fulfillment", "Items", "Amount"].join(",") + "\n"
      + filteredOrders.map(o => {
        const itemsString = o.items.map(item => `${item.quantity}x ${item.name}`).join('; ');
        return [
          o.displayId || o.orderId,
          `"${o.customer.name}"`,
          o.createdAt ? format(new Date(o.createdAt), 'dd/MM/yyyy HH:mm') : 'N/A',
          `"${o.deliveryOption || 'Home Delivery'}"`,
          `"${itemsString}"`,
          getVendorOrderRevenue(o).toFixed(2)
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
    return null;
  }

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-8 pt-6 max-w-7xl mx-auto">
      {/* Top Header & Date Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-headline text-foreground flex items-center gap-2">
            <IndianRupee className="h-7 w-7 text-primary" />
            Revenue & Sales
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Real-time financial breakdown, customer transactions, and revenue distribution.
          </p>
        </div>

        {/* Date Filter Pills + Custom Calendar */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-muted/70 p-1 rounded-full border border-border/60 shadow-2xs">
            {[
              { key: 'today', label: 'Today' },
              { key: 'last7', label: '7 Days' },
              { key: 'thisMonth', label: 'This Month' },
              { key: 'thisYear', label: 'This Year' },
              { key: 'all', label: 'All Time' },
            ].map(tab => (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleFilterChange(tab.key)}
                className={cn(
                  "px-3 py-1 text-xs font-bold rounded-full transition-all cursor-pointer",
                  filter === tab.key
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant={filter === 'custom' ? 'default' : 'outline'}
                size="sm"
                className="rounded-full text-xs font-bold gap-1.5 h-8 shadow-xs"
              >
                <CalendarIcon className="h-3.5 w-3.5" />
                {dateRange?.from ? (
                  dateRange.to && format(dateRange.from, 'yyyy-MM-dd') !== format(dateRange.to, 'yyyy-MM-dd') ? (
                    `${format(dateRange.from, 'MMM d')} - ${format(dateRange.to, 'MMM d')}`
                  ) : (
                    format(dateRange.from, 'MMM d, yyyy')
                  )
                ) : (
                  'Custom'
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 rounded-2xl" align="end">
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
                    setFilter('custom');
                  }
                }}
                numberOfMonths={1}
              />
            </PopoverContent>
          </Popover>

          <Button
            onClick={handleExport}
            disabled={filteredOrders.length === 0}
            size="sm"
            variant="outline"
            className="rounded-full text-xs font-bold gap-1.5 h-8 bg-card shadow-xs hover:bg-muted"
          >
            <Download className="h-3.5 w-3.5 text-primary" />
            <span className="hidden sm:inline">Export CSV</span>
          </Button>
        </div>
      </div>

      {/* 4 Financial KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Net Revenue */}
        <Card className="rounded-3xl border border-border/70 bg-gradient-to-br from-card via-card to-primary/5 shadow-xs">
          <CardHeader className="p-5 pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Net Revenue
            </CardTitle>
            <div className="w-8 h-8 rounded-xl bg-primary/15 text-primary flex items-center justify-center font-bold">
              <IndianRupee className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="text-2xl sm:text-3xl font-extrabold font-headline text-foreground">
              ₹{totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
            <p className="text-[11px] text-muted-foreground font-medium mt-1">
              Delivered revenue in selected range
            </p>
          </CardContent>
        </Card>

        {/* Total Orders */}
        <Card className="rounded-3xl border border-border/70 bg-gradient-to-br from-card via-card to-emerald-500/5 shadow-xs">
          <CardHeader className="p-5 pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Delivered Orders
            </CardTitle>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <PackageCheck className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="text-2xl sm:text-3xl font-extrabold font-headline text-foreground">
              {totalOrdersCount}
            </div>
            <p className="text-[11px] text-muted-foreground font-medium mt-1">
              Successfully fulfilled tickets
            </p>
          </CardContent>
        </Card>

        {/* Average Order Value (AOV) */}
        <Card className="rounded-3xl border border-border/70 bg-gradient-to-br from-card via-card to-amber-500/5 shadow-xs">
          <CardHeader className="p-5 pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Avg. Order Value (AOV)
            </CardTitle>
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <TrendingUp className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="text-2xl sm:text-3xl font-extrabold font-headline text-foreground">
              ₹{aov.toFixed(0)}
            </div>
            <p className="text-[11px] text-muted-foreground font-medium mt-1">
              Average ticket basket size
            </p>
          </CardContent>
        </Card>

        {/* Fulfillment Mix */}
        <Card className="rounded-3xl border border-border/70 bg-gradient-to-br from-card via-card to-blue-500/5 shadow-xs">
          <CardHeader className="p-5 pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Dine-In vs. Delivery
            </CardTitle>
            <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <PieChart className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="text-2xl sm:text-3xl font-extrabold font-headline text-foreground">
              {channelMetrics.dineIn.count} : {channelMetrics.delivery.count}
            </div>
            <p className="text-[11px] text-muted-foreground font-medium mt-1">
              {channelMetrics.dineIn.count} Dine-In • {channelMetrics.delivery.count} Delivery
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Breakdown by Channel & Top Sellers */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Channel Revenue Bars */}
        <Card className="lg:col-span-5 rounded-3xl border border-border/70 bg-card/90 shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-primary" />
              Channel Earnings
            </CardTitle>
            <CardDescription className="text-xs">
              Revenue distribution across fulfillment channels.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Delivery */}
            <div className="p-3 rounded-2xl border border-orange-500/30 bg-orange-500/5 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="flex items-center gap-1.5 text-orange-600 dark:text-orange-400">
                  <Bike className="h-4 w-4" /> Home Delivery ({channelMetrics.delivery.count})
                </span>
                <span className="text-foreground">₹{channelMetrics.delivery.revenue.toFixed(0)}</span>
              </div>
              <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-orange-500 rounded-full transition-all"
                  style={{
                    width: `${totalRevenue > 0 ? (channelMetrics.delivery.revenue / totalRevenue) * 100 : 0}%`
                  }}
                />
              </div>
            </div>

            {/* Dine-In */}
            <div className="p-3 rounded-2xl border border-blue-500/30 bg-blue-500/5 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                  <Utensils className="h-4 w-4" /> Dine-In Tables ({channelMetrics.dineIn.count})
                </span>
                <span className="text-foreground">₹{channelMetrics.dineIn.revenue.toFixed(0)}</span>
              </div>
              <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all"
                  style={{
                    width: `${totalRevenue > 0 ? (channelMetrics.dineIn.revenue / totalRevenue) * 100 : 0}%`
                  }}
                />
              </div>
            </div>

            {/* Self Pickup */}
            <div className="p-3 rounded-2xl border border-purple-500/30 bg-purple-500/5 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400">
                  <Home className="h-4 w-4" /> Self Pickup ({channelMetrics.pickup.count})
                </span>
                <span className="text-foreground">₹{channelMetrics.pickup.revenue.toFixed(0)}</span>
              </div>
              <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-purple-500 rounded-full transition-all"
                  style={{
                    width: `${totalRevenue > 0 ? (channelMetrics.pickup.revenue / totalRevenue) * 100 : 0}%`
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Earning Dishes */}
        <Card className="lg:col-span-7 rounded-3xl border border-border/70 bg-card/90 shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Award className="h-4 w-4 text-primary" />
              Top Earning Menu Items
            </CardTitle>
            <CardDescription className="text-xs">
              Best-selling dishes ranked by total sales volume in this period.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {topDishes.length > 0 ? (
              <div className="space-y-2.5">
                {topDishes.map((dish, idx) => (
                  <div
                    key={dish.name}
                    className="flex items-center justify-between p-3 rounded-2xl border border-border/60 bg-muted/20 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-primary/10 text-primary font-black text-xs flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-foreground line-clamp-1">{dish.name}</h4>
                        <span className="text-[11px] text-muted-foreground font-semibold">
                          {dish.quantity} sold
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs sm:text-sm font-extrabold text-foreground">
                        ₹{dish.revenue.toFixed(0)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-xs text-muted-foreground">
                No dish sales recorded in this date range.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table Card */}
      <Card className="rounded-3xl border border-border/70 shadow-xs bg-card/95 overflow-hidden">
        <CardHeader className="p-4 sm:p-6 border-b border-border/60 bg-muted/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base sm:text-lg font-bold">Transaction Ledger</CardTitle>
              <CardDescription className="text-xs">
                Detailed record of fulfilled orders and amounts.
              </CardDescription>
            </div>

            {/* Live Search Box */}
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search by ID, customer, item..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-8 text-xs rounded-full h-8 border-border/70"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/10">
                  <TableHead className="text-xs font-bold pl-6">Order ID</TableHead>
                  <TableHead className="text-xs font-bold">Customer</TableHead>
                  <TableHead className="text-xs font-bold">Date & Time</TableHead>
                  <TableHead className="text-xs font-bold">Fulfillment</TableHead>
                  <TableHead className="text-xs font-bold">Items Breakdown</TableHead>
                  <TableHead className="text-xs font-bold text-right pr-6">Net Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {searchedOrders.length > 0 ? (
                  searchedOrders.map((order: Order) => {
                    const isDineIn = order.deliveryOption === 'Dine-In';
                    const isPickup = order.deliveryOption === 'Self Pickup';

                    return (
                      <TableRow key={order.orderId} className="hover:bg-muted/20 transition-colors">
                        <TableCell className="font-extrabold text-xs pl-6">
                          #{order.displayId || order.orderId.slice(-6).toUpperCase()}
                        </TableCell>
                        <TableCell className="text-xs font-bold text-foreground">
                          {order.customer.name}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground font-medium">
                          {order.createdAt ? format(new Date(order.createdAt), 'dd/MM/yy hh:mm a') : 'N/A'}
                        </TableCell>
                        <TableCell>
                          {isDineIn ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-white bg-blue-600 px-2.5 py-0.5 rounded-full shadow-2xs uppercase tracking-wider">
                              <Utensils className="h-3 w-3" /> {order.customer.name.startsWith('Table') ? order.customer.name : 'Table'}
                            </span>
                          ) : isPickup ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-white bg-purple-600 px-2.5 py-0.5 rounded-full shadow-2xs uppercase tracking-wider">
                              <Home className="h-3 w-3" /> Pickup
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-white bg-orange-600 px-2.5 py-0.5 rounded-full shadow-2xs uppercase tracking-wider">
                              <Bike className="h-3 w-3" /> Delivery
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs max-w-xs">
                          <div className="flex flex-wrap gap-1">
                            {order.items.map((item, idx) => (
                              <span
                                key={`${order.orderId}-${item.cartItemId || idx}`}
                                className="inline-flex items-center text-[10px] font-semibold bg-muted px-2 py-0.5 rounded-full text-foreground border border-border/50"
                              >
                                {item.quantity}x {item.name}
                              </span>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-xs font-black text-foreground pr-6">
                          ₹{getVendorOrderRevenue(order).toFixed(0)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-xs text-muted-foreground">
                      No delivered orders matching your filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
