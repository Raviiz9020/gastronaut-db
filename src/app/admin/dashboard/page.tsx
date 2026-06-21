
'use client';

import { useOrder } from '@/context/order-context';
import { useMenu } from '@/context/menu-context';
import { useDelivery } from '@/context/delivery-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Utensils, Package, Bike, IndianRupee, User, Crown, Building, Star, ExternalLink, Loader2, Users2, Clock, PieChart, Sparkles, Lightbulb, TrendingUp, AlertTriangle, FileSpreadsheet, Trophy, Award, LayoutList, ArrowUpDown, RefreshCw, TrendingDown, MessageSquare } from 'lucide-react';
import type { Order, OrderStatus, MenuItem, Vendor } from '@/types';
import Link from 'next/link';
import { useState, useEffect, useMemo, useTransition } from 'react';
import { useVendor } from '@/context/vendor-context';
import { useExpense } from '@/context/expense-context';
import { format, subDays, eachDayOfInterval, parseISO, getYear, getMonth } from 'date-fns';
import RevenueChart from './revenue-chart';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { generateGmbAuthUrl } from '@/ai/flows/handle-gbp-oauth';
import { getVendorInsights } from '@/ai/flows/get-vendor-insights';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import Image from 'next/image';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';


interface PopularItem {
    name: string;
    quantity: number;
    revenue: number;
    image?: string;
    blurDataUrl?: string;
}

interface TopCustomer {
    name: string;
    totalSpent: number;
    imageUrl?: string;
}

const GoogleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-5 w-5">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
        <path fill="none" d="M0 0h48v48H0z"></path>
    </svg>
);

const InsightIcon = ({ type }: { type: 'positive' | 'opportunity' | 'warning' }) => {
    switch (type) {
        case 'positive':
            return <TrendingUp className="h-5 w-5 text-green-500" />;
        case 'opportunity':
            return <Lightbulb className="h-5 w-5 text-yellow-500" />;
        case 'warning':
            return <AlertTriangle className="h-5 w-5 text-red-500" />;
        default:
            return <Sparkles className="h-5 w-5 text-primary" />;
    }
}


export default function AdminDashboardPage() {
  const { orders } = useOrder();
  const { expenses } = useExpense();
  const { menuItems: allMenuItems } = useMenu();
  const { deliveryTeam } = useDelivery();
  const { vendor, updateDetails } = useVendor();
  const { toast } = useToast();

  const [isFetchingStats, setIsFetchingStats] = useState(false);
  const [gmbStats, setGmbStats] = useState<{ metrics: any; reviews: any } | null>(null);
  const [vendorInsights, setVendorInsights] = useState<VendorInsightsOutput | null>(null);
  const [isFetchingInsights, startFetchingInsights] = useTransition();
  const [itemSortOrder, setItemSortOrder] = useState<'quantity' | 'revenue_asc' | 'revenue_desc'>('quantity');

  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');
  const [selectedMonth, setSelectedMonth] = useState<number | 'all'>('all');


  const handleGmbConnect = async () => {
    if (!vendor) return;
    try {
        const baseUrl = window.location.origin;
        const authUrl = await generateGmbAuthUrl({ vendorId: vendor.username, baseUrl });

        if (authUrl) {
            const width = 600, height = 700;
            const left = (screen.width - width) / 2;
            const top = (screen.height - height) / 2;
            window.open(authUrl, '_blank', `width=${width},height=${height},top=${top},left=${left},toolbar=no,location=no,status=no,menubar=no`);
        } else {
            toast({ title: "Could not generate auth URL", variant: "destructive" });
        }
    } catch (e: any) {
        console.error(e);
        toast({ title: "Error", description: "Could not connect to Google Business Profile.", variant: "destructive"});
    }
  };

  const handleFetchGmbStats = async () => {
    if (!vendor?.isGbpEnabled) return;
    setIsFetchingStats(true);
    setGmbStats(null);
    try {
        const getVendorBusinessStats = httpsCallable(functions, 'getVendorBusinessStats');
        const result: any = await getVendorBusinessStats({ period: "MONTH" });

        if (result.data) {
            const metricsResult = result.data.metrics;
            const reviewsData = result.data.reviews;
            
            const sumMetric = (arr: { value?: string }[]) => arr.reduce((sum, day) => sum + Number(day.value || 0), 0);

            const totals = {
                maps: sumMetric(metricsResult.desktopMaps || []) + sumMetric(metricsResult.mobileMaps || []),
                websiteClicks: sumMetric(metricsResult.websiteClicks || []),
                callClicks: sumMetric(metricsResult.callClicks || []),
                directionRequests: sumMetric(metricsResult.directionRequests || []),
            };

            setGmbStats({
                metrics: totals,
                reviews: reviewsData,
            });
        } else {
            toast({ title: "No Data", description: "No metrics or reviews data was returned from Google."});
        }
    } catch (err: any) {
        console.error("Error fetching GBP stats via callable:", err);
        if (err.code === 'failed-precondition') {
            toast({
                title: "GBP Error",
                description: "Google Business Profile not connected.",
                variant: "destructive"
            });
        } else {
             toast({
                title: "GBP Error",
                description: "Unable to fetch GBP stats. Please try again.",
                variant: "destructive"
            });
        }
    } finally {
        setIsFetchingStats(false);
    }
  };


  const vendorMenuItems = useMemo(() => {
    if (!vendor) return [];
    return allMenuItems.filter(item => item.vendorUsername === vendor.username);
  }, [allMenuItems, vendor]);

  const vendorOrders = useMemo(() => {
    if (!vendor) return [];
    return orders.filter(order => order.vendorUsername === vendor.username);
  }, [orders, vendor]);
  
  const allCompletedOrders = useMemo(() => {
    return vendorOrders.filter(order => order.status === 'Delivered' || order.status === 'Picked Up');
  }, [vendorOrders]);

  const activeStatuses: OrderStatus[] = ['Order Placed', 'Processing', 'Out for Delivery', 'Accepted', 'Order Ready'];
  
  const pendingOrdersCount = vendorOrders.filter(order => activeStatuses.includes(order.status)).length;
  
  const totalRevenue = allCompletedOrders.reduce((sum, order) => sum + order.totalPrice, 0);
  const totalOrders = vendorOrders.length;
  
  const availableYears = useMemo(() => {
    if (allCompletedOrders.length === 0) return [];
    const years = new Set(allCompletedOrders.map(order => getYear(parseISO(order.createdAt))));
    return Array.from(years).sort((a,b) => b - a);
  }, [allCompletedOrders]);
  
  const { 
    weeklyChartData,
    popularItemsData,
    topCustomers, 
    averageOrderValue,
    peakHours,
    orderTypeBreakdown,
    customerStats,
    last7DaysExpenses,
    categoryStats,
  } = useMemo(() => {
    
    let filteredCompletedOrders = allCompletedOrders;
    if (selectedYear !== 'all') {
        filteredCompletedOrders = filteredCompletedOrders.filter(order => getYear(parseISO(order.createdAt)) === selectedYear);
        if (selectedMonth !== 'all') {
            filteredCompletedOrders = filteredCompletedOrders.filter(order => getMonth(parseISO(order.createdAt)) === selectedMonth);
        }
    }

    // Date Range for weekly chart
    const sevenDaysAgo = subDays(new Date(), 6);
    const dateRange = eachDayOfInterval({
        start: sevenDaysAgo,
        end: new Date(),
    });

    const chartData = dateRange.map(date => ({
        date: format(date, 'MMM d'),
        revenue: 0,
        expenses: 0,
    }));

    allCompletedOrders.forEach(order => {
        const orderDate = parseISO(order.createdAt);
        if (orderDate >= sevenDaysAgo) {
            const dateStr = format(orderDate, 'MMM d');
            const dayData = chartData.find(d => d.date === dateStr);
            if (dayData) {
                dayData.revenue += order.totalPrice;
            }
        }
    });

    // Last 7 days expenses
    const calculatedLast7DaysExpenses = expenses
        .filter(exp => parseISO(exp.date) >= sevenDaysAgo)
        .reduce((sum, exp) => sum + exp.amount, 0);
        
    // Daily Expenses
    expenses.forEach(expense => {
        const expenseDate = parseISO(expense.date);
        if (expenseDate >= sevenDaysAgo) {
            const dateStr = format(expenseDate, 'MMM d');
            const dayData = chartData.find(d => d.date === dateStr);
            if (dayData) {
                dayData.expenses += expense.amount;
            }
        }
    });

    // Popular Items & Categories from filtered orders
    const itemStats: Record<string, { quantity: number; revenue: number; image?: string; blurDataUrl?: string; }> = {};
    const categoryRevenue: Record<string, number> = {};
    const categoryQuantity: Record<string, number> = {};
    filteredCompletedOrders.forEach(order => {
        order.items.forEach(item => {
            const price = item.discountPrice && item.discountPrice > 0 ? item.discountPrice : item.price;
            const itemRevenue = price * item.quantity;
            
            if (!itemStats[item.name]) {
              itemStats[item.name] = { quantity: 0, revenue: 0, image: item.image, blurDataUrl: item.blurDataUrl };
            }
            itemStats[item.name].quantity += item.quantity;
            itemStats[item.name].revenue += itemRevenue;

            if (item.category) {
              categoryRevenue[item.category] = (categoryRevenue[item.category] || 0) + itemRevenue;
              categoryQuantity[item.category] = (categoryQuantity[item.category] || 0) + item.quantity;
            }
        });
    });

    const itemsData: PopularItem[] = Object.entries(itemStats)
        .map(([name, stats]) => ({ name, ...stats }));
    
    const sortedCategoryStats = Object.entries(categoryRevenue)
        .map(([name, revenue]) => ({ name, revenue, quantity: categoryQuantity[name] || 0 }))
        .sort((a,b) => b.revenue - a.revenue);


    // Top Customers from filtered orders
    const customerSpending: Record<string, { totalSpent: number, imageUrl?: string }> = {};
    filteredCompletedOrders.forEach(order => {
        if(order.deliveryOption === 'Dine-In') return; // Exclude dine-in from top customers
        
        const customerName = order.customer.name;
        if (!customerSpending[customerName]) {
            customerSpending[customerName] = { totalSpent: 0, imageUrl: (order.customer as any).imageUrl };
        }
        customerSpending[customerName].totalSpent += order.totalPrice;
    });

    const sortedTopCustomers: TopCustomer[] = Object.entries(customerSpending)
        .map(([name, data]) => ({ name, totalSpent: data.totalSpent, imageUrl: data.imageUrl }))
        .sort((a,b) => b.totalSpent - a.totalSpent)
        .slice(0, 10);

    // Average Order Value (use all-time)
    const avgOrderValue = allCompletedOrders.length > 0 ? totalRevenue / allCompletedOrders.length : 0;

    // Peak Hours (use all-time)
    const hourlyOrders: Record<number, number> = {};
    vendorOrders.forEach(order => {
        const hour = parseISO(order.createdAt).getHours();
        hourlyOrders[hour] = (hourlyOrders[hour] || 0) + 1;
    });

    const filteredPeakHours = Object.entries(hourlyOrders)
        .map(([hour, orders]) => ({ hour: `${hour}`, orders }))
        .filter(item => item.orders > 0)
        .sort((a,b) => parseInt(a.hour) - parseInt(b.hour));

    // Order Type Breakdown (use all-time)
    const breakdown = { 'Home Delivery': 0, 'Self Pickup': 0, 'Dine-In': 0 };
    vendorOrders.forEach(order => {
        breakdown[order.deliveryOption] = (breakdown[order.deliveryOption] || 0) + 1;
    });
    const orderTypes = Object.entries(breakdown).map(([name, value]) => ({ name, value }));

    // Customer Stats (use all-time)
    const customerUsernames = new Set(vendorOrders.map(o => o.customerUsername));
    const firstOrderDates = new Map<string, Date>();
    vendorOrders.forEach(o => {
        if (!firstOrderDates.has(o.customerUsername)) {
            firstOrderDates.set(o.customerUsername, parseISO(o.createdAt));
        }
    });

    const thirtyDaysAgo = subDays(new Date(), 30);
    const newCustomers = Array.from(firstOrderDates.entries())
        .filter(([_, date]) => date >= thirtyDaysAgo)
        .length;

    return { 
        weeklyChartData: chartData,
        popularItemsData: itemsData,
        topCustomers: sortedTopCustomers,
        averageOrderValue: avgOrderValue,
        peakHours: filteredPeakHours,
        orderTypeBreakdown: orderTypes,
        customerStats: {
            total: customerUsernames.size,
            new: newCustomers
        },
        last7DaysExpenses: calculatedLast7DaysExpenses,
        categoryStats: sortedCategoryStats,
    };

  }, [allCompletedOrders, vendorOrders, totalRevenue, expenses, selectedYear, selectedMonth]);
  
   const fiveStarReviews = useMemo(() => {
    if (!gmbStats?.reviews?.reviewList) return [];
    return gmbStats.reviews.reviewList
      .filter((r: any) => r.starRating === "FIVE")
      .sort((a: any, b: any) => new Date(b.createTime).getTime() - new Date(a.createTime).getTime())
      .slice(0, 5);
  }, [gmbStats]);


  const sortedPopularItems = useMemo(() => {
    switch (itemSortOrder) {
      case 'revenue_asc':
        return [...popularItemsData].sort((a, b) => a.revenue - b.revenue);
      case 'revenue_desc':
        return [...popularItemsData].sort((a, b) => b.revenue - a.revenue);
      case 'quantity':
      default:
        return [...popularItemsData].sort((a, b) => b.quantity - a.quantity);
    }
  }, [popularItemsData, itemSortOrder]);

  const cycleItemSortOrder = () => {
    setItemSortOrder(current => {
      if (current === 'quantity') return 'revenue_desc';
      if (current === 'revenue_desc') return 'revenue_asc';
      return 'quantity';
    });
  };

  const handleGenerateInsights = () => {
    startFetchingInsights(async () => {
        if (vendorOrders.length > 0 || last7DaysExpenses > 0) {
            const dashboardData = {
                totalRevenue,
                totalOrders,
                pendingOrdersCount,
                averageOrderValue,
                popularItems: sortedPopularItems.map(p => ({name: p.name, quantity: p.quantity})),
                topCustomers,
                orderTypeBreakdown,
                customerStats,
                peakHours,
                last7DaysExpenses,
            };
            try {
                const insights = await getVendorInsights(dashboardData);
                setVendorInsights(insights);
            } catch (err) {
                console.error("Error fetching vendor insights:", err);
                toast({ title: "Error", description: "Could not generate insights.", variant: "destructive" });
                setVendorInsights(null);
            }
        } else {
             toast({ title: "Not Enough Data", description: "Generate some orders or expenses to get insights." });
        }
    });
  }
  
  const getPodiumClass = (index: number) => {
    switch (index) {
        case 0: return "bg-amber-100 dark:bg-amber-900/50 border-amber-300";
        case 1: return "bg-slate-100 dark:bg-slate-800/50 border-slate-300";
        case 2: return "bg-orange-100 dark:bg-orange-900/50 border-orange-300";
        default: return "";
    }
  };

  const getPodiumIcon = (index: number) => {
    switch (index) {
        case 0: return <Crown className="h-5 w-5 text-amber-500" />;
        case 1: return <Trophy className="h-5 w-5 text-slate-500" />;
        case 2: return <Award className="h-5 w-5 text-orange-500" />;
        default: return null;
    }
  };
  
  const handleYearChange = (yearStr: string) => {
    const year = yearStr === 'all' ? 'all' : parseInt(yearStr);
    setSelectedYear(year);
    if (year === 'all') {
        setSelectedMonth('all');
    }
  };
  
  const renderPercentChange = (change: number) => {
    if (change > 0) {
      return (
        <p className="text-xs flex items-center text-green-600">
          <TrendingUp className="h-4 w-4 mr-1" /> +{change.toFixed(1)}%
        </p>
      );
    } else if (change < 0) {
      return (
        <p className="text-xs flex items-center text-destructive">
          <TrendingDown className="h-4 w-4 mr-1" /> {change.toFixed(1)}%
        </p>
      );
    }
    return <p className="text-xs text-muted-foreground">--</p>;
  };


  return (
    <>
    <div className="flex-1 space-y-8 p-8 pt-6">
       <div className="flex items-center justify-between">
            <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">Dashboard
            </h2>
             {vendor && vendor.isGbpEnabled && (
                <Button variant="outline" onClick={handleGmbConnect} className={vendor.gmbAuth ? 'text-green-500 border-green-500 h-8 px-2 hover:bg-green-500/10' : 'h-8 px-2'}>
                    <GoogleIcon />
                    <span className="ml-2 text-xs">{vendor.gmbAuth ? 'GBP Connected' : 'Connect GBP'}</span>
                </Button>
            )}
       </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <Card className="rounded-3xl xl:col-span-1">
                <Link href="/admin/dashboard/revenue" className="h-full">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                        <IndianRupee className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₹{totalRevenue.toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground">From {allCompletedOrders.length} completed orders</p>
                    </CardContent>
                </Link>
            </Card>

            {vendor?.isExpenseTrackingEnabled && (
                <Card className="rounded-3xl xl:col-span-1">
                    <Link href="/admin/dashboard/expenses" className="h-full">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Last 7 Days Expense</CardTitle>
                            <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">₹{last7DaysExpenses.toFixed(2)}</div>
                            <p className="text-xs text-muted-foreground">Total recorded expenses</p>
                        </CardContent>
                    </Link>
                </Card>
            )}

            <Card className="rounded-3xl xl:col-span-1">
                <Link href="/admin/dashboard/orders" className="h-full">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalOrders}</div>
                        <p className="text-xs text-muted-foreground">{pendingOrdersCount} pending</p>
                    </CardContent>
                </Link>
            </Card>

            <Card className="rounded-3xl xl:col-span-1">
                <Link href="/admin/dashboard/menu" className="h-full">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Menu Items</CardTitle>
                        <Utensils className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{vendorMenuItems.length}</div>
                        <p className="text-xs text-muted-foreground">Available for order</p>
                    </CardContent>
                </Link>
            </Card>

            <Card className="rounded-3xl xl:col-span-1">
                 <Link href="/admin/dashboard/delivery" className="h-full">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Delivery Team Size</CardTitle>
                        <Bike className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{deliveryTeam.length}</div>
                        <p className="text-xs text-muted-foreground">Active delivery personnel</p>
                    </CardContent>
                </Link>
            </Card>

            <Card className="rounded-3xl xl:col-span-1">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Average Order Value</CardTitle>
                    <IndianRupee className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">₹{averageOrderValue.toFixed(2)}</div>
                    <p className="text-xs text-muted-foreground">Per completed order</p>
                </CardContent>
            </Card>

            <Card className="rounded-3xl lg:col-span-2 xl:col-span-3">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><PieChart className="h-4 w-4"/>Order Type Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                    {orderTypeBreakdown.map(type => (
                        <div key={type.name} className="flex justify-between items-center">
                            <span>{type.name}</span>
                            <span className="font-semibold text-foreground">{type.value} orders</span>
                        </div>
                    ))}
                </CardContent>
            </Card>
            
            {vendor?.isAiAssistantEnabled && (
                <Card className="lg:col-span-2 xl:col-span-3 rounded-3xl flex flex-col">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary"/>AI Vendor Assistant</CardTitle>
                        <CardDescription>Personalized tips to grow your business.</CardDescription>
                        <div className="pt-2">
                            <Button onClick={handleGenerateInsights} disabled={isFetchingInsights} size="sm">
                                {isFetchingInsights ? <Loader2 className="h-4 w-4 animate-spin"/> : "Insights"}
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col justify-center">
                        {isFetchingInsights ? (
                            <div className="flex items-center justify-center h-full">
                                <Loader2 className="h-6 w-6 animate-spin"/>
                            </div>
                        ) : vendorInsights ? (
                            <div className="space-y-4">
                                {vendorInsights.insights.map((insight, index) => (
                                    <div key={index} className="flex items-start gap-3">
                                        <div className="mt-1">
                                            <InsightIcon type={insight.type}/>
                                        </div>
                                        <p className="text-sm text-muted-foreground">{insight.message}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center text-sm text-muted-foreground">
                                Click "Insights" to get personalized tips for your business.
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
            
            <div className="col-span-1 md:col-span-2 lg:col-span-3 xl:col-span-6 grid grid-cols-1 xl:grid-cols-2 gap-4">
                {vendor?.isExpenseTrackingEnabled ? (
                    <Card className="rounded-3xl h-full">
                        <CardHeader>
                            <CardTitle>Last 7 Days Performance</CardTitle>
                        </CardHeader>
                        <CardContent className="pl-2 h-[250px]">
                            <RevenueChart data={weeklyChartData}/>
                        </CardContent>
                    </Card>
                ) : (
                    <Card className="rounded-3xl h-full">
                        <CardHeader>
                            <CardTitle>Last 7 Days Revenue</CardTitle>
                        </CardHeader>
                        <CardContent className="pl-2 h-[250px]">
                            <RevenueChart data={weeklyChartData.map(d => ({ date: d.date, revenue: d.revenue, expenses: 0 }))}/>
                        </CardContent>
                    </Card>
                )}

                <Card className="rounded-3xl h-full">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Clock className="h-4 w-4"/>Peak Order Hours</CardTitle>
                    </CardHeader>
                    <CardContent className="pl-2 h-[250px]">
                        <RevenueChart data={peakHours} />
                    </CardContent>
                </Card>
            </div>
            
             <div className="col-span-1 md:col-span-2 lg:col-span-3 xl:col-span-6">
                <div className="flex flex-col sm:flex-row gap-4 items-center mb-4 p-4 bg-muted/50 rounded-2xl">
                    <h3 className="text-lg font-semibold shrink-0">Filtered Sales Data</h3>
                    <div className="flex-1 grid grid-cols-2 gap-4">
                        <Select onValueChange={handleYearChange} value={String(selectedYear)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Year" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Time</SelectItem>
                            {availableYears.map(year => (
                              <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select onValueChange={(month) => setSelectedMonth(month === 'all' ? 'all' : parseInt(month))} value={String(selectedMonth)} disabled={selectedYear === 'all'}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Month" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Months</SelectItem>
                            {Array.from({length: 12}).map((_, i) => (
                               <SelectItem key={i} value={String(i)}>{format(new Date(2000, i), 'MMMM')}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            <div className="col-span-1 md:col-span-2 lg:col-span-3 xl:col-span-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
                 <Card className="rounded-3xl">
                    <CardHeader>
                        <div className="flex justify-between items-center">
                             <CardTitle>Top Selling Items</CardTitle>
                             <Button variant="ghost" size="icon" onClick={cycleItemSortOrder}>
                                <ArrowUpDown className="h-4 w-4" />
                             </Button>
                        </div>
                        <CardDescription>By {itemSortOrder.startsWith('revenue') ? 'revenue' : 'quantity sold'}.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-96 w-full">
                            <div className="flex flex-col gap-4">
                                {sortedPopularItems.map((item, index) => (
                                    <div key={item.name} className={cn("flex items-center gap-3 p-2 rounded-2xl", index < 3 && itemSortOrder === 'quantity' && getPodiumClass(index))}>
                                         <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                                            {item.image && <Image src={item.image} alt={item.name} fill className="object-cover" placeholder={item.blurDataUrl ? 'blur' : 'empty'} blurDataURL={item.blurDataUrl} />}
                                        </div>
                                        <div className="flex-1 overflow-hidden">
                                            <p className="font-semibold truncate">{item.name}</p>
                                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-muted-foreground">
                                                <span>Qty: {item.quantity}</span>
                                                <span className="font-medium text-foreground">₹{item.revenue.toFixed(0)}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                         {sortedPopularItems.length === 0 && <p className="text-sm text-center text-muted-foreground">No completed orders with items yet.</p>}
                    </CardContent>
                </Card>

                <Card className="rounded-3xl">
                    <CardHeader>
                        <CardTitle>Top Selling Categories</CardTitle>
                        <CardDescription>By revenue.</CardDescription>
                    </CardHeader>
                     <CardContent>
                         <ScrollArea className="h-96 w-full">
                            <div className="flex flex-col gap-4">
                                {categoryStats.map((item, index) => (
                                    <div key={item.name} className={cn("flex items-center gap-3 p-2 rounded-2xl", index < 3 && getPodiumClass(index))}>
                                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                                            {getPodiumIcon(index) || <LayoutList className="h-6 w-6 text-muted-foreground"/>}
                                        </div>
                                        <div className="flex-1 overflow-hidden">
                                            <p className="font-semibold truncate">{item.name}</p>
                                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-muted-foreground">
                                                <span>Qty: {item.quantity}</span>
                                                <span className="font-medium text-foreground">₹{item.revenue.toFixed(0)}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                         {categoryStats.length === 0 && <p className="text-sm text-center text-muted-foreground">No category data yet.</p>}
                    </CardContent>
                </Card>

                 <Card className="rounded-3xl">
                    <CardHeader>
                        <CardTitle>Top Customers</CardTitle>
                        <CardDescription>By total amount spent.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <ScrollArea className="h-96 w-full">
                            <div className="flex flex-col gap-4">
                                {topCustomers.map((customer, index) => (
                                     <div key={customer.name} className={cn("flex items-center gap-3 p-2 rounded-2xl", index < 3 && getPodiumClass(index))}>
                                        <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0 bg-muted">
                                            {customer.imageUrl ? <Image src={customer.imageUrl} alt={customer.name} fill className="object-cover" /> : <User className="w-8 h-8 text-muted-foreground m-2"/>}
                                        </div>
                                        <div className="flex-1 overflow-hidden">
                                            <p className="font-semibold truncate">{customer.name}</p>
                                            <p className="font-medium text-foreground">₹{customer.totalSpent.toFixed(2)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                        {topCustomers.length === 0 && <p className="text-sm text-center text-muted-foreground">No customer purchase data yet.</p>}
                    </CardContent>
                </Card>
            </div>
        </div>

        {vendor?.gmbLocationId && vendor.isGbpEnabled && (
            <div className="mt-8">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold tracking-tight flex items-center gap-2">
                        <GoogleIcon />
                        Google Business Profile
                    </h3>
                    <Button onClick={handleFetchGmbStats} variant="outline" size="sm" disabled={isFetchingStats}>
                        {isFetchingStats ? <Loader2 className="h-4 w-4 animate-spin"/> : <RefreshCw className="h-4 w-4"/>}
                    </Button>
                </div>
                 <Card className="rounded-3xl">
                    <CardHeader>
                        <CardTitle>Google Business Metrics</CardTitle>
                        <CardDescription>Key metrics from your Google Business Profile for the last month.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isFetchingStats ? (
                            <div className="flex justify-center items-center h-48">
                                <Loader2 className="h-8 w-8 animate-spin" />
                            </div>
                        ) : gmbStats ? (
                             <div className="space-y-6">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Maps Views</p>
                                        <p className="text-xl font-bold">{gmbStats.metrics.maps}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Website Clicks</p>
                                        <p className="text-xl font-bold">{gmbStats.metrics.websiteClicks}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Calls</p>
                                        <p className="text-xl font-bold">{gmbStats.metrics.callClicks}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Directions</p>
                                        <p className="text-xl font-bold">{gmbStats.metrics.directionRequests}</p>
                                    </div>
                                </div>
                                
                                {gmbStats.reviews && (
                                    <>
                                    <Separator/>
                                    <div className="space-y-2">
                                         <h4 className="font-semibold">Reviews Summary</h4>
                                         <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                             <div>
                                                <p className="text-sm text-muted-foreground">Avg Rating</p>
                                                <p className="text-xl font-bold flex items-center gap-1">
                                                   <Star className="h-5 w-5 text-amber-400 fill-amber-400"/>
                                                   {gmbStats.reviews.averageRating.toFixed(1)}
                                                </p>
                                            </div>
                                             <div>
                                                <p className="text-sm text-muted-foreground">Total Reviews</p>
                                                <p className="text-xl font-bold">{gmbStats.reviews.totalReviewCount}</p>
                                            </div>
                                             <div>
                                                <p className="text-sm text-muted-foreground">New This Month</p>
                                                <p className="text-xl font-bold">+{gmbStats.reviews.currentMonthCount}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-muted-foreground">vs Last Month</p>
                                                <div className="text-xl font-bold">{renderPercentChange(gmbStats.reviews.percentChange)}</div>
                                            </div>
                                         </div>
                                    </div>
                                    </>
                                )}
                             </div>
                        ) : (
                            <div className="text-center text-sm text-muted-foreground p-4 bg-muted/50 rounded-lg">
                                Click the refresh button to fetch your Google Business Profile stats.
                            </div>
                        )}
                    </CardContent>
                </Card>

                 {fiveStarReviews.length > 0 && (
                  <Card className="rounded-3xl mt-4">
                    <CardHeader>
                      <CardTitle>Latest 5-Star Reviews</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {fiveStarReviews.map((review: any) => (
                          <div key={review.reviewId} className="flex items-start gap-4">
                            <Avatar>
                              <AvatarImage src={review.reviewer.profilePhotoUrl} alt={review.reviewer.displayName} />
                              <AvatarFallback>{review.reviewer.displayName.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <p className="font-semibold">{review.reviewer.displayName}</p>
                                <p className="text-xs text-muted-foreground">{format(new Date(review.createTime), 'dd MMM yyyy')}</p>
                              </div>
                              <div className="flex items-center gap-0.5">
                                {[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 text-amber-400 fill-amber-400"/>)}
                              </div>
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-3">
                                {review.comment || "No comment provided."}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

            </div>
        )}
    </div>
    </>
  );
}

    