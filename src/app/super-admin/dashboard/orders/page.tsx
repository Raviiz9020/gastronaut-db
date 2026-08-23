'use client';

import { useState, useMemo, useEffect } from 'react';
import { useVendor } from '@/context/vendor-context';
import { useOrder } from '@/context/order-context';
import { useRiderManagement } from '@/context/rider-management-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Order, OrderStatus, Rider } from '@/types';
import {
  Loader2,
  Package,
  Trash2,
  Building,
  Search,
  FileX,
  ShieldAlert,
  ClipboardList,
  Info,
  User,
  Store,
  Bike,
  MapPin,
  Phone,
  Mail,
  Calendar,
  CreditCard,
  ShoppingBag,
  Clock,
  AlertCircle,
  Truck,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';
import { format } from 'date-fns';
import ConfirmationDialog from '@/components/confirmation-dialog';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { motion } from 'framer-motion';

const statusColors: Record<OrderStatus, string> = {
  'Order Placed': 'bg-blue-500 shadow-blue-500/50 text-white',
  'Accepted': 'bg-cyan-500 shadow-cyan-500/50 text-white',
  'Processing': 'bg-yellow-500 shadow-yellow-500/50 text-slate-900',
  'Out for Delivery': 'bg-orange-500 shadow-orange-500/50 text-white',
  'Delivered': 'bg-green-500 shadow-green-500/50 text-white',
  'Cancelled': 'bg-red-500 shadow-red-500/50 text-white',
  'Order Ready': 'bg-teal-500 shadow-teal-500/50 text-white',
  'Picked Up': 'bg-emerald-600 shadow-emerald-600/50 text-white',
};

export default function SuperAdminOrdersPage() {
  const { allVendors, fetchAllVendors } = useVendor();
  const { removeOrder, bulkDeleteCancelledOrdersForVendor } = useOrder();
  const { riders, fetchAllRiders } = useRiderManagement();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingOrders, setIsFetchingOrders] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<string | null>(null);
  const [searchId, setSearchId] = useState('');
  
  const [displayedOrders, setDisplayedOrders] = useState<Order[]>([]);
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);

  // For bulk delete
  const [selectedVendorForDelete, setSelectedVendorForDelete] = useState<string | null>(null);
  const [cancelledOrders, setCancelledOrders] = useState<Order[]>([]);
  const [isFetchingCancelled, setIsFetchingCancelled] = useState(false);
  const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);

  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      await Promise.all([fetchAllVendors(), fetchAllRiders()]);
      setIsLoading(false);
    };
    loadInitialData();
  }, [fetchAllVendors, fetchAllRiders]);
  
  useEffect(() => {
    if (!selectedVendorForDelete) {
      setCancelledOrders([]);
      return;
    }
    const fetchCancelled = async () => {
      setIsFetchingCancelled(true);
      try {
        const ordersRef = collection(db, 'orders');
        const q = query(
          ordersRef,
          where('vendorUsername', '==', selectedVendorForDelete),
          where('status', '==', 'Cancelled')
        );
        const snapshot = await getDocs(q);
        const fetchedOrders = snapshot.docs.map(doc => ({ orderId: doc.id, ...doc.data() } as Order));
        setCancelledOrders(fetchedOrders);
      } catch (e) {
        console.error("Error fetching cancelled orders:", e);
        toast({ title: "Fetch Error", description: "Could not fetch cancelled orders.", variant: "destructive" });
      } finally {
        setIsFetchingCancelled(false);
      }
    };
    fetchCancelled();
  }, [selectedVendorForDelete, toast]);

  const vendorOptions = useMemo(() => {
    return allVendors.map(vendor => ({
      value: vendor.username,
      label: vendor.shopName || vendor.name,
    }));
  }, [allVendors]);

  const getVendorInfo = (vendorUsername?: string) => {
    if (!vendorUsername) return null;
    return allVendors.find(v => v.username === vendorUsername) || null;
  };

  const getRiderInfo = (riderId?: string): Rider | null => {
    if (!riderId) return null;
    return riders.find(r => r.id === riderId) || null;
  };

  const handleSearchById = async () => {
    const cleanQuery = searchId.trim();
    if (!cleanQuery) {
      toast({
        title: "Missing Information",
        description: "Please enter an order number or ID to search.",
        variant: "destructive"
      });
      return;
    }

    setIsFetchingOrders(true);
    const numericPart = cleanQuery.replace(/^HYPER-/i, '');
    const displayId = `HYPER-${numericPart}`;
    const possibleIds = Array.from(new Set([displayId, cleanQuery, numericPart]));

    try {
      const ordersRef = collection(db, 'orders');
      let foundOrders: Order[] = [];

      // Query 1: search by displayId
      for (const idToTry of possibleIds) {
        let q = selectedVendor
          ? query(ordersRef, where('vendorUsername', '==', selectedVendor), where('displayId', '==', idToTry))
          : query(ordersRef, where('displayId', '==', idToTry));
        
        let snapshot = await getDocs(q);
        if (!snapshot.empty) {
          foundOrders = snapshot.docs.map(doc => ({ orderId: doc.id, ...doc.data() } as Order));
          break;
        }
      }

      // Query 2: fallback search by document orderId / orderId field if not found yet
      if (foundOrders.length === 0) {
        for (const idToTry of possibleIds) {
          let q = selectedVendor
            ? query(ordersRef, where('vendorUsername', '==', selectedVendor), where('orderId', '==', idToTry))
            : query(ordersRef, where('orderId', '==', idToTry));
          
          let snapshot = await getDocs(q);
          if (!snapshot.empty) {
            foundOrders = snapshot.docs.map(doc => ({ orderId: doc.id, ...doc.data() } as Order));
            break;
          }
        }
      }

      if (foundOrders.length === 0) {
        toast({
          title: "Not Found",
          description: `No order found with ID ${displayId}${selectedVendor ? ' for this vendor' : ''}.`
        });
        setDisplayedOrders([]);
      } else {
        setDisplayedOrders(foundOrders);
      }
    } catch (e) {
      console.error("Error searching order by ID:", e);
      toast({
        title: "Search Error",
        description: "An error occurred while searching for the order.",
        variant: 'destructive'
      });
    } finally {
      setIsFetchingOrders(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (orderToDelete) {
      await removeOrder(orderToDelete.orderId);
      setDisplayedOrders(prev => prev.filter(o => o.orderId !== orderToDelete.orderId));
      setOrderToDelete(null);
      toast({
        title: "Order Deleted",
        description: `Order #${orderToDelete.displayId || orderToDelete.orderId} was successfully deleted.`
      });
    }
  };
  
  const handleBulkDeleteConfirm = async () => {
    if (!selectedVendorForDelete) return;
    setIsDeleting(true);
    await bulkDeleteCancelledOrdersForVendor(selectedVendorForDelete);
    setCancelledOrders([]);
    setIsBulkDeleteConfirmOpen(false);
    setIsDeleting(false);
    toast({
      title: "Bulk Delete Complete",
      description: "Cancelled orders have been cleared for the selected vendor."
    });
  };

  const renderItemCustomizations = (item: any) => {
    const details = item.customizationDetails || item.selectedOptions;
    
    if (details && typeof details === 'object' && Object.keys(details).length > 0) {
      return (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {Object.entries(details).map(([custId, value]) => {
            const custGroup = item.customizations?.find((c: any) => c.id === custId || c.name === custId);
            const rawValues = Array.isArray(value) ? value : [value];
            const selectedLabels = rawValues.map((val: any) => {
              const opt = custGroup?.options?.find((o: any) => o.id === val || o.name === val);
              return opt ? `${opt.name}${opt.price ? ` (+₹${opt.price})` : ''}` : String(val);
            });

            if (selectedLabels.length === 0) return null;

            return (
              <Badge
                key={custId}
                variant="outline"
                className="text-[11px] px-2.5 py-1 bg-muted/60 text-foreground font-medium rounded-lg border-muted-foreground/20"
              >
                <span className="font-semibold text-primary mr-1">{custGroup?.name || custId}:</span>
                <span>{selectedLabels.join(', ')}</span>
              </Badge>
            );
          })}
        </div>
      );
    }

    if (item.customizations && Array.isArray(item.customizations) && item.customizations.length > 0) {
      return (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {item.customizations.map((group: any, idx: number) => {
            const optNames = group.options?.map((o: any) => `${o.name}${o.price ? ` (+₹${o.price})` : ''}`).join(', ');
            if (!optNames) return null;
            return (
              <Badge
                key={group.id || idx}
                variant="outline"
                className="text-[11px] px-2.5 py-1 bg-muted/60 text-foreground font-medium rounded-lg border-muted-foreground/20"
              >
                <span className="font-semibold text-primary mr-1">{group.name}:</span>
                <span>{optNames}</span>
              </Badge>
            );
          })}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8 pt-6 max-w-5xl mx-auto">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight">Manage Orders</h2>
          <p className="text-muted-foreground">Find individual vendor orders with full vertical details or clean up cancelled records.</p>
        </div>
      </div>

      <Tabs defaultValue="search" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px] rounded-2xl bg-muted/60 p-1 mb-8">
          <TabsTrigger value="search" className="rounded-xl gap-2 py-2">
            <Search className="h-4 w-4" />
            <span>Search Order</span>
          </TabsTrigger>
          <TabsTrigger value="bulk-delete" className="rounded-xl gap-2 py-2">
            <FileX className="h-4 w-4" />
            <span>Bulk Clean-up</span>
          </TabsTrigger>
        </TabsList>

        {/* SEARCH ORDER TAB */}
        <TabsContent value="search">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Search Query Filter Card */}
            <Card className="rounded-3xl border-muted-foreground/10 shadow-sm overflow-hidden">
              <CardHeader className="bg-muted/10 pb-6 border-b border-muted-foreground/5">
                <div className="flex items-center gap-2 mb-1">
                  <ClipboardList className="h-5 w-5 text-primary" />
                  <CardTitle className="text-xl">Search Vendor Orders</CardTitle>
                </div>
                <CardDescription>Select an optional vendor filter and enter the order number to view complete vertical details.</CardDescription>
                
                <div className="pt-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div className="space-y-2 md:col-span-1">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Vendor (Optional)</label>
                    <Combobox
                      options={vendorOptions}
                      value={selectedVendor}
                      onChange={(value) => {
                        setSelectedVendor(value);
                      }}
                      placeholder="All Vendors (or select one)"
                      searchPlaceholder="Search vendors..."
                      noResultsText="No vendors found."
                      icon={<Building className="h-4 w-4" />}
                      isLoading={isLoading}
                      className="w-full rounded-xl"
                    />
                  </div>
                  
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Order ID / Number</label>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-grow">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground select-none">HYPER-</span>
                        <Input
                          placeholder="e.g. 1005"
                          value={searchId}
                          onChange={(e) => setSearchId(e.target.value.replace(/\D/g, ''))}
                          onKeyDown={(e) => e.key === 'Enter' && handleSearchById()}
                          className="pl-16 rounded-xl h-10"
                        />
                      </div>
                      <Button 
                        onClick={handleSearchById} 
                        disabled={!searchId || isFetchingOrders}
                        className="rounded-xl h-10 px-5 gap-2 font-semibold"
                      >
                        {isFetchingOrders ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4"/>}
                        <span>Search</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* SEARCH RESULTS */}
            {isFetchingOrders ? (
              <Card className="rounded-3xl p-12 text-center border-muted-foreground/10">
                <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-3" />
                <p className="text-sm font-medium text-muted-foreground animate-pulse">Querying database for full order records...</p>
              </Card>
            ) : displayedOrders.length > 0 ? (
              <div className="space-y-8">
                {displayedOrders.map((order) => {
                  const vendorInfo = getVendorInfo(order.vendorUsername);
                  const riderInfo = getRiderInfo(order.assignedDeliveryBoyId);
                  const hasCustomizations = order.items.some(
                    (i: any) =>
                      (i.customizationDetails && Object.keys(i.customizationDetails).length > 0) ||
                      (i.selectedOptions && Object.keys(i.selectedOptions).length > 0) ||
                      (i.customizations && i.customizations.length > 0)
                  );

                  return (
                    <motion.div
                      key={order.orderId}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-6"
                    >
                      {/* Vertical Order Card */}
                      <Card className="rounded-3xl border-muted-foreground/15 shadow-md overflow-hidden bg-card">
                        
                        {/* 1. Header with IDs, Status, and Action Delete */}
                        <div className="p-6 bg-muted/20 border-b border-border/50 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                          <div className="space-y-1.5">
                            <div className="flex flex-wrap items-center gap-3">
                              <span className="text-2xl font-black font-mono tracking-tight text-foreground">
                                {order.displayId || `#${order.orderId}`}
                              </span>
                              <Badge className={`px-3 py-1 font-bold text-xs uppercase tracking-wider rounded-full flex items-center gap-1.5 ${statusColors[order.status] || 'bg-slate-500 text-white'}`}>
                                <span className={`h-2 w-2 rounded-full bg-white animate-pulse`} />
                                {order.status}
                              </Badge>
                              <Badge variant="outline" className="text-xs font-semibold px-2.5 py-0.5 rounded-lg border-primary/30 text-primary bg-primary/5">
                                {order.deliveryOption || 'Home Delivery'}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5 text-muted-foreground/70" />
                                <span>{order.createdAt ? format(new Date(order.createdAt), 'dd MMMM yyyy, hh:mm a') : 'N/A'}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <FileText className="h-3.5 w-3.5 text-muted-foreground/70" />
                                <span className="font-mono text-[11px]">UUID: {order.orderId}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <Button
                              variant="destructive"
                              onClick={() => setOrderToDelete(order)}
                              className="rounded-xl px-4 py-2 h-10 gap-2 font-bold shadow-sm hover:shadow-destructive/20 transition-all"
                            >
                              <Trash2 className="h-4 w-4" />
                              <span>Delete Order</span>
                            </Button>
                          </div>
                        </div>

                        <CardContent className="p-6 space-y-6">

                          {/* 2. Three Vertical Info Columns (Customer, Vendor, Rider) */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            
                            {/* Customer Card */}
                            <div className="p-5 rounded-2xl bg-muted/30 border border-border/60 space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                    <User className="h-4 w-4" />
                                  </div>
                                  <h4 className="font-bold text-sm text-foreground">Customer Details</h4>
                                </div>
                                <Badge variant="secondary" className="text-[10px] uppercase font-bold">User</Badge>
                              </div>

                              <div className="space-y-2 pt-1 text-sm">
                                <div>
                                  <p className="font-bold text-foreground text-base">{order.customer?.name || 'Guest Customer'}</p>
                                  {order.customer?.email && (
                                    <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                                      <Mail className="h-3 w-3" />
                                      {order.customer.email}
                                    </p>
                                  )}
                                </div>

                                {order.customer?.contact && (
                                  <div className="flex items-center gap-2">
                                    <Phone className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                    <a
                                      href={`tel:${order.customer.contact}`}
                                      className="font-semibold text-foreground hover:text-primary transition-colors text-xs"
                                    >
                                      {order.customer.contact}
                                    </a>
                                  </div>
                                )}

                                <div className="flex items-start gap-2 pt-1">
                                  <MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0 mt-0.5" />
                                  <p className="text-xs text-muted-foreground leading-relaxed">
                                    {order.customer?.address || 'No address provided'}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Vendor Card */}
                            <div className="p-5 rounded-2xl bg-muted/30 border border-border/60 space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="p-2 rounded-xl bg-primary/10 text-primary">
                                    <Store className="h-4 w-4" />
                                  </div>
                                  <h4 className="font-bold text-sm text-foreground">Vendor Details</h4>
                                </div>
                                <Badge variant="secondary" className="text-[10px] uppercase font-bold">Store</Badge>
                              </div>

                              <div className="space-y-2 pt-1 text-sm">
                                <div>
                                  <p className="font-bold text-foreground text-base">
                                    {vendorInfo?.shopName || order.vendorShopName || 'Vendor Shop'}
                                  </p>
                                  {vendorInfo?.name && vendorInfo.name !== vendorInfo.shopName && (
                                    <p className="text-xs text-muted-foreground">
                                      Owner: {vendorInfo.name}
                                    </p>
                                  )}
                                </div>

                                {(vendorInfo?.contact || order.vendorContact) && (
                                  <div className="flex items-center gap-2">
                                    <Phone className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                    <a
                                      href={`tel:${vendorInfo?.contact || order.vendorContact}`}
                                      className="font-semibold text-foreground hover:text-primary transition-colors text-xs"
                                    >
                                      {vendorInfo?.contact || order.vendorContact}
                                    </a>
                                  </div>
                                )}

                                <div className="flex items-start gap-2 pt-1">
                                  <MapPin className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                                  <p className="text-xs text-muted-foreground leading-relaxed">
                                    {vendorInfo?.address || order.vendorAddress || 'Vendor address unavailable'}
                                  </p>
                                </div>

                                {vendorInfo?.upiId && (
                                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono pt-1">
                                    <CreditCard className="h-3 w-3" />
                                    <span>UPI: {vendorInfo.upiId}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Rider / Delivery Card */}
                            <div className="p-5 rounded-2xl bg-muted/30 border border-border/60 space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="p-2 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400">
                                    <Bike className="h-4 w-4" />
                                  </div>
                                  <h4 className="font-bold text-sm text-foreground">Delivery & Rider</h4>
                                </div>
                                <Badge variant="secondary" className="text-[10px] uppercase font-bold">Logistics</Badge>
                              </div>

                              <div className="space-y-2 pt-1 text-sm">
                                {order.assignedDeliveryBoyId || order.assignedDeliveryBoyName ? (
                                  <>
                                    <div>
                                      <p className="font-bold text-foreground text-base">
                                        {riderInfo?.name || order.assignedDeliveryBoyName || 'Assigned Rider'}
                                      </p>
                                      {riderInfo?.vehicleNumber && (
                                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                          <Truck className="h-3 w-3 text-muted-foreground/70" />
                                          <span>Vehicle: {riderInfo.vehicleNumber}</span>
                                        </p>
                                      )}
                                    </div>

                                    {(riderInfo?.contact || order.assignedDeliveryBoyContact) && (
                                      <div className="flex items-center gap-2">
                                        <Phone className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                        <a
                                          href={`tel:${riderInfo?.contact || order.assignedDeliveryBoyContact}`}
                                          className="font-semibold text-foreground hover:text-primary transition-colors text-xs"
                                        >
                                          {riderInfo?.contact || order.assignedDeliveryBoyContact}
                                        </a>
                                      </div>
                                    )}

                                    {order.riderStatus && (
                                      <div className="flex items-center gap-2 pt-1">
                                        <Badge variant="outline" className="text-xs font-semibold">
                                          Rider Status: {order.riderStatus}
                                        </Badge>
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <div className="py-2 text-center text-muted-foreground space-y-1">
                                    <Clock className="h-5 w-5 mx-auto text-muted-foreground/50" />
                                    <p className="text-xs font-medium">No rider assigned yet</p>
                                    <p className="text-[10px] text-muted-foreground/70">
                                      {order.deliveryOption === 'Self Pickup' ? 'Customer Self-Pickup' : order.deliveryOption === 'Dine-In' ? 'Dine-In Order' : 'Awaiting assignment'}
                                    </p>
                                  </div>
                                )}

                                {order.deliveryDistanceKm !== undefined && (
                                  <div className="text-xs text-muted-foreground pt-1 flex items-center justify-between border-t border-border/40">
                                    <span>Distance:</span>
                                    <span className="font-semibold text-foreground">
                                      {typeof order.deliveryDistanceKm === 'number'
                                        ? `${order.deliveryDistanceKm.toFixed(2)} km`
                                        : `${Number(order.deliveryDistanceKm).toFixed(2)} km`}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>

                          </div>

                          <Separator />

                          {/* 3. Ordered Items List with Full Customizations */}
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <ShoppingBag className="h-5 w-5 text-primary" />
                                <h3 className="text-lg font-bold text-foreground">
                                  Ordered Items ({order.items?.length || 0})
                                </h3>
                              </div>
                              {hasCustomizations && (
                                <Badge variant="secondary" className="text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                  Customized Items Included
                                </Badge>
                              )}
                            </div>

                            <div className="rounded-2xl border border-border/60 overflow-hidden bg-background divide-y divide-border/40">
                              {order.items && order.items.length > 0 ? (
                                order.items.map((item, index) => (
                                  <div key={item.cartItemId || index} className="p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-muted/10 transition-colors">
                                    <div className="flex items-start gap-3.5">
                                      <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary font-black text-sm flex items-center justify-center shrink-0 border border-primary/20">
                                        {item.quantity}x
                                      </div>
                                      <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                          <p className="font-bold text-base text-foreground">{item.name}</p>
                                          {item.isVeg !== undefined && (
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${item.isVeg ? 'border-green-600 text-green-600' : 'border-red-600 text-red-600'}`}>
                                              {item.isVeg ? 'VEG' : 'NON-VEG'}
                                            </span>
                                          )}
                                        </div>
                                        <p className="text-xs text-muted-foreground font-medium">
                                          ₹{item.price.toFixed(2)} per unit
                                        </p>

                                        {/* RENDER FULL CUSTOMIZATIONS */}
                                        {renderItemCustomizations(item)}

                                        {/* Item feedback / rating if available */}
                                        {(item.feedback || item.rating) && (
                                          <div className="text-xs text-muted-foreground mt-2 italic bg-muted/40 p-2 rounded-lg">
                                            <span>Feedback: {item.feedback || `${item.rating}★`}</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    <div className="text-right shrink-0">
                                      <span className="font-bold text-lg text-foreground">
                                        ₹{(item.quantity * item.price).toFixed(2)}
                                      </span>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="p-6 text-center text-muted-foreground text-sm">
                                  No items registered for this order.
                                </div>
                              )}
                            </div>
                          </div>

                          {/* 4. Special Notes & Cancellation Details (if any) */}
                          {order.customNotes && (
                            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 flex items-start gap-3">
                              <Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                              <div className="space-y-0.5">
                                <p className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">Customer Note / Instructions</p>
                                <p className="text-sm font-medium italic">"{order.customNotes}"</p>
                              </div>
                            </div>
                          )}

                          {order.cancellationReason && (
                            <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive flex items-start gap-3">
                              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                              <div className="space-y-0.5">
                                <p className="text-xs font-bold uppercase tracking-wider">Cancellation Reason</p>
                                <p className="text-sm font-medium italic">"{order.cancellationReason}"</p>
                              </div>
                            </div>
                          )}

                          <Separator />

                          {/* 5. Payment & Billing Breakdown */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                            
                            {/* Payment Info */}
                            <div className="p-5 rounded-2xl bg-muted/30 border border-border/60 space-y-2">
                              <div className="flex items-center gap-2 mb-2">
                                <CreditCard className="h-4 w-4 text-primary" />
                                <h4 className="font-bold text-sm text-foreground">Payment Information</h4>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                  <span className="text-muted-foreground block">Method</span>
                                  <span className="font-bold text-foreground">{order.paymentMethod || 'COD'}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground block">Payment Status</span>
                                  <Badge variant={order.paymentStatus?.toLowerCase() === 'paid' ? 'default' : 'outline'} className="text-[11px]">
                                    {order.paymentStatus || 'Pending'}
                                  </Badge>
                                </div>
                                {order.pointsRedeemed ? (
                                  <div>
                                    <span className="text-muted-foreground block">Points Redeemed</span>
                                    <span className="font-bold text-foreground">{order.pointsRedeemed} pts</span>
                                  </div>
                                ) : null}
                                {order.pointsEarned ? (
                                  <div>
                                    <span className="text-muted-foreground block">Points Earned</span>
                                    <span className="font-bold text-foreground">{order.pointsEarned} pts</span>
                                  </div>
                                ) : null}
                              </div>
                            </div>

                            {/* Bill Calculation */}
                            <div className="space-y-2 text-sm p-5 rounded-2xl bg-muted/30 border border-border/60">
                              <div className="flex justify-between text-muted-foreground">
                                <span>Items Subtotal</span>
                                <span>₹{(order.subtotal || 0).toFixed(2)}</span>
                              </div>
                              {order.discountAmount > 0 && (
                                <div className="flex justify-between text-emerald-600 font-medium">
                                  <span>Discount Applied</span>
                                  <span>-₹{order.discountAmount.toFixed(2)}</span>
                                </div>
                              )}
                              {order.deliveryCharge !== undefined && (
                                <div className="flex justify-between text-muted-foreground">
                                  <span>Delivery Fee</span>
                                  <span>₹{order.deliveryCharge.toFixed(2)}</span>
                                </div>
                              )}
                              {order.platformFee !== undefined && order.platformFee > 0 && (
                                <div className="flex justify-between text-muted-foreground text-xs">
                                  <span>Platform Fee</span>
                                  <span>₹{order.platformFee.toFixed(2)}</span>
                                </div>
                              )}
                              {order.paymentGatewayFee !== undefined && order.paymentGatewayFee > 0 && (
                                <div className="flex justify-between text-muted-foreground/70 text-xs">
                                  <span>PG Fee (Est. Cost)</span>
                                  <span>₹{order.paymentGatewayFee.toFixed(2)}</span>
                                </div>
                              )}
                              {order.commissionAmount !== undefined && order.commissionAmount > 0 && (
                                <div className="flex justify-between text-muted-foreground text-xs">
                                  <span>Platform Commission ({order.commissionPercentage || 0}%)</span>
                                  <span>₹{order.commissionAmount.toFixed(2)}</span>
                                </div>
                              )}
                              <Separator className="my-2" />
                              <div className="flex justify-between items-center text-lg font-black text-foreground">
                                <span>Grand Total</span>
                                <span className="text-2xl font-black text-primary">₹{order.totalPrice.toFixed(2)}</span>
                              </div>
                            </div>

                          </div>

                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <Card className="rounded-3xl border-muted-foreground/10 p-16 text-center">
                <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground/40 animate-bounce" style={{ animationDuration: '3s' }} />
                <h3 className="text-lg font-semibold text-foreground mb-1">Search For Any Order</h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  Type an order number (e.g. 1005) or select a vendor to view complete vertical details and item customizations.
                </p>
              </Card>
            )}
          </motion.div>
        </TabsContent>

        {/* BULK DELETE TAB */}
        <TabsContent value="bulk-delete">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="rounded-3xl border-destructive/10 shadow-sm overflow-hidden">
              <CardHeader className="bg-destructive/5 pb-6 border-b border-destructive/10">
                <div className="flex items-center gap-2 mb-1">
                  <ShieldAlert className="h-5 w-5 text-destructive" />
                  <CardTitle className="text-xl text-destructive">Bulk Delete Cancelled Orders</CardTitle>
                </div>
                <CardDescription className="text-destructive/85">
                  Free up Firestore write cycles and clear database clutter by permanently purging completed cancellations.
                </CardDescription>
                
                <div className="pt-4 flex flex-col md:flex-row md:items-end justify-between gap-4">
                  <div className="space-y-2 w-full md:max-w-sm">
                    <label className="text-xs font-semibold text-destructive/80 uppercase tracking-wider">Select Vendor</label>
                    <Combobox
                      options={vendorOptions}
                      value={selectedVendorForDelete}
                      onChange={setSelectedVendorForDelete}
                      placeholder="Select a vendor"
                      searchPlaceholder="Search vendors..."
                      noResultsText="No vendors found."
                      icon={<Building className="h-4 w-4" />}
                      isLoading={isLoading}
                      className="w-full rounded-xl border-destructive/20 focus:ring-destructive/30"
                    />
                  </div>
                  {cancelledOrders.length > 0 && (
                    <Button 
                      variant="destructive" 
                      onClick={() => setIsBulkDeleteConfirmOpen(true)} 
                      disabled={isDeleting}
                      className="rounded-xl h-10 px-6 gap-2 hover:bg-destructive/90 hover:scale-105 active:scale-95 transition-all shadow-md shadow-destructive/20"
                    >
                      {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      <span>Delete All {cancelledOrders.length} Cancelled Orders</span>
                    </Button>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="pt-6">
                {isFetchingCancelled ? (
                  <div className="flex flex-col justify-center items-center h-48 gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-destructive" />
                    <p className="text-xs text-muted-foreground animate-pulse">Analyzing vendor logs...</p>
                  </div>
                ) : selectedVendorForDelete ? (
                  cancelledOrders.length > 0 ? (
                    <div className="space-y-4">
                      <Alert variant="destructive" className="bg-destructive/5 border-destructive/20 rounded-2xl">
                        <Info className="h-4 w-4" />
                        <AlertTitle className="font-semibold text-sm">Critical Warning</AlertTitle>
                        <AlertDescription className="text-xs text-destructive/90">
                          This action is absolute and irreversible. It will purge these {cancelledOrders.length} records entirely from Firestore. Ensure they are no longer required for accounting.
                        </AlertDescription>
                      </Alert>

                      <div className="rounded-2xl border border-muted-foreground/10 overflow-hidden bg-background">
                        <Table>
                          <TableHeader className="bg-muted/40">
                            <TableRow>
                              <TableHead className="font-semibold text-muted-foreground py-3 pl-6">Order ID</TableHead>
                              <TableHead className="font-semibold text-muted-foreground">Customer</TableHead>
                              <TableHead className="font-semibold text-muted-foreground">Date & Time</TableHead>
                              <TableHead className="font-semibold text-muted-foreground pr-6">Cancellation Reason</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {cancelledOrders.map(order => (
                              <TableRow key={order.orderId} className="hover:bg-muted/10 transition-colors">
                                <TableCell className="font-medium text-xs py-3.5 pl-6">
                                  <span className="bg-muted px-2 py-0.5 rounded-md text-foreground font-mono text-xs">
                                    {order.displayId || order.orderId}
                                  </span>
                                </TableCell>
                                <TableCell className="font-medium">{order.customer.name}</TableCell>
                                <TableCell className="text-muted-foreground text-xs">{order.createdAt ? format(new Date(order.createdAt), 'dd/MM/yyyy HH:mm') : 'N/A'}</TableCell>
                                <TableCell className="text-destructive/80 italic text-xs max-w-[200px] truncate pr-6">
                                  {order.cancellationReason || 'No cancellation reason provided.'}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <FileX className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
                      <h3 className="text-md font-semibold text-foreground mb-1">Database Healthy</h3>
                      <p className="text-sm max-w-xs mx-auto">No cancelled orders found for this vendor. No cleanup is needed!</p>
                    </div>
                  )
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Building className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
                    <h3 className="text-md font-semibold text-foreground mb-1">Select a Vendor</h3>
                    <p className="text-sm max-w-xs mx-auto">Select a vendor from the dropdown to check for and clean up cancelled order records.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>

      <ConfirmationDialog
        isOpen={!!orderToDelete}
        onOpenChange={(isOpen) => !isOpen && setOrderToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Are you sure?"
        description={`This action cannot be undone. This will permanently delete order #${orderToDelete?.displayId || orderToDelete?.orderId}.`}
      />

      <ConfirmationDialog
        isOpen={isBulkDeleteConfirmOpen}
        onOpenChange={setIsBulkDeleteConfirmOpen}
        onConfirm={handleBulkDeleteConfirm}
        title={`Delete all ${cancelledOrders.length} cancelled orders?`}
        description="This action cannot be undone. This will permanently delete these orders. This operation does not refund any loyalty points."
      />
    </div>
  );
}

