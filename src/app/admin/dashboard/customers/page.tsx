'use client';

import React, { useMemo, useState } from 'react';
import { useOrder } from '@/context/order-context';
import { useVendor } from '@/context/vendor-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Crown, 
  Repeat, 
  ShoppingBag, 
  Search, 
  X, 
  ArrowUpDown, 
  Phone, 
  MapPin, 
  Award, 
  Utensils, 
  Calendar, 
  Flame,
  Clock,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, parseISO, format } from 'date-fns';

interface CustomerInsight {
  id: string;
  name: string;
  contact: string;
  address?: string;
  imageUrl?: string;
  totalOrders: number;
  totalSpent: number;
  lastOrderDate: string;
  isDineIn: boolean;
  topItems: { name: string; count: number }[];
  rewardPoints?: number;
}

type SegmentFilter = 'all' | 'repeat' | 'vip' | 'dinein';

export default function AdminCustomersPage() {
  const { orders } = useOrder();
  const { vendor } = useVendor();

  const [searchQuery, setSearchQuery] = useState('');
  const [segmentFilter, setSegmentFilter] = useState<SegmentFilter>('all');
  const [sortBy, setSortBy] = useState<'spent' | 'orders' | 'recent'>('spent');

  // Format and mask contact number
  const formatAndMaskContact = (contact: string) => {
    if (!contact) return '';
    const cleaned = contact.replace('+91', '');
    if (cleaned.length <= 4) return cleaned;
    const lastFour = cleaned.slice(-4);
    return `xxxxxx${lastFour}`;
  };

  // Derive customer insights directly from vendor's completed orders (Zero external DB dependency)
  const { allCustomers, totalUniqueCustomers, repeatRate, topSpenderAmount, avgLtv } = useMemo(() => {
    if (!vendor) {
      return { allCustomers: [], totalUniqueCustomers: 0, repeatRate: 0, topSpenderAmount: 0, avgLtv: 0 };
    }

    const deliveredOrders = orders.filter(
      (order) =>
        order.vendorUsername === vendor.username &&
        (order.status === 'Delivered' || order.status === 'Picked Up')
    );

    const customerMap = new Map<string, CustomerInsight>();

    deliveredOrders.forEach((order) => {
      const isDineIn = order.deliveryOption === 'Dine-In';
      // Group dine-in orders under a unified summary or by table, and home delivery by customerUsername/name
      const customerKey = isDineIn
        ? (order.customer.name?.startsWith('Table') ? order.customer.name : 'Dine-In Summary')
        : (order.customerUsername || order.customer.name || 'Unknown');

      let entry = customerMap.get(customerKey);

      if (!entry) {
        entry = {
          id: customerKey,
          name: isDineIn ? (order.customer.name || 'Dine-In Guest') : (order.customer.name || 'Guest Customer'),
          contact: isDineIn ? '' : (order.customer.contact || ''),
          address: isDineIn ? 'In-Store Table' : order.customer.address,
          imageUrl: (order.customer as any)?.imageUrl,
          totalOrders: 0,
          totalSpent: 0,
          lastOrderDate: order.createdAt,
          isDineIn,
          topItems: [],
        };
        customerMap.set(customerKey, entry);
      }

      // Update metrics
      entry.totalOrders += 1;
      entry.totalSpent += order.totalPrice;

      // Update most recent order date
      if (new Date(order.createdAt).getTime() > new Date(entry.lastOrderDate).getTime()) {
        entry.lastOrderDate = order.createdAt;
      }

      // Count item preferences
      order.items.forEach((item) => {
        const existing = entry!.topItems.find((i) => i.name === item.name);
        if (existing) {
          existing.count += item.quantity;
        } else {
          entry!.topItems.push({ name: item.name, count: item.quantity });
        }
      });
    });

    const customerList = Array.from(customerMap.values()).map((c) => ({
      ...c,
      topItems: c.topItems.sort((a, b) => b.count - a.count).slice(0, 4),
    }));

    const nonDineInCustomers = customerList.filter((c) => !c.isDineIn);
    const repeatCount = nonDineInCustomers.filter((c) => c.totalOrders > 1).length;
    const rate = nonDineInCustomers.length > 0 ? Math.round((repeatCount / nonDineInCustomers.length) * 100) : 0;
    const highestSpend = customerList.length > 0 ? Math.max(...customerList.map((c) => c.totalSpent)) : 0;
    const totalRevenue = customerList.reduce((sum, c) => sum + c.totalSpent, 0);
    const ltv = customerList.length > 0 ? totalRevenue / customerList.length : 0;

    return {
      allCustomers: customerList,
      totalUniqueCustomers: customerList.length,
      repeatRate: rate,
      topSpenderAmount: highestSpend,
      avgLtv: ltv,
    };
  }, [orders, vendor]);

  // Filtered and sorted list
  const filteredCustomers = useMemo(() => {
    return allCustomers
      .filter((c) => {
        const matchesSearch =
          c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.contact.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (c.address && c.address.toLowerCase().includes(searchQuery.toLowerCase())) ||
          c.topItems.some((i) => i.name.toLowerCase().includes(searchQuery.toLowerCase()));

        if (!matchesSearch) return false;

        if (segmentFilter === 'repeat') return c.totalOrders > 1 && !c.isDineIn;
        if (segmentFilter === 'vip') return c.totalSpent >= 1000 && !c.isDineIn;
        if (segmentFilter === 'dinein') return c.isDineIn;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'spent') return b.totalSpent - a.totalSpent;
        if (sortBy === 'orders') return b.totalOrders - a.totalOrders;
        if (sortBy === 'recent') return new Date(b.lastOrderDate).getTime() - new Date(a.lastOrderDate).getTime();
        return 0;
      });
  }, [allCustomers, searchQuery, segmentFilter, sortBy]);

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-8 pt-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold font-headline tracking-tight text-foreground flex items-center gap-2">
            <Users className="h-7 w-7 text-primary" />
            Customer Insights & Loyalty
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Understand repeat buyer habits, favorite dishes, and high-value patrons.
          </p>
        </div>
      </div>

      {/* KPI Highlights Shelf */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Total Patrons */}
        <Card className="rounded-3xl border border-border/70 bg-card/85 backdrop-blur-md shadow-xs p-4 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 font-bold">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-muted-foreground">Total Customers</span>
            <div className="text-lg sm:text-xl font-extrabold text-foreground">
              {totalUniqueCustomers}
            </div>
          </div>
        </Card>

        {/* Repeat Rate */}
        <Card className="rounded-3xl border border-border/70 bg-card/85 backdrop-blur-md shadow-xs p-4 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 font-bold">
            <Repeat className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-muted-foreground">Repeat Buyer Rate</span>
            <div className="text-lg sm:text-xl font-extrabold text-foreground">
              {repeatRate}%
            </div>
          </div>
        </Card>

        {/* Top Spender */}
        <Card className="rounded-3xl border border-border/70 bg-card/85 backdrop-blur-md shadow-xs p-4 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 font-bold">
            <Crown className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-muted-foreground">Top VIP Spend</span>
            <div className="text-lg sm:text-xl font-extrabold text-foreground">
              ₹{topSpenderAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
          </div>
        </Card>

        {/* Average Lifetime Value */}
        <Card className="rounded-3xl border border-border/70 bg-card/85 backdrop-blur-md shadow-xs p-4 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 font-bold">
            <ShoppingBag className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-muted-foreground">Avg. Lifetime Value</span>
            <div className="text-lg sm:text-xl font-extrabold text-foreground">
              ₹{avgLtv.toFixed(0)}
            </div>
          </div>
        </Card>
      </div>

      {/* Main Customers List Card */}
      <Card className="rounded-3xl border border-border/70 bg-card/90 shadow-xs overflow-hidden">
        {/* Search, Filter Pills & Sort Bar */}
        <div className="p-4 sm:p-5 border-b border-border/60 bg-muted/20 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Search Box */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by customer name, phone, address, or favorite dish..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs rounded-xl h-9"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Sort Dropdown / Toggle */}
            <div className="flex items-center gap-1.5 shrink-0 text-xs">
              <span className="text-muted-foreground font-semibold flex items-center gap-1">
                <ArrowUpDown className="h-3.5 w-3.5" /> Sort:
              </span>
              <button
                type="button"
                onClick={() => setSortBy('spent')}
                className={cn(
                  "px-2.5 py-1 rounded-full font-bold transition-all cursor-pointer",
                  sortBy === 'spent' ? "bg-primary text-primary-foreground shadow-xs" : "bg-muted hover:bg-muted/80 text-muted-foreground"
                )}
              >
                Top Spend
              </button>
              <button
                type="button"
                onClick={() => setSortBy('orders')}
                className={cn(
                  "px-2.5 py-1 rounded-full font-bold transition-all cursor-pointer",
                  sortBy === 'orders' ? "bg-primary text-primary-foreground shadow-xs" : "bg-muted hover:bg-muted/80 text-muted-foreground"
                )}
              >
                Most Orders
              </button>
              <button
                type="button"
                onClick={() => setSortBy('recent')}
                className={cn(
                  "px-2.5 py-1 rounded-full font-bold transition-all cursor-pointer",
                  sortBy === 'recent' ? "bg-primary text-primary-foreground shadow-xs" : "bg-muted hover:bg-muted/80 text-muted-foreground"
                )}
              >
                Recent
              </button>
            </div>
          </div>

          {/* Segment Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
            {(
              [
                { id: 'all', label: `All Patrons (${allCustomers.length})` },
                { id: 'repeat', label: '🔁 Repeat Buyers' },
                { id: 'vip', label: '👑 VIP Spenders (₹1,000+)' },
                { id: 'dinein', label: '🍽️ Dine-In' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSegmentFilter(tab.id)}
                className={cn(
                  "px-3 py-1 text-xs font-bold rounded-full transition-all cursor-pointer shrink-0",
                  segmentFilter === tab.id
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted/70 text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Customer Directory Cards */}
        <div className="divide-y divide-border/60">
          {filteredCustomers.length > 0 ? (
            filteredCustomers.map((customer, idx) => (
              <div
                key={customer.id}
                className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-muted/20 transition-colors"
              >
                {/* Left: Customer Info */}
                <div className="flex items-start gap-3.5 min-w-0">
                  <Avatar className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl border border-border/60 shadow-xs shrink-0 mt-0.5">
                    {customer.imageUrl && <AvatarImage src={customer.imageUrl} alt={customer.name} />}
                    <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                      {customer.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm sm:text-base font-bold text-foreground truncate">
                        {customer.name}
                      </h4>
                      {idx === 0 && sortBy === 'spent' && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                          <Crown className="h-3 w-3" /> Top Spender
                        </span>
                      )}
                      {customer.totalOrders > 2 && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                          <Repeat className="h-2.5 w-2.5" /> Loyal
                        </span>
                      )}
                      {customer.isDineIn && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
                          <Utensils className="h-2.5 w-2.5" /> Dine-In
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                      {customer.contact && (
                        <a
                          href={`tel:${customer.contact}`}
                          className="flex items-center gap-1 hover:text-primary transition-colors"
                        >
                          <Phone className="h-3 w-3" />
                          {formatAndMaskContact(customer.contact)}
                        </a>
                      )}
                      {customer.address && (
                        <span className="flex items-center gap-1 truncate max-w-[250px]" title={customer.address}>
                          <MapPin className="h-3 w-3 shrink-0" />
                          {customer.address}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3 shrink-0" />
                        Last order {formatDistanceToNow(parseISO(customer.lastOrderDate), { addSuffix: true })}
                      </span>
                    </div>

                    {/* Favorite / Most Ordered Dishes */}
                    {customer.topItems.length > 0 && (
                      <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                          Favorites:
                        </span>
                        {customer.topItems.map((item) => (
                          <Badge
                            key={item.name}
                            variant="secondary"
                            className="text-[11px] font-semibold rounded-full px-2.5 py-0.5 bg-muted/80 text-foreground border border-border/50 shadow-2xs"
                          >
                            <span className="font-extrabold text-primary mr-1">{item.count}x</span>
                            <span>{item.name}</span>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Spend & Order Velocity Stats */}
                <div className="flex md:flex-col items-center md:items-end justify-between border-t md:border-t-0 pt-2 md:pt-0 shrink-0">
                  <div className="text-right">
                    <span className="text-base sm:text-lg font-extrabold text-foreground tracking-tight">
                      ₹{customer.totalSpent.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </span>
                    <p className="text-[11px] text-muted-foreground font-semibold">
                      {customer.totalOrders} {customer.totalOrders === 1 ? 'order' : 'orders'} completed
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-center p-6 text-muted-foreground">
              <Users className="h-10 w-10 opacity-30 mb-2" />
              <p className="text-sm font-semibold text-foreground">No customer records found</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {searchQuery ? 'Try searching with different keywords' : 'Customer records will appear here as orders complete'}
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
