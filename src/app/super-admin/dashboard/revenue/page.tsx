'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useOrder } from '@/context/order-context';
import { useVendor } from '@/context/vendor-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  Download,
  Loader2,
  IndianRupee,
  Package,
  BarChart2,
  Users,
  Calendar as CalendarIcon,
  RefreshCw,
  Search,
  Store,
  UtensilsCrossed,
  Bike,
  ShoppingBag,
  Percent,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowUpRight,
  ChevronRight,
  TrendingUp,
  Layers,
  SlidersHorizontal,
  Table as TableIcon,
  Phone,
  MapPin,
  Receipt,
  X
} from 'lucide-react';
import {
  format,
  subDays,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  eachDayOfInterval,
  parseISO,
  differenceInDays,
  endOfDay,
  startOfDay
} from 'date-fns';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import type { Vendor, Order, OrderStatus } from '@/types';
import { VendorStatus } from '@/types';
import { VendorStatusManager } from '@/lib/vendorStatusManager';
import RevenueChart from '@/app/admin/dashboard/revenue-chart';
import CommissionConfigDialog from '../commission-config-dialog';
import { useToast } from '@/hooks/use-toast';

const activeStatuses: OrderStatus[] = [
  'Order Placed',
  'Processing',
  'Out for Delivery',
  'Accepted',
  'Order Ready',
];

const formatTableDisplay = (tableId?: string, customerName?: string) => {
  const val = (tableId || customerName || '').trim();
  if (!val) return 'Dine-In';
  if (val.toLowerCase().startsWith('take away')) return 'Take Away';
  if (val.toLowerCase().startsWith('table')) return val;
  return `Table ${val}`;
};

interface VendorFinancialMetrics {
  vendor: Vendor;
  // Gross Volume
  grossRevenue: number;
  completedOrdersCount: number;
  activeOrdersCount: number;

  // Channel Breakdown
  dineInRevenue: number;
  dineInCount: number;
  dineInOrders: Order[];
  deliveryRevenue: number;
  deliveryCount: number;
  deliveryOrders: Order[];
  pickupRevenue: number;
  pickupCount: number;
  pickupOrders: Order[];

  // HyperDelivery Platform Share (Home Delivery & Pickup ONLY)
  commissionRate: number;
  commissionEarned: number;
  platformFeesEarned: number; // ₹5 on Delivery & Pickup orders
  totalPlatformCut: number; // commissionEarned + platformFeesEarned

  // Vendor Net Earnings (Food sales minus commission)
  vendorNetEarnings: number;

  // Key Ratios
  avgOrderValue: number;
  dineInAov: number;
  deliveryAov: number;
  uniqueCustomers: number;
  onboardedSince: string;
  weeklyRevenue: { date: string; revenue: number; expenses: number }[];

  // Top Items sold by this vendor
  topDishes: { name: string; quantity: number; revenue: number }[];
  recentOrders: Order[];
}

export default function SuperAdminRevenuePage() {
  const { fetchAllOrders, orders: contextOrders } = useOrder();
  const { fetchAllVendors, toggleVendorCommission, allVendors: contextVendors } = useVendor();
  const { toast } = useToast();

  const [allOrders, setAllOrders] = useState<Order[]>(contextOrders || []);
  const [allVendors, setAllVendors] = useState<Vendor[]>(contextVendors || []);
  const [isLoading, setIsLoading] = useState<boolean>(() => !contextVendors || contextVendors.length === 0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPreset, setFilterPreset] = useState<'today' | 'yesterday' | 'thisWeek' | 'last7' | 'thisMonth' | 'lastMonth' | 'all' | 'custom'>('thisMonth');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const now = new Date();
    return { from: startOfMonth(now), to: endOfMonth(now) };
  });
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'revenue' | 'platformCut' | 'orders' | 'dineIn'>('revenue');

  // Vendor Drill-Down Dialog
  const [selectedVendorDetail, setSelectedVendorDetail] = useState<VendorFinancialMetrics | null>(null);

  // Channel Orders Inspection Dialog State
  const [channelInspection, setChannelInspection] = useState<{
    vendor: Vendor;
    channel: 'Dine-In' | 'Home Delivery' | 'Self Pickup';
    orders: Order[];
    totalRevenue: number;
  } | null>(null);

  const [channelOrderSearch, setChannelOrderSearch] = useState('');

  // Quick Commission Edit Dialog
  const [commissionVendor, setCommissionVendor] = useState<Vendor | null>(null);
  const [isCommissionDialogOpen, setIsCommissionDialogOpen] = useState(false);

  // Sync from context cache immediately if available
  useEffect(() => {
    if (contextVendors && contextVendors.length > 0 && allVendors.length === 0) {
      setAllVendors(contextVendors);
      setIsLoading(false);
    }
  }, [contextVendors, allVendors.length]);

  useEffect(() => {
    if (contextOrders && contextOrders.length > 0 && allOrders.length === 0) {
      setAllOrders(contextOrders);
    }
  }, [contextOrders, allOrders.length]);

  // Load latest data once on mount, preventing render loops
  const hasLoadedOnceRef = useRef(false);

  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent && allVendors.length === 0) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const [fetchedVendors, fetchedOrders] = await Promise.all([
        fetchAllVendors(),
        fetchAllOrders(),
      ]);
      if (Array.isArray(fetchedVendors) && fetchedVendors.length > 0) {
        setAllVendors(fetchedVendors);
      }
      if (Array.isArray(fetchedOrders)) {
        setAllOrders(fetchedOrders);
      }
      setLastRefreshedAt(new Date());
    } catch (err) {
      console.error('Error fetching data for revenue dashboard:', err);
      toast({
        title: 'Sync Failed',
        description: 'Could not refresh orders and vendors.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [fetchAllVendors, fetchAllOrders, allVendors.length, toast]);

  useEffect(() => {
    if (hasLoadedOnceRef.current) return;
    hasLoadedOnceRef.current = true;
    loadData(allVendors.length > 0);
  }, [loadData, allVendors.length]);

  // Handle Preset Changes
  const handleFilterPresetChange = (preset: 'today' | 'yesterday' | 'thisWeek' | 'last7' | 'thisMonth' | 'lastMonth' | 'all' | 'custom') => {
    setFilterPreset(preset);
    const now = new Date();

    switch (preset) {
      case 'today':
        setDateRange({ from: startOfDay(now), to: endOfDay(now) });
        break;
      case 'yesterday': {
        const y = subDays(now, 1);
        setDateRange({ from: startOfDay(y), to: endOfDay(y) });
        break;
      }
      case 'thisWeek': {
        const day = now.getDay();
        const diffToMonday = (day === 0 ? -6 : 1) - day;
        const monday = new Date(now);
        monday.setDate(now.getDate() + diffToMonday);
        setDateRange({ from: startOfDay(monday), to: endOfDay(now) });
        break;
      }
      case 'last7':
        setDateRange({ from: startOfDay(subDays(now, 6)), to: endOfDay(now) });
        break;
      case 'thisMonth':
        setDateRange({ from: startOfMonth(now), to: endOfMonth(now) });
        break;
      case 'lastMonth': {
        const prevMonth = subDays(startOfMonth(now), 1);
        setDateRange({ from: startOfMonth(prevMonth), to: endOfMonth(prevMonth) });
        break;
      }
      case 'all':
        setDateRange(undefined);
        break;
      case 'custom':
        setIsCalendarOpen(true);
        break;
    }
  };

  // Helper: check if order falls inside active date range
  const isOrderInDateRange = useCallback((createdAtStr?: string) => {
    if (!dateRange?.from) return true;
    if (!createdAtStr) return false;
    const orderDate = new Date(createdAtStr);
    const fromDate = startOfDay(new Date(dateRange.from));
    const toDate = dateRange.to ? endOfDay(new Date(dateRange.to)) : endOfDay(new Date(dateRange.from));
    return orderDate >= fromDate && orderDate <= toDate;
  }, [dateRange]);

  // Calculate Comprehensive Metrics for a Vendor
  const computeVendorMetrics = useCallback((vendor: Vendor): VendorFinancialMetrics => {
    const vendorAllOrders = allOrders.filter(o => o.vendorUsername === vendor.username);

    // Completed orders within the date range
    const completedOrders = vendorAllOrders.filter(o => {
      const isCompleted = o.status === 'Delivered' || o.status === 'Picked Up';
      return isCompleted && isOrderInDateRange(o.createdAt);
    });

    // Currently active orders (live right now, regardless of date range)
    const activeOrders = vendorAllOrders.filter(o => activeStatuses.includes(o.status));

    // Commission percentage configured on vendor profile
    const commissionRate = vendor.commissionPercentage !== undefined
      ? Number(vendor.commissionPercentage)
      : (vendor.isCommissionOn ? 10 : 0);

    let grossRevenue = 0;
    let dineInRevenue = 0;
    let dineInCount = 0;
    let deliveryRevenue = 0;
    let deliveryCount = 0;
    let pickupRevenue = 0;
    let pickupCount = 0;
    let commissionEarned = 0;
    let platformFeesEarned = 0;

    const dineInOrders: Order[] = [];
    const deliveryOrders: Order[] = [];
    const pickupOrders: Order[] = [];

    const dishSalesMap = new Map<string, { quantity: number; revenue: number }>();
    const customerUsernames = new Set<string>();

    completedOrders.forEach(order => {
      const orderAmount = Number(order.totalPrice || order.subtotal || 0);
      grossRevenue += orderAmount;
      if (order.customerUsername) customerUsernames.add(order.customerUsername);

      const isDineIn = order.deliveryOption === 'Dine-In' || Boolean(order.tableId);
      const isPickup = order.deliveryOption === 'Self Pickup';
      const isDelivery = order.deliveryOption === 'Home Delivery' || (!isDineIn && !isPickup);

      // Track items sold
      if (Array.isArray(order.items)) {
        order.items.forEach(item => {
          const name = item.name || 'Custom Item';
          const qty = Number(item.quantity) || 1;
          const itemPrice = Number(item.price) || 0;
          const current = dishSalesMap.get(name) || { quantity: 0, revenue: 0 };
          dishSalesMap.set(name, {
            quantity: current.quantity + qty,
            revenue: current.revenue + (itemPrice * qty),
          });
        });
      }

      if (isDineIn) {
        // DINE IN: 0% in-app commission, ₹0 platform fee (Verbal offline arrangement)
        dineInRevenue += orderAmount;
        dineInCount += 1;
        dineInOrders.push(order);
      } else {
        // ONLINE ORDERS: Home Delivery & Self Pickup
        if (isPickup) {
          pickupRevenue += orderAmount;
          pickupCount += 1;
          pickupOrders.push(order);
        } else {
          deliveryRevenue += orderAmount;
          deliveryCount += 1;
          deliveryOrders.push(order);
        }

        // ₹5 Platform Fee on Home Delivery & Self Pickup
        const fee = order.platformFee !== undefined ? Number(order.platformFee) : 5.0;
        platformFeesEarned += fee;

        // Vendor-specific % Commission on Food Subtotal
        if (order.commissionAmount !== undefined && order.commissionAmount > 0) {
          commissionEarned += Number(order.commissionAmount);
        } else if (commissionRate > 0) {
          const foodBase = Math.max(0, (order.subtotal || orderAmount) - (order.discountAmount || 0));
          const calculatedCommission = Number(((foodBase * commissionRate) / 100).toFixed(2));
          commissionEarned += calculatedCommission;
        }
      }
    });

    // Sort order lists by time descending
    dineInOrders.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    deliveryOrders.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    pickupOrders.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

    const totalPlatformCut = Number((commissionEarned + platformFeesEarned).toFixed(2));
    const vendorNetEarnings = Number((grossRevenue - commissionEarned).toFixed(2));
    const completedOrdersCount = completedOrders.length;
    const avgOrderValue = completedOrdersCount > 0 ? Number((grossRevenue / completedOrdersCount).toFixed(2)) : 0;
    const dineInAov = dineInCount > 0 ? Number((dineInRevenue / dineInCount).toFixed(2)) : 0;
    const onlineOrdersCount = deliveryCount + pickupCount;
    const onlineRevenue = deliveryRevenue + pickupRevenue;
    const deliveryAov = onlineOrdersCount > 0 ? Number((onlineRevenue / onlineOrdersCount).toFixed(2)) : 0;

    // Helper for onboarding duration
    const getDaysSinceOnboarded = (createdAt?: string) => {
      if (!createdAt) return 'Recently';
      const days = differenceInDays(new Date(), new Date(createdAt));
      if (days < 0) return 'New';
      if (days === 0) return 'Today';
      if (days === 1) return 'Yesterday';
      return `${days} days ago`;
    };

    // 7-day revenue trend
    const sevenDaysAgo = subDays(new Date(), 6);
    const today = new Date();
    const dateInterval = eachDayOfInterval({ start: sevenDaysAgo, end: today });
    const weeklyMap = new Map(dateInterval.map(d => [format(d, 'yyyy-MM-dd'), 0]));

    vendorAllOrders
      .filter(o => (o.status === 'Delivered' || o.status === 'Picked Up') && o.createdAt)
      .forEach(o => {
        const d = parseISO(o.createdAt);
        if (d >= startOfDay(sevenDaysAgo) && d <= endOfDay(today)) {
          const key = format(d, 'yyyy-MM-dd');
          if (weeklyMap.has(key)) {
            weeklyMap.set(key, weeklyMap.get(key)! + (o.totalPrice || o.subtotal || 0));
          }
        }
      });

    const weeklyRevenue = Array.from(weeklyMap.entries()).map(([dateStr, total]) => ({
      date: format(parseISO(dateStr), 'MMM d'),
      revenue: total,
      expenses: 0,
    }));

    // Top 5 dishes
    const topDishes = Array.from(dishSalesMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Recent 10 completed or active orders
    const recentOrders = [...completedOrders, ...activeOrders]
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, 10);

    return {
      vendor,
      grossRevenue: Number(grossRevenue.toFixed(2)),
      completedOrdersCount,
      activeOrdersCount: activeOrders.length,
      dineInRevenue: Number(dineInRevenue.toFixed(2)),
      dineInCount,
      dineInOrders,
      deliveryRevenue: Number(deliveryRevenue.toFixed(2)),
      deliveryCount,
      deliveryOrders,
      pickupRevenue: Number(pickupRevenue.toFixed(2)),
      pickupCount,
      pickupOrders,
      commissionRate,
      commissionEarned: Number(commissionEarned.toFixed(2)),
      platformFeesEarned: Number(platformFeesEarned.toFixed(2)),
      totalPlatformCut,
      vendorNetEarnings,
      avgOrderValue,
      dineInAov,
      deliveryAov,
      uniqueCustomers: customerUsernames.size,
      onboardedSince: getDaysSinceOnboarded(vendor.createdAt),
      weeklyRevenue,
      topDishes,
      recentOrders,
    };
  }, [allOrders, isOrderInDateRange]);

  // Compute all metrics across all vendors automatically
  const allVendorMetrics = useMemo(() => {
    return allVendors.map(vendor => computeVendorMetrics(vendor));
  }, [allVendors, computeVendorMetrics]);

  // Filter channel orders within inspection dialog
  const filteredChannelOrders = useMemo(() => {
    if (!channelInspection) return [];
    const q = channelOrderSearch.trim().toLowerCase();
    if (!q) return channelInspection.orders;

    return channelInspection.orders.filter(ord => {
      const idMatch = (ord.displayId || ord.orderId || '').toLowerCase().includes(q);
      const tableMatch = (ord.tableId || '').toLowerCase().includes(q) || (ord.customer?.name || '').toLowerCase().includes(q);
      const customerMatch = (ord.customer?.name || '').toLowerCase().includes(q) ||
                            (ord.customer?.contact || '').toLowerCase().includes(q);
      const itemsMatch = Array.isArray(ord.items) && ord.items.some(it => (it.name || '').toLowerCase().includes(q));
      return idMatch || tableMatch || customerMatch || itemsMatch;
    });
  }, [channelInspection, channelOrderSearch]);

  // Executive Top-Level Totals
  const executiveSummary = useMemo(() => {
    let totalGMV = 0;
    let totalCommission = 0;
    let totalPlatformFees = 0;
    let totalPlatformCut = 0;
    let totalDineInRevenue = 0;
    let totalDineInOrders = 0;
    let totalOnlineRevenue = 0;
    let totalDeliveryOrders = 0;
    let totalPickupOrders = 0;
    let totalCompletedOrders = 0;
    let totalActiveOrders = 0;

    allVendorMetrics.forEach(m => {
      totalGMV += m.grossRevenue;
      totalCommission += m.commissionEarned;
      totalPlatformFees += m.platformFeesEarned;
      totalPlatformCut += m.totalPlatformCut;
      totalDineInRevenue += m.dineInRevenue;
      totalDineInOrders += m.dineInCount;
      totalOnlineRevenue += (m.deliveryRevenue + m.pickupRevenue);
      totalDeliveryOrders += m.deliveryCount;
      totalPickupOrders += m.pickupCount;
      totalCompletedOrders += m.completedOrdersCount;
      totalActiveOrders += m.activeOrdersCount;
    });

    return {
      totalGMV: Number(totalGMV.toFixed(2)),
      totalCommission: Number(totalCommission.toFixed(2)),
      totalPlatformFees: Number(totalPlatformFees.toFixed(2)),
      totalPlatformCut: Number(totalPlatformCut.toFixed(2)),
      totalDineInRevenue: Number(totalDineInRevenue.toFixed(2)),
      totalDineInOrders,
      totalOnlineRevenue: Number(totalOnlineRevenue.toFixed(2)),
      totalDeliveryOrders,
      totalPickupOrders,
      totalCompletedOrders,
      totalActiveOrders,
    };
  }, [allVendorMetrics]);

  // Filter & Sort Vendors
  const filteredAndSortedVendors = useMemo(() => {
    let list = allVendorMetrics.filter(m => {
      const query = searchQuery.trim().toLowerCase();
      if (!query) return true;
      const shopName = (m.vendor.shopName || '').toLowerCase();
      const ownerName = (m.vendor.name || '').toLowerCase();
      return shopName.includes(query) || ownerName.includes(query);
    });

    list.sort((a, b) => {
      if (sortBy === 'revenue') return b.grossRevenue - a.grossRevenue;
      if (sortBy === 'platformCut') return b.totalPlatformCut - a.totalPlatformCut;
      if (sortBy === 'orders') return b.completedOrdersCount - a.completedOrdersCount;
      if (sortBy === 'dineIn') return b.dineInRevenue - a.dineInRevenue;
      return 0;
    });

    return list;
  }, [allVendorMetrics, searchQuery, sortBy]);

  // Handle Commission Save from Dialog
  const handleCommissionSave = async (percentage: number) => {
    if (!commissionVendor) return;
    try {
      await toggleVendorCommission(commissionVendor.username, true, percentage);
      toast({
        title: 'Commission Updated',
        description: `Set to ${percentage}% for ${commissionVendor.shopName || commissionVendor.name}`,
      });
      setIsCommissionDialogOpen(false);
      setCommissionVendor(null);
      // Reload silently
      loadData(true);
    } catch (err) {
      console.error('Failed to update commission:', err);
      toast({
        title: 'Update Failed',
        description: 'Could not save commission rate.',
        variant: 'destructive',
      });
    }
  };

  // Comprehensive CSV Financial Report Export
  const handleExportCSV = () => {
    if (allVendorMetrics.length === 0) return;

    const timeRangeLabel = dateRange?.from
      ? `${format(dateRange.from, 'dd MMM yyyy')} to ${format(dateRange.to || dateRange.from, 'dd MMM yyyy')}`
      : 'All Time';

    const headers = [
      'Vendor Shop Name',
      'Owner Name',
      'Commission Rate (%)',
      'Total GMV (Rs)',
      'Your Platform Cut (Rs)',
      'Commission Earned (Rs)',
      'Platform Fees Earned (Rs)',
      'Vendor Net Payout (Rs)',
      'Total Orders',
      'Dine-In Count',
      'Dine-In Revenue (Rs)',
      'Delivery Count',
      'Delivery Revenue (Rs)',
      'Pickup Count',
      'Pickup Revenue (Rs)',
      'Avg Order Value (Rs)',
      'Unique Customers',
    ];

    const rows = allVendorMetrics.map(m => [
      `"${(m.vendor.shopName || m.vendor.name || '').replace(/"/g, '""')}"`,
      `"${(m.vendor.name || '').replace(/"/g, '""')}"`,
      m.commissionRate,
      m.grossRevenue.toFixed(2),
      m.totalPlatformCut.toFixed(2),
      m.commissionEarned.toFixed(2),
      m.platformFeesEarned.toFixed(2),
      m.vendorNetEarnings.toFixed(2),
      m.completedOrdersCount,
      m.dineInCount,
      m.dineInRevenue.toFixed(2),
      m.deliveryCount,
      m.deliveryRevenue.toFixed(2),
      m.pickupCount,
      m.pickupRevenue.toFixed(2),
      m.avgOrderValue.toFixed(2),
      m.uniqueCustomers,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      `"HyperDelivery SuperAdmin Financial Report - ${timeRangeLabel}"\n\n` +
      headers.join(',') +
      '\n' +
      rows.map(r => r.join(',')).join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `hyperdelivery_financial_report_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: 'Report Downloaded',
      description: `Exported financial statements for ${allVendorMetrics.length} vendors.`,
    });
  };

  return (
    <div className="flex-1 space-y-6 p-6 sm:p-8 pt-6">
      {/* Top Header & Range Selection */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-3xl font-extrabold tracking-tight font-headline">
              Revenue & Performance Hub
            </h1>
            <Badge
              variant="outline"
              className="px-2.5 py-0.5 text-xs font-semibold bg-emerald-500/10 text-emerald-600 border-emerald-500/30 flex items-center gap-1.5"
            >
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Pulse
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time multi-vendor sales, dine-in table volume (verbal billing), and delivery platform earnings.
          </p>
        </div>

        {/* Action Controls & Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Preset Buttons */}
          <div className="inline-flex items-center p-1 bg-muted/60 rounded-2xl border text-xs font-medium">
            <button
              type="button"
              onClick={() => handleFilterPresetChange('today')}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                filterPreset === 'today'
                  ? 'bg-background shadow-sm text-foreground font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => handleFilterPresetChange('yesterday')}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                filterPreset === 'yesterday'
                  ? 'bg-background shadow-sm text-foreground font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Yesterday
            </button>
            <button
              type="button"
              onClick={() => handleFilterPresetChange('thisWeek')}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                filterPreset === 'thisWeek'
                  ? 'bg-background shadow-sm text-foreground font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              This Week
            </button>
            <button
              type="button"
              onClick={() => handleFilterPresetChange('thisMonth')}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                filterPreset === 'thisMonth'
                  ? 'bg-background shadow-sm text-foreground font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              This Month
            </button>
            <button
              type="button"
              onClick={() => handleFilterPresetChange('all')}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                filterPreset === 'all'
                  ? 'bg-background shadow-sm text-foreground font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              All Time
            </button>
          </div>

          {/* Custom Date Range Popover */}
          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant={filterPreset === 'custom' ? 'default' : 'outline'}
                size="sm"
                className="h-9 rounded-2xl px-3 text-xs gap-1.5 font-medium"
              >
                <CalendarIcon className="h-3.5 w-3.5" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    `${format(dateRange.from, 'MMM d')} - ${format(dateRange.to, 'MMM d')}`
                  ) : (
                    format(dateRange.from, 'MMM d, yyyy')
                  )
                ) : (
                  'Custom Range'
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
                    setFilterPreset('custom');
                  }
                }}
                numberOfMonths={1}
              />
            </PopoverContent>
          </Popover>

          {/* Sync Button */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => loadData(true)}
            disabled={isRefreshing}
            className="h-9 w-9 rounded-2xl"
            title="Refresh Orders Now"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin text-primary' : ''}`} />
          </Button>

          {/* Export CSV Button */}
          <Button
            onClick={handleExportCSV}
            size="sm"
            className="h-9 rounded-2xl px-3.5 gap-2 font-bold text-white bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500 bg-[length:200%_auto] animate-gradient-move shadow-sm"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Loading Skeleton fallback when vendors are loading for the first time */}
      {isLoading && allVendors.length === 0 ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-32 rounded-3xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Skeleton key={i} className="h-72 rounded-3xl" />
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* 4 Hero Executive Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Total Gross Business */}
            <Card className="rounded-3xl border shadow-sm relative overflow-hidden bg-card/60 backdrop-blur-sm">
              <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-8 -mt-8 pointer-events-none" />
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Store className="h-3.5 w-3.5 text-primary" />
                    Gross Sales (GMV)
                  </span>
                  <Badge variant="secondary" className="text-[10px] px-2 py-0">
                    All Channels
                  </Badge>
                </div>
                <CardTitle className="text-3xl font-black font-headline tracking-tight mt-1 text-foreground">
                  ₹{executiveSummary.totalGMV.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs text-muted-foreground">
                  Across <span className="font-semibold text-foreground">{executiveSummary.totalCompletedOrders}</span> completed orders
                  {executiveSummary.totalActiveOrders > 0 && (
                    <span className="ml-1 text-emerald-600 font-semibold">
                      · {executiveSummary.totalActiveOrders} live right now
                    </span>
                  )}
                </p>
              </CardContent>
            </Card>

            {/* Card 2: Your HyperDelivery Cut */}
            <Card className="rounded-3xl border-2 border-primary/20 shadow-md relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-background">
              <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full -mr-8 -mt-8 pointer-events-none" />
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    Your Platform Revenue
                  </span>
                  <Badge className="bg-primary/20 text-primary hover:bg-primary/30 text-[10px] px-2 py-0 border-0">
                    100% Retained
                  </Badge>
                </div>
                <CardTitle className="text-3xl font-black font-headline tracking-tight mt-1 text-primary">
                  ₹{executiveSummary.totalPlatformCut.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-1">
                <p className="text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">₹{executiveSummary.totalCommission.toFixed(2)}</span> commissions +{' '}
                  <span className="font-semibold text-foreground">₹{executiveSummary.totalPlatformFees.toFixed(2)}</span> app fees
                </p>
                <p className="text-[11px] text-muted-foreground/80">
                  ₹5 platform fee per delivery/pickup · 0% fee on dine-in
                </p>
              </CardContent>
            </Card>

            {/* Card 3: Dine-In Volume (19 Tables Reference) */}
            <Card className="rounded-3xl border shadow-sm relative overflow-hidden bg-card/60 backdrop-blur-sm">
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full -mr-8 -mt-8 pointer-events-none" />
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <UtensilsCrossed className="h-3.5 w-3.5 text-amber-500" />
                    Dine-In Volume
                  </span>
                  <Badge variant="outline" className="text-[10px] px-2 py-0 text-amber-600 border-amber-500/30">
                    Verbal Billing
                  </Badge>
                </div>
                <CardTitle className="text-3xl font-black font-headline tracking-tight mt-1 text-foreground">
                  ₹{executiveSummary.totalDineInRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">{executiveSummary.totalDineInOrders}</span> dine-in table orders
                </p>
                <p className="text-[11px] text-muted-foreground/80 mt-0.5">
                  ₹0 in-app cut · Ready for your offline settlement terms
                </p>
              </CardContent>
            </Card>

            {/* Card 4: Online Delivery & Pickup Volume */}
            <Card className="rounded-3xl border shadow-sm relative overflow-hidden bg-card/60 backdrop-blur-sm">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -mr-8 -mt-8 pointer-events-none" />
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Bike className="h-3.5 w-3.5 text-blue-500" />
                    Delivery & Pickup
                  </span>
                  <Badge variant="outline" className="text-[10px] px-2 py-0 text-blue-600 border-blue-500/30">
                    Commission Applied
                  </Badge>
                </div>
                <CardTitle className="text-3xl font-black font-headline tracking-tight mt-1 text-foreground">
                  ₹{executiveSummary.totalOnlineRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">{executiveSummary.totalDeliveryOrders}</span> home deliveries ·{' '}
                  <span className="font-semibold text-foreground">{executiveSummary.totalPickupOrders}</span> self pickups
                </p>
                <p className="text-[11px] text-muted-foreground/80 mt-0.5">
                  Subject to each vendor&apos;s individual % cut + ₹5 fee
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Search and Sort Toolbar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search vendor or owner..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10 rounded-2xl bg-card"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Sort By:</span>
              <Select value={sortBy} onValueChange={(val: any) => setSortBy(val)}>
                <SelectTrigger className="w-[180px] h-10 rounded-2xl">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="revenue">Gross Sales (High-Low)</SelectItem>
                  <SelectItem value="platformCut">Your Platform Cut</SelectItem>
                  <SelectItem value="orders">Total Completed Orders</SelectItem>
                  <SelectItem value="dineIn">Dine-In Business</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Vendor Cards Grid */}
          {filteredAndSortedVendors.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAndSortedVendors.map((m) => {
                const hasDineInTables = (m.vendor.dineInTables || 0) > 0;
                
                // Smart Operating Hours Open/Closed status using VendorStatusManager
                const shopStatus = VendorStatusManager.getShopStatus(m.vendor);
                const isShopCurrentlyOpen = shopStatus.status === VendorStatus.OPEN;

                return (
                  <Card
                    key={m.vendor.username}
                    className="rounded-3xl border shadow-sm flex flex-col hover:border-primary/40 transition-all duration-200 bg-card overflow-hidden"
                  >
                    {/* Vendor Header */}
                    <CardHeader className="p-5 pb-3 border-b bg-muted/20">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-base font-bold truncate">
                              {m.vendor.shopName || m.vendor.name}
                            </CardTitle>
                          </div>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {m.vendor.name && m.vendor.shopName && m.vendor.name !== m.vendor.shopName
                              ? `${m.vendor.name} · `
                              : ''}
                            Onboarded {m.onboardedSince}
                          </p>
                        </div>

                        {/* Commission Tag (Clickable to Edit) */}
                        <button
                          type="button"
                          onClick={() => {
                            setCommissionVendor(m.vendor);
                            setIsCommissionDialogOpen(true);
                          }}
                          className="shrink-0 transition-transform hover:scale-105"
                          title="Click to edit delivery commission"
                        >
                          <Badge
                            variant="secondary"
                            className="px-2.5 py-1 text-xs font-bold bg-primary/10 text-primary border border-primary/20 flex items-center gap-1 cursor-pointer"
                          >
                            <Percent className="h-3 w-3" />
                            {m.commissionRate}% Cut
                          </Badge>
                        </button>
                      </div>

                      {/* Special Badges row */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        {hasDineInTables && (
                          <Badge variant="outline" className="text-[11px] px-2 py-0 bg-amber-500/10 text-amber-600 border-amber-500/30 flex items-center gap-1">
                            <TableIcon className="h-3 w-3" />
                            {m.vendor.dineInTables} Dine-In Tables
                          </Badge>
                        )}
                        {m.activeOrdersCount > 0 && (
                          <Badge className="bg-emerald-500 text-white text-[10px] px-2 py-0 animate-pulse">
                            {m.activeOrdersCount} Live Orders
                          </Badge>
                        )}
                        
                        {/* Intelligent Operating Hours Status Badge */}
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-2 py-0.5 flex items-center gap-1.5 font-medium ${
                            isShopCurrentlyOpen
                              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30 font-semibold'
                              : 'bg-muted/60 text-muted-foreground border-border'
                          }`}
                          title={`Schedule status: ${shopStatus.msg}`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              isShopCurrentlyOpen ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                            }`}
                          />
                          {shopStatus.msg}
                        </Badge>
                      </div>
                    </CardHeader>

                    {/* Financial Snapshot */}
                    <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      {/* Top 3 Metric Blocks */}
                      <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-muted/40 border text-center">
                        <div>
                          <p className="text-[10px] uppercase font-bold text-muted-foreground">Gross Sales</p>
                          <p className="text-sm font-black text-foreground mt-0.5">₹{m.grossRevenue.toFixed(0)}</p>
                        </div>
                        <div className="border-x border-border/60">
                          <p className="text-[10px] uppercase font-bold text-primary">Your Cut</p>
                          <p className="text-sm font-black text-primary mt-0.5">₹{m.totalPlatformCut.toFixed(0)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-bold text-muted-foreground">Vendor Net</p>
                          <p className="text-sm font-black text-foreground mt-0.5">₹{m.vendorNetEarnings.toFixed(0)}</p>
                        </div>
                      </div>

                      {/* Interactive Channel Breakdown (Click to View Order Details) */}
                      <div className="space-y-1.5 text-xs">
                        {/* Dine-In Row */}
                        <button
                          type="button"
                          onClick={() => {
                            if (m.dineInCount > 0) {
                              setChannelInspection({
                                vendor: m.vendor,
                                channel: 'Dine-In',
                                orders: m.dineInOrders,
                                totalRevenue: m.dineInRevenue,
                              });
                            }
                          }}
                          disabled={m.dineInCount === 0}
                          title={m.dineInCount > 0 ? `Click to inspect all ${m.dineInCount} Dine-In orders` : 'No Dine-In orders'}
                          className={cn(
                            "w-full flex items-center justify-between p-2 rounded-xl text-left transition-all border border-transparent",
                            m.dineInCount > 0
                              ? "hover:bg-amber-500/10 hover:border-amber-500/30 cursor-pointer group"
                              : "opacity-60 cursor-default"
                          )}
                        >
                          <span className="flex items-center gap-1.5 font-medium text-muted-foreground group-hover:text-amber-700 dark:group-hover:text-amber-400">
                            <UtensilsCrossed className="h-3.5 w-3.5 text-amber-500" />
                            Dine-In ({hasDineInTables ? `${m.vendor.dineInTables} Tables` : 'Tables'})
                          </span>
                          <span className="flex items-center gap-1 font-bold text-foreground">
                            ₹{m.dineInRevenue.toFixed(2)}{' '}
                            <span className="font-normal text-muted-foreground">({m.dineInCount} orders)</span>
                            {m.dineInCount > 0 && (
                              <ChevronRight className="h-3 w-3 text-muted-foreground group-hover:text-foreground transition-transform group-hover:translate-x-0.5" />
                            )}
                          </span>
                        </button>

                        {/* Delivery Row */}
                        <button
                          type="button"
                          onClick={() => {
                            if (m.deliveryCount > 0) {
                              setChannelInspection({
                                vendor: m.vendor,
                                channel: 'Home Delivery',
                                orders: m.deliveryOrders,
                                totalRevenue: m.deliveryRevenue,
                              });
                            }
                          }}
                          disabled={m.deliveryCount === 0}
                          title={m.deliveryCount > 0 ? `Click to inspect all ${m.deliveryCount} Delivery orders` : 'No Delivery orders'}
                          className={cn(
                            "w-full flex items-center justify-between p-2 rounded-xl text-left transition-all border border-transparent",
                            m.deliveryCount > 0
                              ? "hover:bg-blue-500/10 hover:border-blue-500/30 cursor-pointer group"
                              : "opacity-60 cursor-default"
                          )}
                        >
                          <span className="flex items-center gap-1.5 font-medium text-muted-foreground group-hover:text-blue-700 dark:group-hover:text-blue-400">
                            <Bike className="h-3.5 w-3.5 text-blue-500" />
                            Home Delivery
                          </span>
                          <span className="flex items-center gap-1 font-bold text-foreground">
                            ₹{m.deliveryRevenue.toFixed(2)}{' '}
                            <span className="font-normal text-muted-foreground">({m.deliveryCount} orders)</span>
                            {m.deliveryCount > 0 && (
                              <ChevronRight className="h-3 w-3 text-muted-foreground group-hover:text-foreground transition-transform group-hover:translate-x-0.5" />
                            )}
                          </span>
                        </button>

                        {/* Pickup Row */}
                        <button
                          type="button"
                          onClick={() => {
                            if (m.pickupCount > 0) {
                              setChannelInspection({
                                vendor: m.vendor,
                                channel: 'Self Pickup',
                                orders: m.pickupOrders,
                                totalRevenue: m.pickupRevenue,
                              });
                            }
                          }}
                          disabled={m.pickupCount === 0}
                          title={m.pickupCount > 0 ? `Click to inspect all ${m.pickupCount} Pickup orders` : 'No Pickup orders'}
                          className={cn(
                            "w-full flex items-center justify-between p-2 rounded-xl text-left transition-all border border-transparent",
                            m.pickupCount > 0
                              ? "hover:bg-emerald-500/10 hover:border-emerald-500/30 cursor-pointer group"
                              : "opacity-60 cursor-default"
                          )}
                        >
                          <span className="flex items-center gap-1.5 font-medium text-muted-foreground group-hover:text-emerald-700 dark:group-hover:text-emerald-400">
                            <ShoppingBag className="h-3.5 w-3.5 text-emerald-500" />
                            Self Pickup
                          </span>
                          <span className="flex items-center gap-1 font-bold text-foreground">
                            ₹{m.pickupRevenue.toFixed(2)}{' '}
                            <span className="font-normal text-muted-foreground">({m.pickupCount} orders)</span>
                            {m.pickupCount > 0 && (
                              <ChevronRight className="h-3 w-3 text-muted-foreground group-hover:text-foreground transition-transform group-hover:translate-x-0.5" />
                            )}
                          </span>
                        </button>
                      </div>

                      {/* 7-Day Trend Chart */}
                      <div>
                        <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground mb-1">
                          <span>7-Day Volume</span>
                          <span>AOV: ₹{m.avgOrderValue.toFixed(0)}</span>
                        </div>
                        <div className="h-[140px] w-full">
                          <RevenueChart data={m.weeklyRevenue} />
                        </div>
                      </div>

                      {/* Drill-Down Inspector Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedVendorDetail(m)}
                        className="w-full rounded-2xl text-xs font-bold gap-1.5 h-9 mt-2 hover:border-primary/50"
                      >
                        View 360° Breakdown
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-20 border rounded-3xl bg-muted/10">
              <Store className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <h3 className="text-base font-bold">No Vendors Matching Your Filter</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                Try adjusting your search query or choosing another timeframe preset.
              </p>
            </div>
          )}
        </>
      )}

      {/* Channel Orders Inspection Dialog */}
      {channelInspection && (
        <Dialog
          open={!!channelInspection}
          onOpenChange={(isOpen) => {
            if (!isOpen) {
              setChannelInspection(null);
              setChannelOrderSearch('');
            }
          }}
        >
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col rounded-3xl p-6">
            <DialogHeader className="border-b pb-4 shrink-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
                    channelInspection.channel === 'Dine-In' && "bg-amber-500/10 text-amber-600",
                    channelInspection.channel === 'Home Delivery' && "bg-blue-500/10 text-blue-600",
                    channelInspection.channel === 'Self Pickup' && "bg-emerald-500/10 text-emerald-600",
                  )}>
                    {channelInspection.channel === 'Dine-In' && <UtensilsCrossed className="h-6 w-6" />}
                    {channelInspection.channel === 'Home Delivery' && <Bike className="h-6 w-6" />}
                    {channelInspection.channel === 'Self Pickup' && <ShoppingBag className="h-6 w-6" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <DialogTitle className="text-xl font-bold font-headline">
                        {channelInspection.channel} Orders
                      </DialogTitle>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-xs font-bold",
                          channelInspection.channel === 'Dine-In' && "bg-amber-500/15 text-amber-700 dark:text-amber-300",
                          channelInspection.channel === 'Home Delivery' && "bg-blue-500/15 text-blue-700 dark:text-blue-300",
                          channelInspection.channel === 'Self Pickup' && "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
                        )}
                      >
                        {filteredChannelOrders.length} {filteredChannelOrders.length === 1 ? 'Order' : 'Orders'}
                      </Badge>
                    </div>
                    <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                      {channelInspection.vendor.shopName || channelInspection.vendor.name} ·{' '}
                      {dateRange?.from
                        ? `${format(dateRange.from, 'dd MMM')} - ${format(dateRange.to || dateRange.from, 'dd MMM yyyy')}`
                        : 'All Time'}
                    </DialogDescription>
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <p className="text-[11px] uppercase font-bold text-muted-foreground">Total Channel Sales</p>
                  <p className="text-2xl font-black text-foreground">
                    ₹{channelInspection.totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {/* Sub-Header Insights & Search */}
              <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search by ID, Table #, dish, customer..."
                    value={channelOrderSearch}
                    onChange={(e) => setChannelOrderSearch(e.target.value)}
                    className="pl-8 h-9 text-xs rounded-xl bg-muted/40"
                  />
                  {channelOrderSearch && (
                    <button
                      onClick={() => setChannelOrderSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground w-full sm:w-auto justify-end">
                  {channelInspection.channel === 'Dine-In' ? (
                    <Badge variant="outline" className="text-[10px] px-2 py-0.5 text-amber-600 border-amber-500/30">
                      0% App Cut · Verbal Offline Billing
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] px-2 py-0.5 text-blue-600 border-blue-500/30">
                      ₹5 Platform Fee Applied per Order
                    </Badge>
                  )}
                </div>
              </div>
            </DialogHeader>

            {/* Orders Scrollable List */}
            <div className="flex-1 overflow-y-auto space-y-3 py-4 pr-1">
              {filteredChannelOrders.length > 0 ? (
                filteredChannelOrders.map((ord) => {
                  const isDineIn = ord.deliveryOption === 'Dine-In' || Boolean(ord.tableId);
                  const orderDate = ord.createdAt ? new Date(ord.createdAt) : null;
                  const platformFee = isDineIn ? 0 : (ord.platformFee !== undefined ? Number(ord.platformFee) : 5);
                  const commissionAmt = isDineIn ? 0 : (ord.commissionAmount || 0);

                  return (
                    <div
                      key={ord.orderId}
                      className="p-4 rounded-2xl border bg-card/80 hover:border-primary/40 transition-all shadow-sm space-y-3"
                    >
                      {/* Top Bar of Order */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono font-bold text-xs bg-muted px-2 py-0.5 rounded-lg text-foreground">
                            {ord.displayId || ord.orderId.slice(0, 8)}
                          </span>

                          {/* Table Badge for Dine-In */}
                          {isDineIn && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 font-bold text-xs tracking-tight shadow-sm">
                              <UtensilsCrossed className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                              {formatTableDisplay(ord.tableId, ord.customer?.name)}
                            </span>
                          )}

                          {/* Round Badge for Dine-In */}
                          {isDineIn && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                              <span>Round {ord.orderRound || 1}</span>
                              <span className="text-[10px] font-mono opacity-80">(R{ord.orderRound || 1})</span>
                            </span>
                          )}

                          {/* Status Badge */}
                          <Badge variant="outline" className="text-[10px] px-2 py-0">
                            {ord.status}
                          </Badge>

                          {/* Payment Method Badge */}
                          <Badge variant="secondary" className="text-[10px] px-2 py-0">
                            {ord.paymentMethod || 'Paid'}
                          </Badge>
                        </div>

                        {/* Order Timestamp */}
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium">
                          <Clock className="h-3 w-3" />
                          {orderDate ? format(orderDate, 'dd MMM yyyy, hh:mm a') : 'Recent'}
                        </div>
                      </div>

                      {/* Customer / Rider Context for Delivery */}
                      {ord.deliveryOption === 'Home Delivery' && ord.customer && (
                        <div className="flex flex-wrap items-center justify-between text-xs text-muted-foreground gap-2 bg-muted/20 p-2 rounded-xl">
                          <div className="flex items-center gap-1.5 font-medium text-foreground">
                            <span className="font-bold">{ord.customer.name || 'Customer'}</span>
                            {ord.customer.contact && (
                              <span className="text-muted-foreground">({ord.customer.contact})</span>
                            )}
                          </div>
                          {ord.assignedDeliveryBoyName && (
                            <div className="flex items-center gap-1 text-primary text-[11px] font-semibold">
                              <Bike className="h-3.5 w-3.5" />
                              Rider: {ord.assignedDeliveryBoyName}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Dishes / Items List */}
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Ordered Items ({ord.items?.length || 0})
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {Array.isArray(ord.items) && ord.items.map((item: any, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-muted/30 border border-border/50"
                            >
                              <div className="min-w-0 pr-2">
                                <span className="font-bold text-foreground">
                                  {item.quantity}x{' '}
                                </span>
                                <span className="text-foreground/90 font-medium">
                                  {item.name}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {isDineIn && (
                                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/25">
                                    R{item.round || ord.orderRound || 1}
                                  </span>
                                )}
                                <span className="font-semibold text-foreground">
                                  ₹{(Number(item.price || 0) * Number(item.quantity || 1)).toFixed(2)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Financial Footer */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t text-xs">
                        <div className="flex flex-wrap items-center gap-3 text-muted-foreground">
                          <span>Subtotal: <strong className="text-foreground">₹{Number(ord.subtotal || ord.totalPrice || 0).toFixed(2)}</strong></span>
                          {ord.discountAmount ? (
                            <span className="text-rose-500">Discount: -₹{Number(ord.discountAmount).toFixed(2)}</span>
                          ) : null}
                          {!isDineIn && (
                            <span>App Fee: <strong className="text-primary">+₹{platformFee.toFixed(2)}</strong></span>
                          )}
                          {!isDineIn && commissionAmt > 0 && (
                            <span>Vendor Comm: <strong className="text-foreground">₹{commissionAmt.toFixed(2)}</strong></span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold uppercase text-muted-foreground">Total Bill:</span>
                          <span className="text-base font-black text-foreground font-headline">
                            ₹{Number(ord.totalPrice || ord.subtotal || 0).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-16 text-muted-foreground">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="font-medium text-xs">No orders match your filter criteria.</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* 360° Vendor Drill-Down Dialog */}
      {selectedVendorDetail && (
        <Dialog
          open={!!selectedVendorDetail}
          onOpenChange={(isOpen) => !isOpen && setSelectedVendorDetail(null)}
        >
          <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto rounded-3xl p-6">
            <DialogHeader className="border-b pb-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <DialogTitle className="text-xl font-bold font-headline">
                    {selectedVendorDetail.vendor.shopName || selectedVendorDetail.vendor.name}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                    Financial & Operational Performance breakdown for{' '}
                    {dateRange?.from
                      ? `${format(dateRange.from, 'dd MMM')} - ${format(dateRange.to || dateRange.from, 'dd MMM yyyy')}`
                      : 'All Time'}
                  </DialogDescription>
                </div>
                <Badge
                  variant="secondary"
                  className="px-2.5 py-1 text-xs font-bold bg-primary/10 text-primary border border-primary/20"
                >
                  {selectedVendorDetail.commissionRate}% Delivery Cut
                </Badge>
              </div>
            </DialogHeader>

            <div className="space-y-6 py-3">
              {/* High Level Financial Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-3 rounded-2xl bg-muted/40 border">
                  <p className="text-[10px] font-bold uppercase text-muted-foreground">Gross Sales</p>
                  <p className="text-lg font-black mt-1">₹{selectedVendorDetail.grossRevenue.toFixed(2)}</p>
                </div>
                <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20">
                  <p className="text-[10px] font-bold uppercase text-primary">Your App Cut</p>
                  <p className="text-lg font-black text-primary mt-1">₹{selectedVendorDetail.totalPlatformCut.toFixed(2)}</p>
                </div>
                <div className="p-3 rounded-2xl bg-muted/40 border">
                  <p className="text-[10px] font-bold uppercase text-muted-foreground">Vendor Share</p>
                  <p className="text-lg font-black mt-1">₹{selectedVendorDetail.vendorNetEarnings.toFixed(2)}</p>
                </div>
                <div className="p-3 rounded-2xl bg-muted/40 border">
                  <p className="text-[10px] font-bold uppercase text-muted-foreground">Avg Ticket</p>
                  <p className="text-lg font-black mt-1">₹{selectedVendorDetail.avgOrderValue.toFixed(2)}</p>
                </div>
              </div>

              {/* Exact Earnings Math Breakdown */}
              <div className="p-4 rounded-2xl bg-muted/30 border space-y-2 text-xs">
                <h4 className="font-bold text-foreground flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  Your Platform Earnings Math
                </h4>
                <div className="space-y-1 text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Delivery/Pickup Food Commission ({selectedVendorDetail.commissionRate}%):</span>
                    <span className="font-bold text-foreground">₹{selectedVendorDetail.commissionEarned.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>
                      Customer Platform Fees (₹5 × {selectedVendorDetail.deliveryCount + selectedVendorDetail.pickupCount} online orders):
                    </span>
                    <span className="font-bold text-foreground">₹{selectedVendorDetail.platformFeesEarned.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-amber-600">
                    <span>Dine-In Commission & Platform Fees ({selectedVendorDetail.dineInCount} table orders):</span>
                    <span className="font-bold">₹0.00 (Offline verbal billing)</span>
                  </div>
                  <div className="border-t pt-1 flex justify-between font-bold text-primary text-sm">
                    <span>Total Retained by HyperDelivery:</span>
                    <span>₹{selectedVendorDetail.totalPlatformCut.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Top Selling Items */}
              {selectedVendorDetail.topDishes.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                    Top Generating Dishes
                  </h4>
                  <div className="divide-y border rounded-2xl overflow-hidden">
                    {selectedVendorDetail.topDishes.map((dish, i) => (
                      <div key={dish.name} className="p-3 flex items-center justify-between text-xs bg-card">
                        <div className="flex items-center gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center font-bold text-[10px] text-muted-foreground">
                            {i + 1}
                          </span>
                          <div>
                            <p className="font-bold text-foreground">{dish.name}</p>
                            <p className="text-[11px] text-muted-foreground">{dish.quantity} portions served</p>
                          </div>
                        </div>
                        <span className="font-black text-foreground">₹{dish.revenue.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Orders in Period */}
              {selectedVendorDetail.recentOrders.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Package className="h-3.5 w-3.5 text-blue-500" />
                    Recent Orders Ledger
                  </h4>
                  <div className="divide-y border rounded-2xl overflow-hidden max-h-60 overflow-y-auto">
                    {selectedVendorDetail.recentOrders.map((ord) => {
                      const isDineIn = ord.deliveryOption === 'Dine-In' || Boolean(ord.tableId);
                      return (
                        <div key={ord.orderId} className="p-3 flex items-center justify-between text-xs bg-card">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-[11px]">
                                {ord.displayId || ord.orderId.slice(0, 8)}
                              </span>
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                {isDineIn ? formatTableDisplay(ord.tableId, ord.customer?.name) : ord.deliveryOption}
                              </Badge>
                              {isDineIn && (
                                <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                                  R{ord.orderRound || 1}
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {ord.createdAt ? format(new Date(ord.createdAt), 'dd MMM, hh:mm a') : 'Recent'} · Status: {ord.status}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-foreground">₹{Number(ord.totalPrice || ord.subtotal || 0).toFixed(2)}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {isDineIn ? '₹0 App Cut' : `Cut: ₹${(ord.commissionAmount || 0) + (ord.platformFee || 5)}`}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Quick Edit Commission Modal */}
      <CommissionConfigDialog
        isOpen={isCommissionDialogOpen}
        onOpenChange={setIsCommissionDialogOpen}
        onSave={handleCommissionSave}
        vendor={commissionVendor}
      />
    </div>
  );
}
