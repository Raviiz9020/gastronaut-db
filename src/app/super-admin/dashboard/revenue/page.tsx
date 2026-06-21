'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useOrder } from '@/context/order-context';
import { useVendor } from '@/context/vendor-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Loader2, IndianRupee, Package, BarChart2, Users, Calendar } from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear, eachDayOfInterval, parseISO, differenceInDays, endOfDay } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Vendor, Order, OrderStatus } from '@/types';
import RevenueChart from '@/app/admin/dashboard/revenue-chart';

interface VendorRevenue {
  vendor: Vendor;
  revenue: number;
  orderCount: number;
  activeOrders: number;
  avgOrderValue: number;
  uniqueCustomers: number;
  onboardedSince: string;
  weeklyRevenue: { date: string; revenue: number, expenses: 0 }[];
}

const activeStatuses: OrderStatus[] = ['Order Placed', 'Processing', 'Out for Delivery', 'Accepted', 'Order Ready'];


const VendorRevenueCard = ({ 
    vendor, 
    data,
    onFetch,
    isFetching,
}: { 
    vendor: Vendor;
    data: Omit<VendorRevenue, 'vendor'> | null;
    onFetch: (username: string) => void;
    isFetching: boolean;
}) => {
    return (
        <Card className="rounded-3xl flex flex-col">
            <CardHeader>
                <CardTitle>{vendor.shopName || vendor.name}</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 space-y-4">
                 {data ? (
                    <>
                         <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="flex items-center gap-2">
                                <IndianRupee className="h-4 w-4 text-muted-foreground" />
                                <div>
                                    <p className="text-muted-foreground">Revenue</p>
                                    <p className="font-bold">₹{data.revenue.toFixed(2)}</p>
                                </div>
                            </div>
                             <div className="flex items-center gap-2">
                                <Package className="h-4 w-4 text-muted-foreground" />
                                <div>
                                    <p className="text-muted-foreground">Completed</p>
                                    <p className="font-bold">{data.orderCount} orders</p>
                                </div>
                            </div>
                             <div className="flex items-center gap-2">
                                <Loader2 className="h-4 w-4 text-muted-foreground" />
                                <div>
                                    <p className="text-muted-foreground">Active</p>
                                    <p className="font-bold">{data.activeOrders} orders</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <BarChart2 className="h-4 w-4 text-muted-foreground" />
                                <div>
                                    <p className="text-muted-foreground">Avg. Value</p>
                                    <p className="font-bold">₹{data.avgOrderValue.toFixed(2)}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                <div>
                                    <p className="text-muted-foreground">Customers</p>
                                    <p className="font-bold">{data.uniqueCustomers}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <div>
                                    <p className="text-muted-foreground">Onboarded</p>
                                    <p className="font-bold">{data.onboardedSince}</p>
                                </div>
                            </div>
                        </div>
                        <div>
                            <h4 className="text-sm font-semibold mb-2 text-center text-muted-foreground">Last 7 Days Revenue</h4>
                            <div className="h-[200px]">
                                <RevenueChart data={data.weeklyRevenue}/>
                            </div>
                        </div>
                    </>
                 ) : (
                    <div className="flex items-center justify-center h-full">
                        <Button onClick={() => onFetch(vendor.username)} disabled={isFetching} variant="secondary">
                            {isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BarChart2 className="mr-2 h-4 w-4" />}
                            {isFetching ? "Loading..." : "Fetch Data"}
                        </Button>
                    </div>
                 )}
            </CardContent>
        </Card>
    )
}


export default function SuperAdminRevenuePage() {
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [allVendors, setAllVendors] = useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [vendorRevenueData, setVendorRevenueData] = useState<Record<string, Omit<VendorRevenue, 'vendor'> | null>>({});
  const [fetchingFor, setFetchingFor] = useState<string | null>(null);
  
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [filter, setFilter] = useState('all');
  
  const { fetchAllOrders } = useOrder();
  const { fetchAllVendors } = useVendor();

  const loadInitialData = useCallback(async () => {
      setIsLoading(true);
      const [fetchedVendors, fetchedOrders] = await Promise.all([
        fetchAllVendors(),
        fetchAllOrders()
      ]);
      setAllVendors(fetchedVendors);
      setAllOrders(fetchedOrders);
      setIsLoading(false);
  }, [fetchAllVendors, fetchAllOrders]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const calculateVendorData = useCallback((vendor: Vendor) => {
    const deliveredOrders = allOrders.filter(order => order.status === 'Delivered' || order.status === 'Picked Up');
    let vendorFilteredCompletedOrders = deliveredOrders.filter(o => o.vendorUsername === vendor.username);
    
    if (dateRange?.from) {
        vendorFilteredCompletedOrders = vendorFilteredCompletedOrders.filter(order => {
            if (!order.createdAt) return false;
            const orderDate = new Date(order.createdAt);
            const fromDate = new Date(dateRange.from!);
            fromDate.setHours(0,0,0,0);
            const toDate = dateRange.to ? new Date(dateRange.to) : new Date(dateRange.from!);
            toDate.setHours(23,59,59,999);
            return orderDate >= fromDate && orderDate <= toDate;
        });
    }

    const revenue = vendorFilteredCompletedOrders.reduce((sum, order) => sum + order.totalPrice, 0);
    const orderCount = vendorFilteredCompletedOrders.length;
    const activeOrders = allOrders.filter(o => o.vendorUsername === vendor.username && activeStatuses.includes(o.status)).length;
    const avgOrderValue = orderCount > 0 ? revenue / orderCount : 0;
    const uniqueCustomers = new Set(vendorFilteredCompletedOrders.map(o => o.customerUsername)).size;

    const getDaysSinceOnboarded = (createdAt: string | undefined) => {
        if (!createdAt) return 'N/A';
        const onboardDate = new Date(createdAt);
        const days = differenceInDays(new Date(), onboardDate);
        if (days < 0) return 'Future';
        if (days === 0) return 'Today';
        if (days === 1) return '1 day ago';
        return `${days} days ago`;
    };

    const sevenDaysAgo = subDays(new Date(), 6);
    const today = new Date();
    const dateInterval = eachDayOfInterval({ start: sevenDaysAgo, end: today });
    const weeklyRevenueMap = new Map(dateInterval.map(d => [format(d, 'yyyy-MM-dd'), 0]));

    const vendorLast7DaysOrders = allOrders.filter(order => {
        if (order.vendorUsername !== vendor.username) return false;
        if (!(order.status === 'Delivered' || order.status === 'Picked Up')) return false;
        if (!order.createdAt) return false;
        const orderDate = parseISO(order.createdAt);
        return orderDate >= sevenDaysAgo && orderDate <= endOfDay(today);
    });

    vendorLast7DaysOrders.forEach(order => {
        const dateStr = format(parseISO(order.createdAt), 'yyyy-MM-dd');
        if (weeklyRevenueMap.has(dateStr)) {
            weeklyRevenueMap.set(dateStr, weeklyRevenueMap.get(dateStr)! + order.totalPrice);
        }
    });

    const weeklyRevenue = Array.from(weeklyRevenueMap.entries()).map(([date, total]) => ({
        date: format(parseISO(date), 'MMM d'),
        revenue: total,
        expenses: 0,
    }));

    return {
        revenue,
        orderCount,
        activeOrders,
        avgOrderValue,
        uniqueCustomers,
        onboardedSince: getDaysSinceOnboarded(vendor.createdAt),
        weeklyRevenue
    };
  }, [allOrders, dateRange]);
  
  const handleFetchData = useCallback((username: string) => {
      setFetchingFor(username);
      // Simulate fetch, but calculation is instant from existing data
      setTimeout(() => {
        const vendor = allVendors.find(v => v.username === username);
        if(vendor) {
            const data = calculateVendorData(vendor);
            setVendorRevenueData(prev => ({...prev, [username]: data}));
        }
        setFetchingFor(null);
      }, 500); // Small delay to show loading state
  }, [allVendors, calculateVendorData]);
  
  // Effect to recalculate data when date range changes for already fetched vendors
  useEffect(() => {
    setVendorRevenueData(currentData => {
        const newData = { ...currentData };
        Object.keys(newData).forEach(vendorUsername => {
            const vendor = allVendors.find(v => v.username === vendorUsername);
            if (vendor) {
                newData[vendorUsername] = calculateVendorData(vendor);
            }
        });
        return newData;
    });
  }, [dateRange, allVendors, calculateVendorData]);


  const totalRevenueAllVendors = useMemo(() => {
    return Object.values(vendorRevenueData).reduce((sum, data) => sum + (data?.revenue || 0), 0);
  }, [vendorRevenueData]);
  
  const totalOrdersCount = useMemo(() => {
    return Object.values(vendorRevenueData).reduce((sum, data) => sum + (data?.orderCount || 0), 0);
  }, [vendorRevenueData]);

  const handleExport = () => {
    const dataToExport = Object.entries(vendorRevenueData).map(([username, data]) => {
        const vendor = allVendors.find(v => v.username === username);
        if (!vendor || !data) return null;
        return {
          "Vendor Shop Name": vendor.shopName || vendor.name,
          "Total Revenue": data.revenue.toFixed(2),
          "Completed Orders": data.orderCount,
          "Active Orders": data.activeOrders,
          "Avg. Order Value": data.avgOrderValue.toFixed(2),
          "Unique Customers": data.uniqueCustomers,
        };
    }).filter(Boolean);

    if (dataToExport.length === 0) {
        return;
    }
    
    const headers = Object.keys(dataToExport[0]!);
    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + dataToExport.map(d => headers.map(header => (d as any)[header]).join(",")).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `vendor_revenue_report_${format(new Date(), 'yyyy-MM-dd')}.csv`);
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
  
  if (isLoading) {
    return (
        <div className="flex h-full w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    )
  }

  return (
    <div className="flex-1 space-y-8 p-8 pt-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
            <h2 className="text-3xl font-bold tracking-tight">Revenue Dashboard</h2>
            <CardDescription>
                Total Fetched Revenue: <span className="font-bold text-destructive">₹{totalRevenueAllVendors.toFixed(2)}</span> from {totalOrdersCount} orders.
            </CardDescription>
        </div>
        <div className="flex w-full sm:w-auto items-center gap-2">
            <Select value={filter} onValueChange={handleFilterChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select date range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="last7">Last 7 Days</SelectItem>
                <SelectItem value="thisMonth">This Month</SelectItem>
                <SelectItem value="thisYear">This Year</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={handleExport}
              className="w-auto text-white bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500 bg-[length:200%_auto] animate-gradient-move"
              disabled={Object.keys(vendorRevenueData).length === 0}
            >
                <Download className="mr-2 h-4 w-4"/>
                Export
            </Button>
        </div>
      </div>
      
      {allVendors.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {allVendors.map((vendor) => (
                <VendorRevenueCard
                    key={vendor.username}
                    vendor={vendor}
                    data={vendorRevenueData[vendor.username] || null}
                    onFetch={handleFetchData}
                    isFetching={fetchingFor === vendor.username}
                />
            ))}
       </div>
      ) : (
        <div className="text-center py-16">
            <p className="text-muted-foreground">No vendors found.</p>
        </div>
      )}
    </div>
  );
}
