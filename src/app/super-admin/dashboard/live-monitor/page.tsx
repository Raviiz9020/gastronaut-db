'use client';

import { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Activity,
  User,
  Store,
  MapPin,
  Phone,
  Clock,
  CreditCard,
  Bike,
  ExternalLink,
  ChevronRight,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ShoppingBag,
  Receipt,
  Timer,
  Zap,
  PackageCheck,
  Navigation,
  ArrowRight
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
import { X, UserCog } from 'lucide-react';
import { useRiderManagement } from '@/context/rider-management-context';
import { useToast } from '@/hooks/use-toast';
import type { Rider } from '@/types';

const statusColors: Record<OrderStatus, string> = {
  'Order Placed': 'bg-blue-500',
  'Accepted': 'bg-cyan-500',
  'Processing': 'bg-yellow-500',
  'Out for Delivery': 'bg-orange-500',
  'Delivered': 'bg-green-500',
  'Cancelled': 'bg-red-500',
  'Order Ready': 'bg-teal-500',
  'Picked Up': 'bg-green-600',
};

const statusBorderColors: Record<OrderStatus, string> = {
  'Order Placed': 'border-l-blue-500',
  'Accepted': 'border-l-cyan-500',
  'Processing': 'border-l-yellow-500',
  'Out for Delivery': 'border-l-orange-500',
  'Delivered': 'border-l-green-500',
  'Cancelled': 'border-l-red-500',
  'Order Ready': 'border-l-teal-500',
  'Picked Up': 'border-l-green-600',
};

export default function LiveMonitorPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [now, setNow] = useState(new Date());
  const { allVendors, fetchAllVendors } = useVendor();
  const { riders, fetchAllRiders } = useRiderManagement();
  const { toast } = useToast();

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

      setOrders(activeOrders);
      setLoading(false);
    }, (error) => {
      console.error("Error listening to orders:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const stats = useMemo(() => {
    const total = orders.length;
    const processing = orders.filter(o => ['Accepted', 'Processing', 'Order Ready'].includes(o.status)).length;
    const outForDelivery = orders.filter(o => o.status === 'Out for Delivery' || o.status === 'Picked Up').length;
    const delayed = orders.filter(o => {
      const start = new Date(o.createdAt).getTime();
      return (now.getTime() - start) / 1000 / 60 > 30 && o.status !== 'Out for Delivery';
    }).length;

    return { total, processing, outForDelivery, delayed };
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
        title: "Success",
        description: `Rider ${rider.name} assigned successfully.`,
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

  const filteredOrders = useMemo(() => {
    return orders.filter(o =>
      o.displayId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getVendorName(o.vendorUsername).toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [orders, searchTerm, allVendors]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-100px)] gap-4">
        <Activity className="h-10 w-10 animate-pulse text-primary" />
        <p className="text-muted-foreground font-medium">Connecting to live telemetry...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:px-8 md:pt-4 md:pb-8 space-y-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full" />
      </div>

      {/* Header Section */}
      <div className="relative z-10 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-rose-500 bg-rose-50 w-fit px-3 py-1 rounded-full border border-rose-100">
            <Activity className="h-3 w-3 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Live Stream</span>
          </div>
          <h2 className="text-4xl font-black tracking-tight text-slate-900">
            Command <span className="text-primary italic">Center</span>
          </h2>
          <p className="text-slate-400 text-sm font-medium">Monitoring {filteredOrders.length} active delivery operations.</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Search Telemetry..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-11 w-64 md:w-80 bg-white/80 backdrop-blur-md border-slate-200 focus:ring-primary/20 rounded-2xl shadow-sm h-12 font-medium"
            />
          </div>
          <div className="h-12 px-6 bg-slate-900 text-white rounded-2xl shadow-xl flex items-center gap-2 font-black text-sm">
            <Zap className="h-4 w-4 text-yellow-400 fill-yellow-400" />
            {filteredOrders.length} ACTIVE
          </div>
        </div>
      </div>

      {/* Stats Quick-Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <QuickStat title="Total Active" value={stats.total} icon={<Activity className="h-4 w-4" />} color="blue" />
        <QuickStat title="In Preparation" value={stats.processing} icon={<PackageCheck className="h-4 w-4" />} color="emerald" />
        <QuickStat title="On The Road" value={stats.outForDelivery} icon={<Navigation className="h-4 w-4" />} color="orange" />
        <QuickStat title="Delayed Operations" value={stats.delayed} icon={<AlertCircle className="h-4 w-4" />} color="rose" alert={stats.delayed > 0} />
      </div>

      {/* Command Dashboard */}
      <div className="relative z-10">
        <Table className="border-separate border-spacing-y-4 min-w-[1100px]">
          <TableHeader className="[&_tr]:border-b-0">
            <TableRow className="hover:bg-transparent">
              <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-widest pb-2 pl-6">Mission Entity</TableHead>
              <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-widest pb-2">Transaction</TableHead>
              <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-widest pb-2">Logistics Unit</TableHead>
              <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-widest pb-2">Mission Status</TableHead>
              <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-widest pb-2">Manifest</TableHead>
              <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-widest pb-2 text-right pr-6">Logistics Route</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <AnimatePresence mode="popLayout">
              {filteredOrders.map((order, index) => {
                const vendor = getVendorDetails(order.vendorUsername);
                return (
                  <motion.tr
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    key={order.orderId}
                    className={cn(
                      "group bg-white hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 shadow-lg shadow-slate-200/50 border-l-[6px]",
                      statusBorderColors[order.status]
                    )}
                  >
                    {/* 1. Order Info */}
                    <TableCell className="py-6 pl-8 rounded-l-[24px]">
                      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex flex-col gap-2 w-fit h-32 justify-center">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "w-2.5 h-2.5 rounded-full animate-pulse",
                            (now.getTime() - new Date(order.createdAt).getTime()) / 1000 / 60 > 30 && order.status !== 'Out for Delivery' ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]" : "bg-emerald-500"
                          )} />
                          <span className="font-black text-slate-900 text-lg tracking-tighter">{order.displayId || `#${order.orderId.slice(0, 6)}`}</span>
                          {(now.getTime() - new Date(order.createdAt).getTime()) / 1000 / 60 > 30 && order.status !== 'Out for Delivery' && (
                            <Badge className="bg-rose-500 text-white text-[8px] font-black px-1.5 h-4 border-none animate-bounce">DELAYED</Badge>
                          )}
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                            <Clock className="h-3 w-3" />
                            {format(new Date(order.createdAt), 'hh:mm a')}
                          </div>
                          <div className="flex items-center gap-1.5 text-orange-600 font-black bg-white px-2.5 py-1 rounded-xl w-fit border border-orange-100 animate-pulse text-[11px]">
                            <Timer className="h-3.5 w-3.5" />
                            {formatElapsedTime(order.createdAt)}
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    {/* 2. Payment */}
                    <TableCell>
                      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex flex-col gap-2 w-40 h-32 justify-center">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-white rounded-lg shadow-sm">
                            <CreditCard className="h-3.5 w-3.5 text-slate-400" />
                          </div>
                          <span className="font-black text-[10px] text-slate-900 uppercase tracking-widest">{order.paymentMethod}</span>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          {order.paymentConfirmedAt ? (
                            <div className="flex flex-col gap-1">
                              <Badge className="bg-emerald-500 hover:bg-emerald-600 text-[10px] font-black h-5 px-3 w-fit rounded-full">PAID</Badge>
                              <span className="text-[9px] text-emerald-600 font-black uppercase tracking-tighter">
                                Latency: {formatElapsedTime(order.paymentRequestedAt || order.createdAt, order.paymentConfirmedAt)}
                              </span>
                              {order.paymentStatus && order.paymentStatus !== 'Paid' && (
                                <span className="text-[8px] text-slate-500 font-black uppercase tracking-[0.1em] mt-0.5">
                                  {order.paymentStatus}
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="flex flex-col gap-1">
                              <Badge className="bg-orange-500 hover:bg-orange-600 text-[10px] font-black h-5 px-3 w-fit animate-pulse rounded-full">AWAITING</Badge>
                              {order.paymentRequestedAt && (
                                <span className="text-[9px] text-orange-600 font-black animate-pulse uppercase tracking-tighter">
                                  Live: {formatElapsedTime(order.paymentRequestedAt)}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    {/* 3. Logistics Unit */}
                    <TableCell>
                      {order.assignedDeliveryBoyId ? (
                        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 w-fit h-32 flex items-center justify-center gap-1">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" className="p-0 h-auto hover:bg-transparent flex items-center gap-3 group/rider text-left">
                                <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center group-hover/rider:scale-110 transition-transform">
                                  <Bike className="h-5 w-5 text-primary" />
                                </div>
                                <div className="flex flex-col gap-0.5 items-start">
                                  <span className="font-black text-slate-900 text-xs group-hover/rider:text-primary transition-colors">{order.assignedDeliveryBoyName}</span>
                                  {order.riderStatus && (
                                    <Badge className="h-4 px-1.5 text-[8px] font-black bg-blue-600 text-white border-none rounded-[4px] uppercase tracking-widest mb-1 shadow-sm">
                                      {order.riderStatus}
                                    </Badge>
                                  )}
                                  <span className="text-[9px] text-primary font-black bg-white px-2 py-0.5 rounded-full border border-blue-100 w-fit animate-pulse">
                                    {formatElapsedTime(order.assignedDeliveryBoyAt || order.createdAt)}
                                  </span>
                                </div>
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="rounded-[32px] sm:max-w-[425px] p-0 overflow-hidden border-none shadow-2xl [&>button]:hidden">
                              <div className="bg-slate-900 p-6 text-white relative">
                                <DialogTitle className="flex items-center gap-2 font-black">
                                  <Bike className="h-5 w-5 text-yellow-400" /> LOGISTICS UNIT
                                </DialogTitle>
                                <DialogClose className="absolute right-6 top-6 p-1.5 rounded-full hover:bg-white/10 transition-colors">
                                  <X className="h-5 w-5 text-white" />
                                </DialogClose>
                              </div>
                              <div className="p-6 space-y-4 bg-white">
                                <div className="flex items-center gap-4">
                                  <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-900 font-black text-2xl border border-slate-200">
                                    {order.assignedDeliveryBoyName?.charAt(0) || 'R'}
                                  </div>
                                  <div className="flex-1">
                                    <p className="font-black text-slate-900 text-xl">{order.assignedDeliveryBoyName}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                      <Badge className="bg-slate-100 text-slate-600 border-slate-200 font-black text-[9px] px-2 py-0.5 uppercase tracking-widest">{order.riderStatus || 'ACTIVE'}</Badge>
                                    </div>
                                  </div>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-2xl space-y-3 border border-slate-100">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contact Signal</span>
                                    <span className="text-sm font-black text-slate-900">{order.assignedDeliveryBoyContact}</span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active On Mission</span>
                                    <span className="text-sm font-black text-primary uppercase tracking-tighter">{formatElapsedTime(order.assignedDeliveryBoyAt || order.createdAt)}</span>
                                  </div>
                                </div>
                                <Button className="w-full h-12 rounded-xl font-black bg-slate-900 hover:bg-slate-800 text-white shadow-lg" onClick={() => window.open(`tel:${order.assignedDeliveryBoyContact}`)}>
                                  ESTABLISH CONTACT
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
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
                    </TableCell>

                    {/* 4. Mission Status */}
                    <TableCell>
                      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex flex-col items-end gap-2 w-fit h-32 justify-center">
                        <Badge className={cn(
                          "rounded-xl px-5 py-2 text-[11px] font-black shadow-lg uppercase tracking-[0.1em] border-none",
                          statusColors[order.status],
                          "text-white"
                        )}>
                          {order.status}
                        </Badge>
                        <div className="flex flex-col items-end">
                          <span className="text-xl font-black text-slate-900 tracking-tighter">₹{order.totalPrice.toFixed(2)}</span>
                          <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Total Transaction</span>
                        </div>
                      </div>
                    </TableCell>

                    {/* 5. Manifest */}
                    <TableCell>
                      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex flex-col gap-1 w-fit h-32 justify-center">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" className="p-0 h-auto hover:bg-transparent flex flex-col items-start gap-1 group/item">
                              <div className="flex items-center gap-2 font-black text-slate-800 text-sm group-hover/item:text-primary transition-colors">
                                <ShoppingBag className="h-4 w-4 text-slate-300" />
                                {order.items.length} Units
                                {(order.customNotes || order.items.some(i => i.customizationDetails && Object.entries(i.customizationDetails || {}).length > 0)) && (
                                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                )}
                              </div>
                              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight truncate max-w-[150px]">
                                {order.items.slice(0, 2).map(item => item.name).join(', ')}
                                {order.items.length > 2 && '...'}
                              </span>
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="rounded-[40px] border-none shadow-2xl p-0 overflow-hidden max-w-2xl [&>button]:hidden">
                            <div className="bg-slate-900 p-8 text-white relative">
                              <DialogHeader>
                                <DialogTitle className="flex items-center gap-3 text-2xl font-black">
                                  <div className="p-2 bg-primary rounded-xl text-white">
                                    <Receipt className="h-6 w-6" />
                                  </div>
                                  MISSION MANIFEST
                                </DialogTitle>
                              </DialogHeader>
                              <DialogClose className="absolute right-8 top-8 p-2 rounded-full hover:bg-white/10 transition-colors">
                                <X className="h-6 w-6 text-white" />
                              </DialogClose>
                            </div>
                            <div className="p-8 space-y-6 bg-white">
                              <div className="bg-slate-50 rounded-[32px] overflow-hidden border border-slate-100">
                                {order.items.map((item, i) => (
                                  <div key={i} className={cn(
                                    "p-5 flex justify-between items-center",
                                    i !== order.items.length - 1 && "border-b border-slate-100"
                                  )}>
                                    <div className="flex items-center gap-4">
                                      <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center font-black text-slate-900 border border-slate-200">
                                        {item.quantity}x
                                      </div>
                                      <div className="flex flex-col">
                                        <p className="font-black text-slate-900">{item.name}</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">₹{item.price.toFixed(2)} / Unit</p>

                                        {/* CUSTOMIZATIONS (Web/Standard) */}
                                        {((item as any).customizationDetails || (item as any).selectedOptions || (item.customizations && item.customizations.length > 0)) && (
                                          <div className="flex flex-wrap gap-1.5 mt-2">
                                            {((item as any).customizationDetails || (item as any).selectedOptions) ? (
                                              /* Legacy path: use customizationDetails to filter */
                                              Object.entries((item as any).customizationDetails || (item as any).selectedOptions || {}).map(([custId, value]) => {
                                                const cust = item.customizations?.find(c => c.id === custId);
                                                const selectedOptions = (Array.isArray(value) ? value : [value]).map(val => {
                                                  const opt = cust?.options.find(o => o.id === val);
                                                  return opt?.name || val;
                                                });

                                                if (selectedOptions.length === 0) return null;

                                                return (
                                                  <Badge key={custId} variant="outline" className="text-[9px] px-2 py-0.5 border-slate-200 text-slate-600 font-black bg-slate-50 uppercase tracking-tighter">
                                                    <span className="text-[8px] text-slate-400 mr-1 font-bold">{cust?.name || custId}:</span>
                                                    {selectedOptions.join(', ')}
                                                  </Badge>
                                                );
                                              })
                                            ) : (
                                              /* New path: item.customizations is already filtered */
                                              item.customizations?.map((group: any) => (
                                                <Badge key={group.id} variant="outline" className="text-[9px] px-2 py-0.5 border-slate-200 text-slate-600 font-black bg-slate-50 uppercase tracking-tighter">
                                                  <span className="text-[8px] text-slate-400 mr-1 font-bold">{group.name}:</span>
                                                  {group.options.map((o: any) => o.name).join(', ')}
                                                </Badge>
                                              ))
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    <span className="font-black text-slate-900">₹{(item.quantity * item.price).toFixed(2)}</span>
                                  </div>
                                ))}
                              </div>
                              {order.customNotes && (
                                <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-3">
                                  <div className="p-1.5 bg-white rounded-lg shadow-sm">
                                    <Activity className="h-4 w-4 text-amber-500" />
                                  </div>
                                  <div className="flex flex-col gap-0.5">
                                    <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Special Mission Intelligence</span>
                                    <p className="text-sm font-bold text-amber-900 leading-tight italic">"{order.customNotes}"</p>
                                  </div>
                                </div>
                              )}
                              <div className="pt-4 flex justify-between items-center px-4">
                                <div className="flex flex-col">
                                  <span className="font-black text-slate-400 uppercase text-[11px] tracking-[0.2em]">Grand Total</span>
                                  <span className="text-3xl font-black text-primary">₹{order.totalPrice.toFixed(2)}</span>
                                </div>
                                <Badge className="bg-emerald-500 text-white font-black px-4 py-1.5 rounded-full">VERIFIED</Badge>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </TableCell>

                    {/* 6. Logistics Route */}
                    <TableCell className="pr-8 rounded-r-[24px] text-right">
                      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex items-center gap-4 w-fit h-32 justify-center ml-auto">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" className="p-0 h-auto hover:bg-transparent flex flex-col gap-1 items-end min-w-[80px] group/vendor">
                              <span className="font-black text-slate-900 text-xs flex items-center gap-1.5 group-hover/vendor:text-primary transition-colors">
                                <Store className="h-3.5 w-3.5 text-slate-300" />
                                {getVendorName(order.vendorUsername)}
                              </span>
                              <span className="text-[10px] text-slate-400 font-bold uppercase">{vendor?.contact || 'No Contact'}</span>
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="rounded-[32px] sm:max-w-[425px] p-0 overflow-hidden border-none shadow-2xl [&>button]:hidden">
                            <div className="bg-primary p-6 text-white relative">
                              <DialogTitle className="flex items-center gap-2 font-black">
                                <Store className="h-5 w-5" /> VENDOR HUB
                              </DialogTitle>
                              <DialogClose className="absolute right-6 top-6 p-1.5 rounded-full hover:bg-white/20 transition-colors">
                                <X className="h-5 w-5 text-white" />
                              </DialogClose>
                            </div>
                            <div className="p-6 space-y-4 bg-white">
                              <div className="flex items-center gap-4">
                                {vendor?.imageUrl ? (
                                  <img src={vendor.imageUrl} className="w-16 h-16 rounded-2xl object-cover shadow-lg" />
                                ) : (
                                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-2xl border border-primary/20">
                                    {(vendor?.shopName || 'V').charAt(0)}
                                  </div>
                                )}
                                <div>
                                  <p className="font-black text-slate-900 text-xl">{vendor?.shopName || 'Unknown Hub'}</p>
                                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{vendor?.name || order.vendorUsername}</p>
                                </div>
                              </div>
                              <div className="p-4 bg-slate-50 rounded-2xl space-y-3 border border-slate-100">
                                <div className="flex items-start gap-3">
                                  <MapPin className="h-4 w-4 text-primary mt-1" />
                                  <p className="text-sm font-bold text-slate-700 leading-relaxed">{vendor?.address || 'Address Restricted'}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                  <Phone className="h-4 w-4 text-emerald-500" />
                                  <p className="text-sm font-black text-slate-900 tracking-tight">{vendor?.contact || order.vendorContact || 'N/A'}</p>
                                </div>
                              </div>
                              <Button className="w-full h-12 rounded-xl font-black shadow-lg shadow-primary/20" variant="default" onClick={() => window.open(`tel:${vendor?.contact || order.vendorContact}`)}>
                                INITIATE VOICE CALL
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>

                        <ArrowRight className="h-4 w-4 text-slate-200" />

                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" className="p-0 h-auto hover:bg-transparent flex flex-col gap-1 items-start min-w-[80px] group/customer">
                              <span className="font-black text-slate-900 text-xs flex items-center gap-1.5 group-hover/customer:text-blue-500 transition-colors">
                                <User className="h-3.5 w-3.5 text-slate-300" />
                                {order.customer.name}
                              </span>
                              <span className="text-[10px] text-slate-400 font-bold uppercase truncate max-w-[120px] italic">{order.customer.address}</span>
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="rounded-[32px] sm:max-w-[425px] p-0 overflow-hidden border-none shadow-2xl [&>button]:hidden">
                            <div className="bg-blue-600 p-6 text-white relative">
                              <DialogTitle className="flex items-center gap-2 font-black text-white">
                                <User className="h-5 w-5" /> RECIPIENT PROFILE
                              </DialogTitle>
                              <DialogClose className="absolute right-6 top-6 p-1.5 rounded-full hover:bg-white/20 transition-colors">
                                <X className="h-5 w-5 text-white" />
                              </DialogClose>
                            </div>
                            <div className="p-6 space-y-4 bg-white">
                              <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 font-black text-2xl border border-blue-100 shadow-sm">
                                  {order.customer.name.charAt(0)}
                                </div>
                                <div>
                                  <p className="font-black text-slate-900 text-xl">{order.customer.name}</p>
                                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{order.customer.email || 'GUEST USER'}</p>
                                </div>
                              </div>
                              <div className="p-4 bg-slate-50 rounded-2xl space-y-3 border border-slate-100">
                                <div className="flex items-start gap-3">
                                  <MapPin className="h-4 w-4 text-blue-500 mt-1" />
                                  <p className="text-sm font-bold text-slate-700 leading-relaxed">{order.customer.address}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                  <Phone className="h-4 w-4 text-emerald-500" />
                                  <p className="text-sm font-black text-slate-900 tracking-tight">{order.customer.contact}</p>
                                </div>
                              </div>
                              <Button className="w-full h-12 rounded-xl font-black bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200" onClick={() => window.open(`tel:${order.customer.contact}`)}>
                                INITIATE VOICE CALL
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </TableCell>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
            {!loading && filteredOrders.length === 0 && (
              <tr>
                <TableCell colSpan={6} className="py-32 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <div className="p-6 bg-slate-100 rounded-[32px] text-slate-200">
                      <Activity className="h-12 w-12" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-slate-900 font-black text-lg">No Active Telemetry</p>
                      <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Awaiting mission signals from field units</p>
                    </div>
                  </div>
                </TableCell>
              </tr>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function QuickStat({ title, value, icon, color, alert }: any) {
  const colors: any = {
    blue: "bg-blue-500 text-white shadow-blue-200",
    emerald: "bg-emerald-500 text-white shadow-emerald-200",
    orange: "bg-orange-500 text-white shadow-orange-200",
    rose: "bg-rose-500 text-white shadow-rose-200",
  };

  const bgColors: any = {
    blue: "bg-white",
    emerald: "bg-white",
    orange: "bg-white",
    rose: "bg-white",
  };

  return (
    <motion.div
      whileHover={{ y: -5 }}
      className={cn(
        "bg-white p-6 rounded-[32px] border border-slate-100 shadow-xl shadow-slate-200/40 flex items-center justify-between transition-all relative overflow-hidden",
        alert && "animate-pulse ring-2 ring-rose-500/20"
      )}
    >
      <div className="space-y-1 relative z-10">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{title}</p>
        <p className="text-3xl font-black text-slate-900 tracking-tighter">{value}</p>
      </div>
      <div className={cn("p-4 rounded-2xl shadow-lg relative z-10", colors[color])}>
        {icon}
      </div>
      {/* Decorative accent */}
      <div className={cn("absolute -bottom-4 -right-4 w-20 h-20 opacity-[0.03] rounded-full", colors[color])} />
    </motion.div>
  );
}

function AssignRiderDialog({ order, approvedRiders, onAssign }: { order: Order; approvedRiders: Rider[]; onAssign: (rider: Rider) => Promise<void> }) {
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
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-slate-200 text-slate-450 hover:text-slate-700 transition-colors ml-1 flex-shrink-0">
            <UserCog className="h-4 w-4" />
          </Button>
        ) : (
          <Button variant="ghost" className="flex items-center gap-3 bg-white hover:bg-slate-50 p-3 rounded-2xl border border-slate-100 shadow-sm w-fit h-32 justify-center cursor-pointer group/assign hover:border-slate-200 transition-all">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center group-hover/assign:scale-110 transition-transform">
              <Bike className="h-5 w-5 text-primary" />
            </div>
            <div className="flex flex-col gap-0.5 items-start text-left">
              <span className="font-black text-slate-700 text-xs uppercase tracking-widest">Unassigned</span>
              <span className="text-[10px] text-primary font-bold uppercase flex items-center gap-1">
                Assign Rider <ChevronRight className="h-3 w-3" />
              </span>
            </div>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="rounded-[32px] sm:max-w-[425px] p-0 overflow-hidden border-none shadow-2xl [&>button]:hidden bg-white">
        <div className="bg-slate-900 p-6 text-white relative">
          <DialogTitle className="flex items-center gap-2 font-black text-lg">
            <Bike className="h-5 w-5 text-yellow-400" /> {order.assignedDeliveryBoyId ? 'CHANGE LOGISTICS UNIT' : 'ASSIGN LOGISTICS UNIT'}
          </DialogTitle>
          <DialogClose className="absolute right-6 top-6 p-1.5 rounded-full hover:bg-white/10 transition-colors">
            <X className="h-5 w-5 text-white" />
          </DialogClose>
        </div>
        <div className="p-6 space-y-4 bg-white">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-450 uppercase tracking-widest">Selected Order</p>
            <p className="text-sm font-bold text-slate-800">{order.displayId || `#${order.orderId.slice(0, 6)}`}</p>
          </div>
          
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Search approved riders..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-slate-50 border-slate-200 focus:ring-primary/20 rounded-xl h-10 font-medium"
            />
          </div>

          <div className="max-h-[250px] overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-slate-200">
            {filtered.length === 0 ? (
              <p className="text-center py-6 text-slate-400 text-xs font-bold uppercase">No approved riders found</p>
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
                      "p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
                      isSelected
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-slate-100 hover:border-slate-200 bg-slate-50/50 hover:bg-white"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm border shadow-sm",
                        isSelected ? "bg-primary text-white border-primary" : "bg-white text-slate-700 border-slate-100"
                      )}>
                        {rider.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-xs text-slate-900">{rider.name}</span>
                        <span className="text-[10px] text-slate-400 font-medium">{rider.contact}</span>
                      </div>
                    </div>
                    {isSelected && (
                      <Badge className="bg-primary text-white text-[9px] font-black tracking-widest px-2 py-0.5 rounded-md border-none">
                        CURRENT
                      </Badge>
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
