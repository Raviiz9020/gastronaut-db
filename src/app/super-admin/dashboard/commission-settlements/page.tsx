'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot, writeBatch, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useVendor } from '@/context/vendor-context';
import type { Order, Vendor } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  HandCoins, 
  CheckCircle2, 
  Clock, 
  Building, 
  IndianRupee, 
  ChevronDown, 
  ChevronUp, 
  Package, 
  Loader2,
  Calendar,
  CreditCard,
  CheckCheck,
  Phone,
  AlertCircle,
  TrendingUp,
  Receipt
} from 'lucide-react';
import { format } from 'date-fns';
import ConfirmationDialog from '@/components/confirmation-dialog';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

interface VendorSettlementClaim {
  vendorUsername: string;
  vendorShopName: string;
  vendorContact?: string;
  vendorImage?: string;
  paymentMode: string;
  markedAt?: string;
  totalCommissionAmount: number;
  orders: Order[];
}

interface VendorOwedBalance {
  vendorUsername: string;
  vendorShopName: string;
  vendorContact?: string;
  vendorImage?: string;
  totalOwedAmount: number;
  orders: Order[];
}

export default function CommissionSettlementsPage() {
  const { allVendors } = useVendor();
  const { toast } = useToast();

  const [claimedOrders, setClaimedOrders] = useState<Order[]>([]);
  const [unclaimedOrders, setUnclaimedOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedVendor, setExpandedVendor] = useState<string | null>(null);
  const [settlingVendor, setSettlingVendor] = useState<VendorSettlementClaim | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // 1. Realtime query for Claimed Payouts (adminSettlementStatus == 'payment_sent')
  useEffect(() => {
    setIsLoading(true);
    const ordersRef = collection(db, 'orders');
    const qClaimed = query(ordersRef, where('adminSettlementStatus', '==', 'payment_sent'));

    const unsubClaimed = onSnapshot(
      qClaimed,
      (snapshot) => {
        const orders = snapshot.docs.map((docSnap) => ({
          ...docSnap.data(),
          orderId: docSnap.id,
        })) as Order[];
        setClaimedOrders(orders);
        setIsLoading(false);
      },
      (error) => {
        console.error('Error fetching claimed commission settlements:', error);
        toast({
          title: 'Error',
          description: 'Failed to load claimed settlements.',
          variant: 'destructive',
        });
        setIsLoading(false);
      }
    );

    return () => unsubClaimed();
  }, [toast]);

  // 2. Realtime query for Unclaimed Owed Balances (all completed orders with commission, not yet settled or payment_sent)
  useEffect(() => {
    const ordersRef = collection(db, 'orders');
    const qUnclaimed = query(ordersRef, where('commissionAmount', '>', 0));

    const unsubUnclaimed = onSnapshot(
      qUnclaimed,
      (snapshot) => {
        const orders = snapshot.docs.map((docSnap) => ({
          ...docSnap.data(),
          orderId: docSnap.id,
        })) as Order[];

        // Filter for completed/delivered orders that have NOT been settled or sent for payment
        const activeUnclaimed = orders.filter((ord) => {
          const isDelivered = ord.status === 'Delivered' || ord.status === 'Picked Up';
          const isNotSettled = ord.adminSettlementStatus !== 'settled' && ord.adminSettlementStatus !== 'payment_sent';
          return isDelivered && isNotSettled;
        });

        setUnclaimedOrders(activeUnclaimed);
      },
      (error) => {
        console.error('Error fetching unclaimed commission balances:', error);
      }
    );

    return () => unsubUnclaimed();
  }, []);

  // Group claimed payouts by vendor
  const settlementClaims = useMemo<VendorSettlementClaim[]>(() => {
    const grouped: Record<string, Order[]> = {};

    claimedOrders.forEach((order) => {
      const vKey = order.vendorUsername || 'unknown';
      if (!grouped[vKey]) {
        grouped[vKey] = [];
      }
      grouped[vKey].push(order);
    });

    return Object.entries(grouped).map(([vendorUsername, orders]) => {
      const vendorObj = allVendors.find((v) => v.username === vendorUsername);
      const vendorShopName =
        vendorObj?.shopName || vendorObj?.name || orders[0]?.vendorShopName || vendorUsername;
      const vendorContact = vendorObj?.contact || orders[0]?.vendorContact || '';
      const vendorImage = vendorObj?.shopImage || vendorObj?.imageUrl || '';

      const paymentMode = orders[0]?.adminSettlementPaymentMode || 'UPI / Direct Transfer';
      const markedAt = orders[0]?.adminSettlementMarkedAt || orders[0]?.createdAt;

      const totalCommissionAmount = orders.reduce(
        (sum, ord) => sum + (ord.commissionAmount || 0),
        0
      );

      return {
        vendorUsername,
        vendorShopName,
        vendorContact,
        vendorImage,
        paymentMode,
        markedAt,
        totalCommissionAmount: Number(totalCommissionAmount.toFixed(2)),
        orders,
      };
    });
  }, [claimedOrders, allVendors]);

  // Group unclaimed balances by vendor
  const owedBalances = useMemo<VendorOwedBalance[]>(() => {
    const grouped: Record<string, Order[]> = {};

    unclaimedOrders.forEach((order) => {
      const vKey = order.vendorUsername || 'unknown';
      if (!grouped[vKey]) {
        grouped[vKey] = [];
      }
      grouped[vKey].push(order);
    });

    return Object.entries(grouped).map(([vendorUsername, orders]) => {
      const vendorObj = allVendors.find((v) => v.username === vendorUsername);
      const vendorShopName =
        vendorObj?.shopName || vendorObj?.name || orders[0]?.vendorShopName || vendorUsername;
      const vendorContact = vendorObj?.contact || orders[0]?.vendorContact || '';
      const vendorImage = vendorObj?.shopImage || vendorObj?.imageUrl || '';

      const totalOwedAmount = orders.reduce(
        (sum, ord) => sum + (ord.commissionAmount || 0),
        0
      );

      return {
        vendorUsername,
        vendorShopName,
        vendorContact,
        vendorImage,
        totalOwedAmount: Number(totalOwedAmount.toFixed(2)),
        orders,
      };
    }).sort((a, b) => b.totalOwedAmount - a.totalOwedAmount);
  }, [unclaimedOrders, allVendors]);

  // Totals for top stat cards
  const totalClaimedSum = useMemo(() => {
    return Number(settlementClaims.reduce((sum, c) => sum + c.totalCommissionAmount, 0).toFixed(2));
  }, [settlementClaims]);

  const totalOwedSum = useMemo(() => {
    return Number(owedBalances.reduce((sum, b) => sum + b.totalOwedAmount, 0).toFixed(2));
  }, [owedBalances]);

  const handleConfirmSettlement = async () => {
    if (!settlingVendor) return;

    setIsProcessing(true);
    try {
      const batch = writeBatch(db);
      const nowIso = new Date().toISOString();

      settlingVendor.orders.forEach((ord) => {
        const orderRef = doc(db, 'orders', ord.orderId);
        batch.update(orderRef, {
          adminSettlementStatus: 'settled',
          adminSettlementConfirmedAt: nowIso,
        });
      });

      await batch.commit();

      toast({
        title: 'Settlement Confirmed!',
        description: `Successfully settled ₹${settlingVendor.totalCommissionAmount} payout for ${settlingVendor.vendorShopName}.`,
      });

      setSettlingVendor(null);
    } catch (e: any) {
      console.error('Error confirming settlement:', e);
      toast({
        title: 'Error',
        description: e.message || 'Could not update settlement status.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleExpand = (username: string) => {
    setExpandedVendor((prev) => (prev === username ? null : username));
  };

  return (
    <div className="flex-1 space-y-8 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-2xl bg-destructive/10 text-destructive">
              <HandCoins className="h-7 w-7" />
            </div>
            <h2 className="text-3xl font-bold tracking-tight">Commission Payout Settlements</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Verify vendor payment claims and track unpaid commission balances owed by vendors.
          </p>
        </div>
      </div>

      {/* Top Stat Cards Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/5 border-green-500/20 rounded-3xl p-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Claimed (Awaiting Verification)
            </span>
            <div className="p-2 rounded-xl bg-green-500/20 text-green-600">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-foreground">₹{totalClaimedSum}</span>
            <p className="text-xs text-muted-foreground mt-1">
              Across {settlementClaims.length} vendor claim{settlementClaims.length === 1 ? '' : 's'}
            </p>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/5 border-amber-500/20 rounded-3xl p-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Unclaimed Owed Balances
            </span>
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-600">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-amber-600 dark:text-amber-400">₹{totalOwedSum}</span>
            <p className="text-xs text-muted-foreground mt-1">
              Owed by {owedBalances.length} active vendor{owedBalances.length === 1 ? '' : 's'}
            </p>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-indigo-500/5 border-blue-500/20 rounded-3xl p-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Active Vendor Accounts
            </span>
            <div className="p-2 rounded-xl bg-blue-500/20 text-blue-600">
              <Building className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-foreground">{allVendors.length}</span>
            <p className="text-xs text-muted-foreground mt-1">Vendors registered in platform</p>
          </div>
        </Card>
      </div>

      {/* Tabs View */}
      <Tabs defaultValue="claims" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 rounded-full p-1 bg-muted/50 border">
          <TabsTrigger value="claims" className="rounded-full text-xs font-bold py-2">
            Claimed Payouts ({settlementClaims.length})
          </TabsTrigger>
          <TabsTrigger value="owed" className="rounded-full text-xs font-bold py-2">
            Vendor Owed Balances ({owedBalances.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Claimed Payouts (Awaiting Admin Verification) */}
        <TabsContent value="claims" className="mt-6 space-y-6">
          {isLoading ? (
            <div className="flex justify-center items-center h-48">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : settlementClaims.length > 0 ? (
            <div className="grid grid-cols-1 gap-6">
              {settlementClaims.map((claim) => {
                const isExpanded = expandedVendor === claim.vendorUsername;

                return (
                  <Card
                    key={claim.vendorUsername}
                    className="bg-card/80 backdrop-blur-sm border-primary/20 box-glow-primary rounded-3xl overflow-hidden transition-all"
                  >
                    <CardHeader className="bg-muted/30 pb-4">
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          {claim.vendorImage ? (
                            <div className="relative w-12 h-12 rounded-2xl overflow-hidden border border-primary/20 shrink-0">
                              <Image
                                src={claim.vendorImage}
                                alt={claim.vendorShopName}
                                fill
                                className="object-cover"
                              />
                            </div>
                          ) : (
                            <div className="p-3 rounded-2xl bg-primary/10 text-primary shrink-0">
                              <Building className="h-6 w-6" />
                            </div>
                          )}
                          <div>
                            <CardTitle className="text-xl font-bold">{claim.vendorShopName}</CardTitle>
                            {claim.vendorContact && (
                              <CardDescription className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5 font-medium">
                                <Phone className="h-3.5 w-3.5 text-primary" />
                                <a
                                  href={`tel:${claim.vendorContact}`}
                                  className="hover:underline hover:text-primary transition-colors"
                                >
                                  {claim.vendorContact.startsWith('+91')
                                    ? claim.vendorContact
                                    : `+91 ${claim.vendorContact}`}
                                </a>
                              </CardDescription>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <span className="text-xs text-muted-foreground block">Total Claimed</span>
                            <span className="text-2xl font-extrabold text-green-600 dark:text-green-400">
                              ₹{claim.totalCommissionAmount}
                            </span>
                          </div>

                          <Button
                            onClick={() => setSettlingVendor(claim)}
                            disabled={isProcessing}
                            className="rounded-full text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-md font-semibold px-5"
                          >
                            <CheckCheck className="h-4 w-4 mr-2" />
                            Confirm Settlement
                          </Button>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="pt-4 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs bg-muted/20 p-3 rounded-2xl border">
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-primary" />
                          <div>
                            <span className="text-muted-foreground block">Payment Reference / Mode</span>
                            <span className="font-semibold">{claim.paymentMode}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-primary" />
                          <div>
                            <span className="text-muted-foreground block">Submitted Date</span>
                            <span className="font-semibold">
                              {claim.markedAt ? format(new Date(claim.markedAt), 'PPpp') : 'N/A'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-primary" />
                          <div>
                            <span className="text-muted-foreground block">Orders Count</span>
                            <span className="font-semibold">{claim.orders.length} Home Delivery Orders</span>
                          </div>
                        </div>
                      </div>

                      {/* Toggle Order Details Breakdown */}
                      <div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleExpand(claim.vendorUsername)}
                          className="text-xs text-muted-foreground hover:text-foreground"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="h-4 w-4 mr-1" /> Hide Order Breakdown
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-4 w-4 mr-1" /> View Order Breakdown ({claim.orders.length})
                            </>
                          )}
                        </Button>

                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="overflow-hidden mt-3"
                            >
                              <div className="border rounded-2xl overflow-hidden">
                                <div className="overflow-x-auto">
                                  <table className="w-full text-xs text-left">
                                    <thead className="bg-muted text-muted-foreground uppercase text-[10px] tracking-wider border-b">
                                      <tr>
                                        <th className="p-3">Order ID</th>
                                        <th className="p-3">Date</th>
                                        <th className="p-3">Order Price</th>
                                        <th className="p-3">Commission %</th>
                                        <th className="p-3 text-right">Commission Share</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                      {claim.orders.map((ord) => (
                                        <tr key={ord.orderId} className="hover:bg-muted/30">
                                          <td className="p-3 font-mono font-bold text-primary">
                                            {ord.displayId || ord.orderId}
                                          </td>
                                          <td className="p-3 text-muted-foreground">
                                            {ord.createdAt ? format(new Date(ord.createdAt), 'MMM dd, yyyy HH:mm') : '-'}
                                          </td>
                                          <td className="p-3 font-semibold">₹{ord.totalPrice}</td>
                                          <td className="p-3 font-mono">
                                            <Badge variant="outline" className="text-[10px]">
                                              {ord.commissionPercentage ?? 0}%
                                            </Badge>
                                          </td>
                                          <td className="p-3 text-right font-extrabold text-green-600 dark:text-green-400">
                                            ₹{ord.commissionAmount ?? 0}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="text-center py-16 bg-card/60 border-dashed rounded-3xl">
              <CardContent className="space-y-3 pt-6">
                <div className="mx-auto w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold">All Commission Payouts Settled!</h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  There are currently no pending vendor payout claims awaiting admin verification.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab 2: Vendor Owed Balances (Unclaimed Accrued Commission) */}
        <TabsContent value="owed" className="mt-6 space-y-6">
          {owedBalances.length > 0 ? (
            <div className="grid grid-cols-1 gap-6">
              {owedBalances.map((owed) => {
                const isExpanded = expandedVendor === `owed-${owed.vendorUsername}`;

                return (
                  <Card
                    key={`owed-${owed.vendorUsername}`}
                    className="bg-card/80 backdrop-blur-sm border-amber-500/20 rounded-3xl overflow-hidden transition-all"
                  >
                    <CardHeader className="bg-amber-500/5 pb-4">
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          {owed.vendorImage ? (
                            <div className="relative w-12 h-12 rounded-2xl overflow-hidden border border-amber-500/20 shrink-0">
                              <Image
                                src={owed.vendorImage}
                                alt={owed.vendorShopName}
                                fill
                                className="object-cover"
                              />
                            </div>
                          ) : (
                            <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-600 shrink-0">
                              <Building className="h-6 w-6" />
                            </div>
                          )}
                          <div>
                            <CardTitle className="text-xl font-bold">{owed.vendorShopName}</CardTitle>
                            {owed.vendorContact && (
                              <CardDescription className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5 font-medium">
                                <Phone className="h-3.5 w-3.5 text-amber-500" />
                                <a
                                  href={`tel:${owed.vendorContact}`}
                                  className="hover:underline text-amber-600 font-bold dark:text-amber-400"
                                >
                                  {owed.vendorContact.startsWith('+91')
                                    ? owed.vendorContact
                                    : `+91 ${owed.vendorContact}`}
                                </a>
                              </CardDescription>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <span className="text-xs text-muted-foreground block font-semibold">
                              Unclaimed Balance Owed
                            </span>
                            <span className="text-2xl font-black text-amber-600 dark:text-amber-400">
                              ₹{owed.totalOwedAmount}
                            </span>
                          </div>

                          {owed.vendorContact && (
                            <a href={`tel:${owed.vendorContact}`}>
                              <Button
                                size="sm"
                                className="rounded-full bg-amber-500 hover:bg-amber-600 text-white font-semibold shadow-md px-4"
                              >
                                <Phone className="h-4 w-4 mr-2" />
                                Call Vendor
                              </Button>
                            </a>
                          )}
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="pt-4 space-y-4">
                      <div className="flex items-center justify-between text-xs bg-amber-500/10 p-3 rounded-2xl border border-amber-500/20">
                        <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                          <Package className="h-4 w-4" />
                          <span className="font-semibold">
                            {owed.orders.length} Unsettled Home Delivery Order{owed.orders.length === 1 ? '' : 's'}
                          </span>
                        </div>
                        <span className="text-muted-foreground text-[11px]">
                          Vendor has not submitted payout claim for these orders yet
                        </span>
                      </div>

                      {/* Toggle Order Breakdown */}
                      <div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleExpand(`owed-${owed.vendorUsername}`)}
                          className="text-xs text-muted-foreground hover:text-foreground"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="h-4 w-4 mr-1" /> Hide Unsettled Orders
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-4 w-4 mr-1" /> View Unsettled Orders ({owed.orders.length})
                            </>
                          )}
                        </Button>

                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="overflow-hidden mt-3"
                            >
                              <div className="border rounded-2xl overflow-hidden">
                                <div className="overflow-x-auto">
                                  <table className="w-full text-xs text-left">
                                    <thead className="bg-muted text-muted-foreground uppercase text-[10px] tracking-wider border-b">
                                      <tr>
                                        <th className="p-3">Order ID</th>
                                        <th className="p-3">Date</th>
                                        <th className="p-3">Order Price</th>
                                        <th className="p-3">Commission %</th>
                                        <th className="p-3 text-right">Commission Share</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                      {owed.orders.map((ord) => (
                                        <tr key={ord.orderId} className="hover:bg-muted/30">
                                          <td className="p-3 font-mono font-bold text-primary">
                                            {ord.displayId || ord.orderId}
                                          </td>
                                          <td className="p-3 text-muted-foreground">
                                            {ord.createdAt ? format(new Date(ord.createdAt), 'MMM dd, yyyy HH:mm') : '-'}
                                          </td>
                                          <td className="p-3 font-semibold">₹{ord.totalPrice}</td>
                                          <td className="p-3 font-mono">
                                            <Badge variant="outline" className="text-[10px]">
                                              {ord.commissionPercentage ?? 0}%
                                            </Badge>
                                          </td>
                                          <td className="p-3 text-right font-extrabold text-amber-600 dark:text-amber-400">
                                            ₹{ord.commissionAmount ?? 0}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="text-center py-16 bg-card/60 border-dashed rounded-3xl">
              <CardContent className="space-y-3 pt-6">
                <div className="mx-auto w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold">No Pending Vendor Owed Balances</h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  All active vendors currently have 0 unclaimed commission balances.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Settlement Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={!!settlingVendor}
        onOpenChange={(open) => !open && setSettlingVendor(null)}
        onConfirm={handleConfirmSettlement}
        title="Confirm Payout Settlement?"
        description={`Are you sure you want to confirm settlement for ${settlingVendor?.vendorShopName}? This will mark ₹${settlingVendor?.totalCommissionAmount} across ${settlingVendor?.orders.length} order(s) as settled and clear them from the vendor's pending payouts tab.`}
      />
    </div>
  );
}
