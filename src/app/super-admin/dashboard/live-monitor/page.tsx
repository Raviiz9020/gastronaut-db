'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import {
  Activity,
  User,
  Store,
  MapPin,
  Phone,
  Clock,
  CreditCard,
  Bike,
  Search,
  CheckCircle2,
  AlertCircle,
  ShoppingBag,
  Receipt,
  Timer,
  Zap,
  PackageCheck,
  Navigation,
  ArrowRight,
  Bell,
  BellOff,
  UserPlus,
  Utensils,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  UserCog,
  Check,
  Sparkles,
  Layers,
  ChefHat,
  PackageOpen,
  Send,
  X,
  ChevronsUpDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { format } from 'date-fns';
import type { Order, OrderStatus } from '@/types';
import { useVendor } from '@/context/vendor-context';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';
import { useRiderManagement } from '@/context/rider-management-context';
import { useToast } from '@/hooks/use-toast';
import type { Rider } from '@/types';
import { batchResolveCities } from '@/lib/reverseGeocode';

const statusColors: Record<OrderStatus, string> = {
  'Order Placed': 'bg-blue-500',
  'Accepted': 'bg-cyan-500',
  'Processing': 'bg-amber-500',
  'Order Ready': 'bg-teal-500',
  'Picked Up': 'bg-indigo-600',
  'Out for Delivery': 'bg-orange-500',
  'Delivered': 'bg-emerald-500',
  'Cancelled': 'bg-rose-500',
};

// 5-Stage Delivery Pipeline
const PIPELINE_STAGES: { key: string; label: string; icon: any; matchStatuses: OrderStatus[] }[] = [
  { key: 'placed', label: 'Placed', icon: Zap, matchStatuses: ['Order Placed'] },
  { key: 'accepted', label: 'Accepted', icon: CheckCircle2, matchStatuses: ['Accepted'] },
  { key: 'kitchen', label: 'Kitchen Prep', icon: ChefHat, matchStatuses: ['Processing'] },
  { key: 'ready', label: 'Food Ready', icon: PackageCheck, matchStatuses: ['Order Ready'] },
  { key: 'transit', label: 'On Road', icon: Navigation, matchStatuses: ['Picked Up', 'Out for Delivery'] },
];

export default function LiveMonitorPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'delayed' | 'kitchen' | 'delivery' | 'unassigned' | 'unpaid'>('all');
  const [now, setNow] = useState(new Date());
  const { allVendors, fetchAllVendors } = useVendor();
  const { riders, fetchAllRiders } = useRiderManagement();
  const { toast } = useToast();
  const [cityMap, setCityMap] = useState<Record<string, string | null>>({});
  const resolvingRef = useRef(false);

  // Per-order collapse state (true = collapsed)
  const [collapsedOrders, setCollapsedOrders] = useState<Record<string, boolean>>({});

  // Audio alerts
  const [soundEnabled, setSoundEnabled] = useState(false);
  const prevOrderCountRef = useRef(0);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchAllVendors();
  }, [fetchAllVendors]);

  useEffect(() => {
    fetchAllRiders();
  }, [fetchAllRiders]);

  const approvedRiders = useMemo(() => {
    return riders.filter(r => r.isApproved === true);
  }, [riders]);

  // Reverse geocoding
  useEffect(() => {
    if (resolvingRef.current || orders.length === 0) return;
    resolvingRef.current = true;

    const coords: Array<{ id: string; lat: number | undefined | null; lng: number | undefined | null }> = [];

    for (const order of orders) {
      coords.push({
        id: `customer-${order.orderId}`,
        lat: order.customer.latitude,
        lng: order.customer.longitude,
      });
      coords.push({
        id: `vendor-${order.orderId}`,
        lat: order.vendorLatitude,
        lng: order.vendorLongitude,
      });
      if (order.assignedDeliveryBoyId) {
        const rider = riders.find(r => r.id === order.assignedDeliveryBoyId);
        if (rider) {
          coords.push({
            id: `rider-${order.orderId}`,
            lat: rider.currentLatitude,
            lng: rider.currentLongitude,
          });
        }
      }
    }

    const unresolved = coords.filter(c => !(c.id in cityMap));
    if (unresolved.length === 0) {
      resolvingRef.current = false;
      return;
    }

    batchResolveCities(unresolved).then((results) => {
      setCityMap(prev => ({ ...prev, ...results }));
      resolvingRef.current = false;
    }).catch(() => {
      resolvingRef.current = false;
    });
  }, [orders, riders, cityMap]);

  // Real-time Firestore snapshot
  useEffect(() => {
    const ordersRef = collection(db, 'orders');
    const q = query(
      ordersRef,
      where('deliveryOption', '==', 'Home Delivery'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedOrders = snapshot.docs.map(doc => ({
        orderId: doc.id,
        ...doc.data()
      } as Order));

      const activeOrders = fetchedOrders.filter(o =>
        o.status !== 'Delivered' && o.status !== 'Cancelled'
      );

      // Play alert sound if new orders arrived
      if (soundEnabled && prevOrderCountRef.current > 0 && activeOrders.length > prevOrderCountRef.current) {
        try {
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);
          osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.15);
          gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start();
          osc.stop(audioCtx.currentTime + 0.4);
        } catch (e) {
          console.log('Audio error', e);
        }
      }
      prevOrderCountRef.current = activeOrders.length;

      setOrders(activeOrders);
      setLoading(false);
    }, (error) => {
      console.error("Error listening to orders:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [soundEnabled]);

  const stats = useMemo(() => {
    const total = orders.length;
    const processing = orders.filter(o => ['Accepted', 'Processing', 'Order Ready'].includes(o.status)).length;
    const outForDelivery = orders.filter(o => o.status === 'Out for Delivery' || o.status === 'Picked Up').length;
    const unassigned = orders.filter(o => !o.assignedDeliveryBoyId).length;
    const unpaid = orders.filter(o => !o.paymentConfirmedAt).length;
    const delayed = orders.filter(o => {
      const start = new Date(o.createdAt).getTime();
      return (now.getTime() - start) / 1000 / 60 > 30 && o.status !== 'Out for Delivery';
    }).length;

    return { total, processing, outForDelivery, delayed, unassigned, unpaid };
  }, [orders, now]);

  const getVendorName = (username: string) => {
    const vendor = allVendors.find(v => v.username === username);
    return vendor?.shopName || vendor?.name || username;
  };

  const getVendorDetails = (username: string) => {
    return allVendors.find(v => v.username === username);
  };

  const handleAssignRider = async (orderId: string, rider: Rider) => {
    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, {
        assignedDeliveryBoyId: rider.id,
        assignedDeliveryBoyName: rider.name,
        assignedDeliveryBoyContact: rider.contact,
        assignedDeliveryBoyAt: new Date().toISOString(),
      });
      toast({
        title: "Rider Assigned",
        description: `${rider.name} assigned to order.`,
      });
    } catch (e: any) {
      console.error("Error assigning rider:", e);
      toast({
        title: "Error",
        description: e.message || "Failed to assign rider.",
        variant: "destructive"
      });
    }
  };

  const formatElapsedTime = (createdAt: string, endOverride?: string) => {
    const start = new Date(createdAt).getTime();
    const end = endOverride ? new Date(endOverride).getTime() : now.getTime();
    const diff = Math.floor((end - start) / 1000);
    if (diff < 0) return '0s';

    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);
    const s = diff % 60;

    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const getElapsedMinutes = (createdAt: string) => {
    const start = new Date(createdAt).getTime();
    return (now.getTime() - start) / 1000 / 60;
  };

  const getActivePipelineIndex = (status: OrderStatus) => {
    if (status === 'Order Placed') return 0;
    if (status === 'Accepted') return 1;
    if (status === 'Processing') return 2;
    if (status === 'Order Ready') return 3;
    if (status === 'Picked Up' || status === 'Out for Delivery') return 4;
    if (status === 'Delivered') return 5;
    return 0;
  };

  const toggleOrderCollapse = (orderId: string) => {
    setCollapsedOrders(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }));
  };

  const toggleAllCollapse = () => {
    const allCollapsed = orders.every(o => collapsedOrders[o.orderId]);
    const newState: Record<string, boolean> = {};
    orders.forEach(o => {
      newState[o.orderId] = !allCollapsed;
    });
    setCollapsedOrders(newState);
  };

  const filteredOrders = useMemo(() => {
    let list = orders;

    if (filterTab === 'delayed') {
      list = list.filter(o => getElapsedMinutes(o.createdAt) > 30 && o.status !== 'Out for Delivery');
    } else if (filterTab === 'kitchen') {
      list = list.filter(o => ['Accepted', 'Processing', 'Order Ready'].includes(o.status));
    } else if (filterTab === 'delivery') {
      list = list.filter(o => o.status === 'Out for Delivery' || o.status === 'Picked Up');
    } else if (filterTab === 'unassigned') {
      list = list.filter(o => !o.assignedDeliveryBoyId);
    } else if (filterTab === 'unpaid') {
      list = list.filter(o => !o.paymentConfirmedAt);
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      list = list.filter(o =>
        (o.displayId && o.displayId.toLowerCase().includes(q)) ||
        (o.orderId && o.orderId.toLowerCase().includes(q)) ||
        (o.customer.name && o.customer.name.toLowerCase().includes(q)) ||
        (o.assignedDeliveryBoyName && o.assignedDeliveryBoyName.toLowerCase().includes(q)) ||
        getVendorName(o.vendorUsername).toLowerCase().includes(q)
      );
    }

    return list;
  }, [orders, filterTab, searchTerm, allVendors, now]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-100px)] gap-4">
        <Activity className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground font-semibold text-sm">Connecting to real-time operations feed...</p>
      </div>
    );
  }

  const isAllOrdersCollapsed = orders.length > 0 && orders.every(o => collapsedOrders[o.orderId]);

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header Section (Clean, Faint Modern Cockpit Banner) */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-card via-card to-primary/[0.05] p-5 sm:p-6 border border-border/80 shadow-xs">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 shadow-2xs">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                LIVE RADAR STREAM
              </span>
              <span className="text-muted-foreground text-xs font-mono font-bold">
                {format(now, 'hh:mm:ss a')}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black font-headline text-foreground tracking-tight flex items-center gap-2.5">
              <span>Live Delivery Cockpit</span>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/25 font-extrabold">
                PRO OPS
              </span>
            </h1>
            <p className="text-xs text-muted-foreground font-medium">
              Real-time multi-kitchen dispatch stream & autonomous rider logistics
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Expand/Collapse All Button */}
            {orders.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={toggleAllCollapse}
                className="rounded-full text-xs font-bold gap-1.5 h-9 px-4 bg-background text-foreground border-border/80 hover:bg-muted shadow-2xs transition-all"
              >
                <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{isAllOrdersCollapsed ? "Expand All" : "Collapse All"}</span>
              </Button>
            )}

            {/* Sound Alert Toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={cn(
                "rounded-full text-xs font-bold gap-1.5 h-9 px-4 transition-all shadow-2xs",
                soundEnabled
                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/25"
                  : "bg-background text-foreground border-border/80 hover:bg-muted"
              )}
              title={soundEnabled ? "Sound Alert Active" : "Sound Alert Muted"}
            >
              {soundEnabled ? <Bell className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> : <BellOff className="h-3.5 w-3.5 text-muted-foreground" />}
              <span>{soundEnabled ? "Audio On" : "Audio Off"}</span>
            </Button>

            {/* Active Missions Glowing Pill */}
            <div className="h-9 px-4 bg-primary text-primary-foreground rounded-full shadow-xs flex items-center gap-1.5 font-black text-xs">
              <Zap className="h-3.5 w-3.5 fill-current animate-pulse" />
              <span>{orders.length} ACTIVE MISSIONS</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4-KPI Bento Stats Shelf */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-card p-4 rounded-2xl border border-border/70 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Total Active</span>
            <Activity className="h-4 w-4 text-primary" />
          </div>
          <p className="text-2xl font-black text-foreground">{stats.total}</p>
          <p className="text-[10px] text-muted-foreground font-medium">Home delivery orders</p>
        </div>

        <div className="bg-card p-4 rounded-2xl border border-border/70 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">In Kitchen</span>
            <Utensils className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400">{stats.processing}</p>
          <p className="text-[10px] text-muted-foreground font-medium">Preparing food</p>
        </div>

        <div className="bg-card p-4 rounded-2xl border border-border/70 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">On The Road</span>
            <Navigation className="h-4 w-4 text-blue-500" />
          </div>
          <p className="text-2xl font-black text-blue-600 dark:text-blue-400">{stats.outForDelivery}</p>
          <p className="text-[10px] text-muted-foreground font-medium">Out with rider</p>
        </div>

        <div className={cn(
          "bg-card p-4 rounded-2xl border shadow-2xs space-y-1 transition-all",
          stats.delayed > 0 ? "border-rose-500/50 bg-rose-500/5" : "border-border/70"
        )}>
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Delayed (&gt;30m)</span>
            <AlertTriangle className={cn("h-4 w-4", stats.delayed > 0 ? "text-rose-600 animate-pulse" : "text-muted-foreground")} />
          </div>
          <p className={cn("text-2xl font-black", stats.delayed > 0 ? "text-rose-600" : "text-foreground")}>{stats.delayed}</p>
          <p className="text-[10px] text-muted-foreground font-medium">{stats.unassigned} unassigned rider</p>
        </div>
      </div>

      {/* Search & Filter Tabs Ribbon */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-card p-3 sm:p-4 rounded-2xl border border-border/70 shadow-2xs">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search Order ID, Customer, Store, Rider..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-8 h-9 text-xs rounded-full border-border/70 bg-background"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full"
              onClick={() => setSearchTerm('')}
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          )}
        </div>

        {/* 1-Tap Quick Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 hide-scrollbar">
          <button
            type="button"
            onClick={() => setFilterTab('all')}
            className={cn(
              "px-3 py-1 text-xs font-bold rounded-full transition-all shrink-0 cursor-pointer border",
              filterTab === 'all'
                ? "bg-primary text-primary-foreground border-primary shadow-2xs"
                : "bg-muted text-muted-foreground border-border/50 hover:text-foreground"
            )}
          >
            All Active ({orders.length})
          </button>

          <button
            type="button"
            onClick={() => setFilterTab('delayed')}
            className={cn(
              "px-3 py-1 text-xs font-bold rounded-full transition-all shrink-0 cursor-pointer border",
              filterTab === 'delayed'
                ? "bg-rose-600 text-white border-rose-600 shadow-2xs"
                : "bg-muted text-muted-foreground border-border/50 hover:text-foreground"
            )}
          >
            ⚠️ Delayed ({stats.delayed})
          </button>

          <button
            type="button"
            onClick={() => setFilterTab('kitchen')}
            className={cn(
              "px-3 py-1 text-xs font-bold rounded-full transition-all shrink-0 cursor-pointer border",
              filterTab === 'kitchen'
                ? "bg-amber-600 text-white border-amber-600 shadow-2xs"
                : "bg-muted text-muted-foreground border-border/50 hover:text-foreground"
            )}
          >
            🍳 In Kitchen ({stats.processing})
          </button>

          <button
            type="button"
            onClick={() => setFilterTab('delivery')}
            className={cn(
              "px-3 py-1 text-xs font-bold rounded-full transition-all shrink-0 cursor-pointer border",
              filterTab === 'delivery'
                ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                : "bg-muted text-muted-foreground border-border/50 hover:text-foreground"
            )}
          >
            🛵 On Road ({stats.outForDelivery})
          </button>

          <button
            type="button"
            onClick={() => setFilterTab('unassigned')}
            className={cn(
              "px-3 py-1 text-xs font-bold rounded-full transition-all shrink-0 cursor-pointer border",
              filterTab === 'unassigned'
                ? "bg-purple-600 text-white border-purple-600 shadow-2xs"
                : "bg-muted text-muted-foreground border-border/50 hover:text-foreground"
            )}
          >
            👤 Needs Rider ({stats.unassigned})
          </button>

          <button
            type="button"
            onClick={() => setFilterTab('unpaid')}
            className={cn(
              "px-3 py-1 text-xs font-bold rounded-full transition-all shrink-0 cursor-pointer border",
              filterTab === 'unpaid'
                ? "bg-orange-600 text-white border-orange-600 shadow-2xs"
                : "bg-muted text-muted-foreground border-border/50 hover:text-foreground"
            )}
          >
            💳 Awaiting Pay ({stats.unpaid})
          </button>
        </div>
      </div>

      {/* Dispatch Mission Cards Container */}
      <div className="space-y-3.5">
        <AnimatePresence mode="popLayout">
          {filteredOrders.map((order, index) => {
            const vendor = getVendorDetails(order.vendorUsername);
            const elapsedMins = getElapsedMinutes(order.createdAt);
            const isDelayed = elapsedMins > 30 && order.status !== 'Out for Delivery';
            const isModerate = elapsedMins > 15 && !isDelayed;
            const currentStageIndex = getActivePipelineIndex(order.status);
            const isCollapsed = !!collapsedOrders[order.orderId];

            return (
              <motion.div
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.25, delay: index * 0.03 }}
                key={order.orderId}
                className={cn(
                  "bg-card rounded-3xl border transition-all overflow-hidden shadow-xs hover:shadow-md",
                  isDelayed
                    ? "border-rose-500/60 ring-1 ring-rose-500/20"
                    : "border-border/80"
                )}
              >
                {/* 1. HEADER BANNER (Always Visible - Key Summary) */}
                <div
                  onClick={() => toggleOrderCollapse(order.orderId)}
                  className={cn(
                    "p-4 sm:px-6 sm:py-3.5 flex flex-wrap items-center justify-between gap-3 cursor-pointer transition-colors select-none",
                    isDelayed ? "bg-rose-500/[0.06] hover:bg-rose-500/[0.09]" : "bg-muted/30 hover:bg-muted/50",
                    !isCollapsed && "border-b border-border/60"
                  )}
                >
                  {/* Left: Order ID, Timer, Delay & Route Snippet */}
                  <div className="flex flex-wrap items-center gap-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className={cn(
                        "w-2.5 h-2.5 rounded-full shrink-0",
                        isDelayed ? "bg-rose-500 animate-ping" : isModerate ? "bg-amber-500" : "bg-emerald-500"
                      )} />
                      <span className="text-base font-black font-headline text-foreground tracking-tight">
                        {order.displayId || `#${order.orderId.slice(0, 6)}`}
                      </span>
                    </div>

                    <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(order.createdAt), 'hh:mm a')}
                    </span>

                    {/* Elapsed Time Pill */}
                    <span className={cn(
                      "inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full",
                      isDelayed
                        ? "bg-rose-500 text-white shadow-xs animate-bounce"
                        : isModerate
                          ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                          : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                    )}>
                      <Timer className="h-3 w-3" />
                      {formatElapsedTime(order.createdAt)}
                      {isDelayed && " DELAYED"}
                    </span>

                    {/* When collapsed, show quick route snippet & rider */}
                    {isCollapsed && (
                      <div className="hidden md:flex items-center gap-2 text-xs font-bold pl-2 border-l border-border/60">
                        <span className="text-foreground truncate max-w-[140px] flex items-center gap-1">
                          <Store className="h-3 w-3 text-primary" />
                          {getVendorName(order.vendorUsername)}
                        </span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        <span className="text-foreground truncate max-w-[120px] flex items-center gap-1">
                          <User className="h-3 w-3 text-blue-500" />
                          {order.customer.name}
                        </span>
                        <span className="text-muted-foreground mx-1">•</span>
                        {order.assignedDeliveryBoyName ? (
                          <span className="text-blue-600 dark:text-blue-400 flex items-center gap-1 font-semibold">
                            <Bike className="h-3 w-3" /> {order.assignedDeliveryBoyName}
                          </span>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400 font-extrabold flex items-center gap-1">
                            ⚠️ Needs Rider
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right: Payment Status, Status Pill, Total & Collapse Toggle */}
                  <div className="flex items-center gap-2.5">
                    {/* Payment Badge */}
                    <div className="flex items-center gap-1 bg-background/90 px-2.5 py-1 rounded-full border border-border/60 text-xs">
                      <CreditCard className="h-3 w-3 text-muted-foreground" />
                      <span className="text-[10px] font-bold uppercase">{order.paymentMethod || 'Online'}</span>
                      {order.paymentConfirmedAt ? (
                        <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 px-1.5 py-0.2 rounded-md">
                          PAID
                        </span>
                      ) : (
                        <span className="text-[9px] font-black text-amber-600 dark:text-amber-400 bg-amber-500/15 px-1.5 py-0.2 rounded-md">
                          AWAITING
                        </span>
                      )}
                    </div>

                    {/* Status Pill */}
                    <span className={cn(
                      "px-2.5 py-0.5 rounded-full text-[11px] font-black text-white uppercase tracking-wider shadow-2xs",
                      statusColors[order.status] || "bg-primary"
                    )}>
                      {order.status}
                    </span>

                    {/* Order Total */}
                    <span className="text-base sm:text-lg font-black text-foreground">
                      ₹{order.totalPrice.toFixed(2)}
                    </span>

                    {/* Collapse / Expand Chevron */}
                    <div className="w-7 h-7 rounded-full bg-background border border-border/60 flex items-center justify-center text-muted-foreground ml-1">
                      {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                    </div>
                  </div>
                </div>

                {/* EXPANDED SECTION */}
                {!isCollapsed && (
                  <div className="animate-in fade-in-50 duration-200">
                    {/* 2. 3-PILLAR DISPATCH TRIANGLE (Store ➔ Rider ➔ Customer) */}
                    <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-3 gap-4 bg-card/60">
                      {/* Pillar 1: Store Hub */}
                      <div className="p-3.5 rounded-2xl bg-muted/30 border border-border/50 flex flex-col justify-between space-y-3">
                        <div>
                          <div className="flex items-center justify-between text-muted-foreground mb-1.5">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 text-primary">
                              <Store className="h-3 w-3" /> Partner Kitchen
                            </span>
                            {cityMap[`vendor-${order.orderId}`] && (
                              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                📍 {cityMap[`vendor-${order.orderId}`]}
                              </span>
                            )}
                          </div>
                          <h4 className="text-sm font-extrabold text-foreground leading-snug">
                            {getVendorName(order.vendorUsername)}
                          </h4>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {vendor?.address || 'Address on file'}
                          </p>
                        </div>

                        {/* Store Phone Button (Icon + Phone Number) */}
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full rounded-full text-xs font-bold h-8 border-border/70 hover:bg-primary/10 hover:text-primary transition-all"
                          onClick={() => window.open(`tel:${vendor?.contact || order.vendorContact}`)}
                        >
                          <Phone className="h-3.5 w-3.5 mr-1.5 text-primary" />
                          <span>{vendor?.contact || order.vendorContact || 'No Contact'}</span>
                        </Button>
                      </div>

                      {/* Pillar 2: Logistics & Rider Hub (Center) */}
                      <div className={cn(
                        "p-3.5 rounded-2xl border flex flex-col justify-between space-y-3 transition-all",
                        order.assignedDeliveryBoyId
                          ? "bg-muted/30 border-border/50"
                          : "bg-amber-500/[0.07] border-amber-500/40 ring-1 ring-amber-500/20"
                      )}>
                        <div>
                          <div className="flex items-center justify-between text-muted-foreground mb-1.5">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 text-blue-500">
                              <Bike className="h-3 w-3" /> Delivery Partner
                            </span>
                            {order.assignedDeliveryBoyId && cityMap[`rider-${order.orderId}`] && (
                              <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">
                                📍 {cityMap[`rider-${order.orderId}`]}
                              </span>
                            )}
                          </div>

                          {order.assignedDeliveryBoyId ? (
                            <div>
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs shrink-0">
                                  {order.assignedDeliveryBoyName?.charAt(0).toUpperCase() || 'R'}
                                </div>
                                <div className="min-w-0">
                                  <h4 className="text-sm font-extrabold text-foreground truncate">
                                    {order.assignedDeliveryBoyName}
                                  </h4>
                                  <p className="text-xs text-muted-foreground">
                                    {order.assignedDeliveryBoyContact}
                                  </p>
                                </div>
                              </div>
                              {order.assignedDeliveryBoyAt && (
                                <p className="text-[10px] text-muted-foreground mt-2 font-medium">
                                  Assigned {formatElapsedTime(order.assignedDeliveryBoyAt)} ago
                                </p>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-extrabold text-xs">
                                <AlertCircle className="h-4 w-4" />
                                <span>No Rider Assigned Yet</span>
                              </div>
                              <p className="text-[11px] text-muted-foreground">
                                Assign an approved delivery rider to pick up this order.
                              </p>
                            </div>
                          )}
                        </div>

                        {order.assignedDeliveryBoyId ? (
                          <div className="flex items-center gap-2">
                            {/* Rider Phone Button (Icon + Phone Number) */}
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 rounded-full text-xs font-bold h-8 border-border/70 hover:bg-blue-500/10 hover:text-blue-600"
                              onClick={() => window.open(`tel:${order.assignedDeliveryBoyContact}`)}
                            >
                              <Phone className="h-3.5 w-3.5 mr-1.5 text-blue-500" />
                              <span>{order.assignedDeliveryBoyContact || 'No Contact'}</span>
                            </Button>
                            <AssignRiderDialog
                              order={order}
                              approvedRiders={approvedRiders}
                              onAssign={(rider) => handleAssignRider(order.orderId, rider)}
                            />
                          </div>
                        ) : (
                          <AssignRiderDialog
                            order={order}
                            approvedRiders={approvedRiders}
                            onAssign={(rider) => handleAssignRider(order.orderId, rider)}
                          />
                        )}
                      </div>

                      {/* Pillar 3: Customer Hub */}
                      <div className="p-3.5 rounded-2xl bg-muted/30 border border-border/50 flex flex-col justify-between space-y-3">
                        <div>
                          <div className="flex items-center justify-between text-muted-foreground mb-1.5">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                              <User className="h-3 w-3" /> Drop-off Destination
                            </span>
                            {cityMap[`customer-${order.orderId}`] && (
                              <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                                📍 {cityMap[`customer-${order.orderId}`]}
                              </span>
                            )}
                          </div>
                          <h4 className="text-sm font-extrabold text-foreground leading-snug">
                            {order.customer.name}
                          </h4>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {order.customer.address || 'Address provided'}
                          </p>
                        </div>

                        {/* Customer Phone Button (Icon + Phone Number) */}
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full rounded-full text-xs font-bold h-8 border-border/70 hover:bg-emerald-500/10 hover:text-emerald-600 transition-all"
                          onClick={() => window.open(`tel:${order.customer.contact}`)}
                        >
                          <Phone className="h-3.5 w-3.5 mr-1.5 text-emerald-600" />
                          <span>{order.customer.contact || 'No Contact'}</span>
                        </Button>
                      </div>
                    </div>

                    {/* 3. LIVE DELIVERY PIPELINE STEPPER */}
                    <div className="px-4 sm:px-6 py-3 border-t border-border/50 bg-muted/10">
                      <div className="grid grid-cols-5 gap-1 sm:gap-2">
                        {PIPELINE_STAGES.map((stage, idx) => {
                          const isPassed = currentStageIndex > idx;
                          const isCurrent = currentStageIndex === idx;
                          const Icon = stage.icon;

                          return (
                            <div key={stage.key} className="flex flex-col items-center text-center space-y-1">
                              <div className={cn(
                                "w-full h-1.5 rounded-full transition-all",
                                isPassed || isCurrent
                                  ? "bg-primary shadow-xs"
                                  : "bg-muted border border-border/60"
                              )} />
                              <div className="flex items-center gap-1 mt-1">
                                <Icon className={cn(
                                  "h-3 w-3",
                                  isCurrent ? "text-primary animate-pulse" : isPassed ? "text-primary/70" : "text-muted-foreground"
                                )} />
                                <span className={cn(
                                  "text-[10px] font-bold truncate hidden sm:inline",
                                  isCurrent ? "text-primary font-black" : isPassed ? "text-foreground" : "text-muted-foreground"
                                )}>
                                  {stage.label}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* 4. BOTTOM MANIFEST TRAY & CUSTOMER NOTES */}
                    <div className="p-4 sm:px-6 sm:py-3.5 border-t border-border/60 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      {/* Item Chips Preview */}
                      <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground mr-1 shrink-0 flex items-center gap-1">
                          <ShoppingBag className="h-3 w-3 text-primary" /> {order.items.length} Items:
                        </span>
                        {order.items.map((item, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-background/90 text-foreground border border-border/60"
                          >
                            {item.quantity}x {item.name}
                          </span>
                        ))}
                        {order.customNotes && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                            💬 "{order.customNotes}"
                          </span>
                        )}
                      </div>

                      {/* Full Itemized Modal Trigger */}
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="rounded-full text-xs font-bold text-primary hover:bg-primary/10 h-7 shrink-0 gap-1 self-end sm:self-auto"
                          >
                            <Receipt className="h-3.5 w-3.5" />
                            <span>View Full Breakdown</span>
                            <ChevronRight className="h-3 w-3" />
                          </Button>
                        </DialogTrigger>

                        <DialogContent className="max-w-md rounded-3xl p-6 bg-card border border-border/80">
                          <DialogHeader className="pb-3 border-b border-border/60">
                            <DialogTitle className="text-lg font-bold font-headline flex items-center gap-2">
                              <Receipt className="h-5 w-5 text-primary" />
                              <span>Order #{order.displayId || order.orderId.slice(0, 6)} Breakdown</span>
                            </DialogTitle>
                          </DialogHeader>

                          <div className="space-y-4 py-2">
                            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                              {order.items.map((item, i) => (
                                <div key={i} className="flex justify-between items-start p-2.5 rounded-xl bg-muted/40 border border-border/40 text-xs">
                                  <div>
                                    <span className="font-bold text-foreground">{item.quantity}x {item.name}</span>
                                    <span className="text-[10px] text-muted-foreground block">₹{item.price.toFixed(2)} each</span>
                                  </div>
                                  <span className="font-extrabold text-foreground">₹{(item.quantity * item.price).toFixed(2)}</span>
                                </div>
                              ))}
                            </div>

                            {order.customNotes && (
                              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs space-y-0.5">
                                <span className="font-bold text-amber-700 dark:text-amber-400 block text-[10px] uppercase">
                                  Cooking Notes
                                </span>
                                <p className="text-foreground italic">"{order.customNotes}"</p>
                              </div>
                            )}

                            <div className="pt-2 border-t border-border/60 flex justify-between items-center text-sm">
                              <span className="font-bold text-muted-foreground">Grand Total:</span>
                              <span className="text-xl font-black text-primary">₹{order.totalPrice.toFixed(2)}</span>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {!loading && filteredOrders.length === 0 && (
          <div className="text-center py-24 bg-card rounded-3xl border border-dashed border-border/80 space-y-3">
            <Activity className="h-10 w-10 text-muted-foreground mx-auto" />
            <p className="text-sm font-bold text-foreground">No active delivery orders right now</p>
            <p className="text-xs text-muted-foreground">New customer delivery orders will appear here in real time.</p>
            {filterTab !== 'all' && (
              <Button
                variant="outline"
                size="sm"
                className="rounded-full text-xs"
                onClick={() => { setFilterTab('all'); setSearchTerm(''); }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function AssignRiderDialog({
  order,
  approvedRiders,
  onAssign
}: {
  order: Order;
  approvedRiders: Rider[];
  onAssign: (rider: Rider) => Promise<void>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    return approvedRiders.filter(r =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.contact.includes(search)
    );
  }, [approvedRiders, search]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) setSearch('');
    }}>
      <DialogTrigger asChild>
        {order.assignedDeliveryBoyId ? (
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2.5 rounded-full text-xs font-bold border-border/70 text-muted-foreground hover:text-foreground shrink-0"
            title="Change Rider"
          >
            <UserCog className="h-3.5 w-3.5 mr-1" />
            Change
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="w-full rounded-full text-xs font-black h-8 border-amber-500/50 bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-xs"
          >
            <UserPlus className="h-3.5 w-3.5 mr-1" />
            Assign Rider
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-sm rounded-3xl p-6 bg-card border border-border/80">
        <DialogHeader className="pb-3 border-b border-border/60">
          <DialogTitle className="text-base font-bold font-headline flex items-center gap-2">
            <Bike className="h-4 w-4 text-primary" />
            <span>{order.assignedDeliveryBoyId ? 'Change Assigned Rider' : 'Assign Delivery Rider'}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 pt-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search approved rider..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs rounded-full border-border/70"
            />
          </div>

          <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
            {filtered.length === 0 ? (
              <p className="text-center py-6 text-xs text-muted-foreground font-semibold">No approved riders found</p>
            ) : (
              filtered.map((rider) => {
                const isSelected = order.assignedDeliveryBoyId === rider.id;
                return (
                  <div
                    key={rider.id}
                    onClick={() => {
                      onAssign(rider);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all text-xs",
                      isSelected
                        ? "border-primary bg-primary/10 font-bold"
                        : "border-border/50 hover:bg-muted/50"
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center font-bold text-foreground">
                        {rider.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-foreground">{rider.name}</p>
                        <p className="text-[10px] text-muted-foreground">{rider.contact}</p>
                      </div>
                    </div>
                    {isSelected && (
                      <span className="text-[10px] bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-bold">
                        Current
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
