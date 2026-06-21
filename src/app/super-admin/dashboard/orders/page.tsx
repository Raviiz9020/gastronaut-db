'use client';

import { useState, useMemo, useEffect } from 'react';
import { useVendor } from '@/context/vendor-context';
import { useOrder } from '@/context/order-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Order, OrderStatus } from '@/types';
import { Loader2, Package, Trash2, Building, Search, FileX, ShieldAlert, ClipboardList, Info } from 'lucide-react';
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
    'Order Placed': 'bg-blue-500 shadow-blue-500/50',
    'Accepted': 'bg-cyan-500 shadow-cyan-500/50',
    'Processing': 'bg-yellow-500 shadow-yellow-500/50',
    'Out for Delivery': 'bg-orange-500 shadow-orange-500/50',
    'Delivered': 'bg-green-500 shadow-green-500/50',
    'Cancelled': 'bg-red-500 shadow-red-500/50',
    'Order Ready': 'bg-teal-500 shadow-teal-500/50',
    'Picked Up': 'bg-green-500 shadow-green-500/50',
};

export default function SuperAdminOrdersPage() {
  const { allVendors, fetchAllVendors } = useVendor();
  const { removeOrder, bulkDeleteCancelledOrdersForVendor } = useOrder();
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
        await fetchAllVendors();
        setIsLoading(false);
    }
    loadInitialData();
  }, [fetchAllVendors]);
  
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
  
  const handleSearchById = async () => {
      if (!searchId || !selectedVendor) {
          toast({ title: "Missing Information", description: "Please select a vendor and enter an order number.", variant: "destructive"});
          return;
      }
      setIsFetchingOrders(true);
      const displayId = `HYPER-${searchId}`;
      try {
          const ordersRef = collection(db, 'orders');
          const q = query(
              ordersRef,
              where('vendorUsername', '==', selectedVendor),
              where('displayId', '==', displayId)
          );
          const snapshot = await getDocs(q);
          if (snapshot.empty) {
              toast({ title: "Not Found", description: `No order found with ID ${displayId} for this vendor.`});
              setDisplayedOrders([]);
          } else {
              const foundOrders = snapshot.docs.map(doc => ({ orderId: doc.id, ...doc.data() } as Order));
              setDisplayedOrders(foundOrders);
          }
      } catch (e) {
          console.error("Error searching order by ID:", e);
          toast({ title: "Search Error", description: "An error occurred while searching for the order.", variant: 'destructive'});
      } finally {
          setIsFetchingOrders(false);
      }
  };

  const handleDeleteConfirm = async () => {
    if (orderToDelete) {
      await removeOrder(orderToDelete.orderId);
      setDisplayedOrders([]);
      setOrderToDelete(null);
    }
  };
  
  const handleBulkDeleteConfirm = async () => {
    if (!selectedVendorForDelete) return;
    setIsDeleting(true);
    await bulkDeleteCancelledOrdersForVendor(selectedVendorForDelete);
    setCancelledOrders([]); // Clear the list after deletion
    setIsBulkDeleteConfirmOpen(false);
    setIsDeleting(false);
  };

  return (
    <div className="flex-1 space-y-8 p-8 pt-6 max-w-5xl mx-auto">
       <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
         <div className="space-y-1">
           <h2 className="text-3xl font-bold tracking-tight">Manage Orders</h2>
           <p className="text-muted-foreground">Find individual vendor orders or clean up cancelled records to optimize database health.</p>
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

         <TabsContent value="search">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="rounded-3xl border-muted-foreground/10 shadow-sm overflow-hidden">
                <CardHeader className="bg-muted/10 pb-6 border-b border-muted-foreground/5">
                  <div className="flex items-center gap-2 mb-1">
                    <ClipboardList className="h-5 w-5 text-primary" />
                    <CardTitle className="text-xl">Search Vendor Orders</CardTitle>
                  </div>
                  <CardDescription>Select a vendor first, then query specific orders using the official order number.</CardDescription>
                  
                  <div className="pt-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div className="space-y-2 md:col-span-1">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Select Vendor</label>
                      <Combobox
                          options={vendorOptions}
                          value={selectedVendor}
                          onChange={(value) => {
                            setSelectedVendor(value);
                            setDisplayedOrders([]); // Clear previous results
                          }}
                          placeholder="Select a vendor"
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
                              className="pl-16 rounded-xl h-10"
                              disabled={!selectedVendor}
                          />
                        </div>
                        <Button 
                          onClick={handleSearchById} 
                          disabled={!selectedVendor || !searchId || isFetchingOrders}
                          className="rounded-xl h-10 px-5 gap-2"
                        >
                          {isFetchingOrders ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4"/>}
                          <span>Search</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-6">
                   {isFetchingOrders ? (
                     <div className="flex flex-col justify-center items-center h-48 gap-3">
                       <Loader2 className="h-8 w-8 animate-spin text-primary" />
                       <p className="text-xs text-muted-foreground animate-pulse">Querying database...</p>
                     </div>
                   ) : selectedVendor ? (
                     <div className="rounded-2xl border border-muted-foreground/10 overflow-hidden bg-background">
                       <Table>
                         <TableHeader className="bg-muted/40">
                           <TableRow>
                             <TableHead className="font-semibold text-muted-foreground py-3 pl-6">Order ID</TableHead>
                             <TableHead className="font-semibold text-muted-foreground">Customer</TableHead>
                             <TableHead className="font-semibold text-muted-foreground">Date & Time</TableHead>
                             <TableHead className="font-semibold text-muted-foreground">Total</TableHead>
                             <TableHead className="font-semibold text-muted-foreground">Status</TableHead>
                             <TableHead className="font-semibold text-muted-foreground text-right pr-6">Actions</TableHead>
                           </TableRow>
                         </TableHeader>
                         <TableBody>
                           {displayedOrders.length > 0 ? (
                             displayedOrders.map(order => (
                                 <TableRow key={order.orderId} className="hover:bg-muted/10 transition-colors">
                                   <TableCell className="font-medium text-xs py-4 pl-6">
                                     <span className="bg-muted px-2.5 py-1 rounded-lg text-foreground font-mono font-bold">
                                       {order.displayId || order.orderId}
                                     </span>
                                   </TableCell>
                                   <TableCell className="font-medium">{order.customer.name}</TableCell>
                                   <TableCell className="text-muted-foreground text-xs">{format(new Date(order.createdAt), 'dd/MM/yyyy HH:mm')}</TableCell>
                                   <TableCell className="font-semibold text-foreground">₹{order.totalPrice.toFixed(2)}</TableCell>
                                   <TableCell>
                                       <div className="flex items-center gap-2">
                                           <span className={`h-2.5 w-2.5 rounded-full ${statusColors[order.status]} shadow-[0_0_8px_var(--tw-shadow-color)]`} />
                                           <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{order.status}</span>
                                       </div>
                                   </TableCell>
                                   <TableCell className="text-right pr-6">
                                     <Button 
                                       variant="destructive" 
                                       size="icon"
                                       onClick={() => setOrderToDelete(order)}
                                       className="h-9 w-9 rounded-xl shadow-sm hover:shadow-destructive/20 hover:scale-105 active:scale-95 transition-all"
                                      >
                                       <Trash2 className="h-4 w-4" />
                                     </Button>
                                   </TableCell>
                                 </TableRow>
                               )
                             )
                           ) : (
                             <TableRow>
                               <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                 <FileX className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                                 <p className="text-sm font-medium">No order matches this ID for the selected vendor.</p>
                               </TableCell>
                             </TableRow>
                           )}
                         </TableBody>
                       </Table>
                     </div>
                   ) : (
                        <div className="text-center text-muted-foreground py-16">
                            <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground/40 animate-bounce" style={{ animationDuration: '3s' }} />
                            <h3 className="text-lg font-semibold text-foreground mb-1">Begin Your Search</h3>
                            <p className="text-sm max-w-sm mx-auto">Please select a vendor and type in an order number above to view real-time records.</p>
                        </div>
                   )}
                </CardContent>
              </Card>
            </motion.div>
         </TabsContent>

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
                                                <TableCell className="text-muted-foreground text-xs">{format(new Date(order.createdAt), 'dd/MM/yyyy HH:mm')}</TableCell>
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
        description={`This action cannot be undone. This will permanently delete order #${orderToDelete?.displayId}.`}
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
