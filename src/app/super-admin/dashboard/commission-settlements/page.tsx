'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot, writeBatch, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useVendor } from '@/context/vendor-context';
import { useRiderManagement } from '@/context/rider-management-context';
import type { Order, Vendor, Rider } from '@/types';
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
  Receipt,
  Bike,
  Truck,
  Store,
  MapPin,
  UserCheck,
  Copy,
  Check
} from 'lucide-react';
import { format } from 'date-fns';
import ConfirmationDialog from '@/components/confirmation-dialog';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { sendVendorSettlementEmail } from '@/ai/flows/send-vendor-settlement-email';
import { sendRiderSettlementEmail } from '@/ai/flows/send-rider-settlement-email';

interface VendorSettlementClaim {
  vendorUsername: string;
  vendorShopName: string;
  vendorContact?: string;
  vendorImage?: string;
  paymentMode: string;
  markedAt?: string;
  totalSubtotal: number;
  totalCommissionAmount: number;
  totalNetPayout: number;
  orders: Order[];
}

interface VendorOwedBalance {
  vendorUsername: string;
  vendorShopName: string;
  vendorContact?: string;
  vendorImage?: string;
  totalSubtotal: number;
  totalCommissionAmount: number;
  totalNetPayout: number;
  orders: Order[];
}

interface RiderSettlementClaim {
  riderId: string;
  riderName: string;
  riderContact?: string;
  riderUpiId?: string;
  riderVehicleNumber?: string;
  paymentMode: string;
  markedAt?: string;
  totalPayoutAmount: number;
  orders: Order[];
}

interface RiderOwedBalance {
  riderId: string;
  riderName: string;
  riderContact?: string;
  riderUpiId?: string;
  riderVehicleNumber?: string;
  totalOwedAmount: number;
  orders: Order[];
}

export default function CommissionSettlementsPage() {
  const { allVendors } = useVendor();
  const { riders, fetchAllRiders } = useRiderManagement();
  const { toast } = useToast();

  const [mainTab, setMainTab] = useState<'vendor' | 'rider'>('vendor');
  const [copiedUpi, setCopiedUpi] = useState<string | null>(null);

  // Vendor Payout States
  const [claimedOrders, setClaimedOrders] = useState<Order[]>([]);
  const [unclaimedOrders, setUnclaimedOrders] = useState<Order[]>([]);
  const [isLoadingVendors, setIsLoadingVendors] = useState(true);
  const [expandedVendor, setExpandedVendor] = useState<string | null>(null);
  const [settlingVendor, setSettlingVendor] = useState<VendorSettlementClaim | VendorOwedBalance | null>(null);

  // Rider Payout States
  const [riderClaimedOrders, setRiderClaimedOrders] = useState<Order[]>([]);
  const [riderUnsettledOrders, setRiderUnsettledOrders] = useState<Order[]>([]);
  const [isLoadingRiders, setIsLoadingRiders] = useState(true);
  const [expandedRider, setExpandedRider] = useState<string | null>(null);
  const [settlingRider, setSettlingRider] = useState<RiderSettlementClaim | RiderOwedBalance | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchAllRiders();
  }, [fetchAllRiders]);

  // 1. Vendor: Realtime query for Claimed Payouts (adminSettlementStatus == 'payment_sent')
  useEffect(() => {
    setIsLoadingVendors(true);
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
        setIsLoadingVendors(false);
      },
      (error) => {
        console.error('Error fetching claimed commission settlements:', error);
        toast({
          title: 'Error',
          description: 'Failed to load claimed settlements.',
          variant: 'destructive',
        });
        setIsLoadingVendors(false);
      }
    );

    return () => unsubClaimed();
  }, [toast]);

  // 2. Vendor: Realtime query for Unclaimed Owed Balances (all completed orders with commission, not yet settled or payment_sent)
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

  // 3. Rider: Realtime query for Claimed Payouts (riderSettlementStatus == 'payment_sent')
  useEffect(() => {
    setIsLoadingRiders(true);
    const ordersRef = collection(db, 'orders');
    const qRiderClaimed = query(ordersRef, where('riderSettlementStatus', '==', 'payment_sent'));

    const unsubRiderClaimed = onSnapshot(
      qRiderClaimed,
      (snapshot) => {
        const orders = snapshot.docs.map((docSnap) => ({
          ...docSnap.data(),
          orderId: docSnap.id,
        })) as Order[];
        setRiderClaimedOrders(orders);
        setIsLoadingRiders(false);
      },
      (error) => {
        console.error('Error fetching rider claimed payouts:', error);
        setIsLoadingRiders(false);
      }
    );

    return () => unsubRiderClaimed();
  }, []);

  // 4. Rider: Realtime query for Unsettled Delivery Orders (riderPayout > 0, status == Delivered, riderSettlementStatus != settled)
  useEffect(() => {
    const ordersRef = collection(db, 'orders');
    const qRiderAll = query(ordersRef, where('status', '==', 'Delivered'));

    const unsubRiderUnsettled = onSnapshot(
      qRiderAll,
      (snapshot) => {
        const orders = snapshot.docs.map((docSnap) => ({
          ...docSnap.data(),
          orderId: docSnap.id,
        })) as Order[];

        const activeUnsettled = orders.filter((ord) => {
          const hasPayout = typeof ord.riderPayout === 'number' && ord.riderPayout > 0;
          const isNotSettled = ord.riderSettlementStatus !== 'settled' && ord.riderSettlementStatus !== 'payment_sent';
          return hasPayout && isNotSettled;
        });

        setRiderUnsettledOrders(activeUnsettled);
      },
      (error) => {
        console.error('Error fetching unsettled rider orders:', error);
      }
    );

    return () => unsubRiderUnsettled();
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

      const totalSubtotal = Number(orders.reduce((sum, ord) => sum + (ord.subtotal || ord.totalPrice || 0), 0).toFixed(2));
      const totalCommissionOnly = Number(orders.reduce((sum, ord) => sum + (ord.commissionAmount || 0), 0).toFixed(2));
      const totalCommissionAmount = Number(orders.reduce((sum, ord) => sum + (ord.commissionAmount || 0) + (ord.platformFee || 0), 0).toFixed(2));
      const totalNetPayout = Math.max(0, Number((totalSubtotal - totalCommissionOnly).toFixed(2)));

      return {
        vendorUsername,
        vendorShopName,
        vendorContact,
        vendorImage,
        paymentMode,
        markedAt,
        totalSubtotal,
        totalCommissionAmount,
        totalNetPayout,
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

      const totalSubtotal = Number(orders.reduce((sum, ord) => sum + (ord.subtotal || ord.totalPrice || 0), 0).toFixed(2));
      const totalCommissionOnly = Number(orders.reduce((sum, ord) => sum + (ord.commissionAmount || 0), 0).toFixed(2));
      const totalCommissionAmount = Number(orders.reduce((sum, ord) => sum + (ord.commissionAmount || 0) + (ord.platformFee || 0), 0).toFixed(2));
      const totalNetPayout = Math.max(0, Number((totalSubtotal - totalCommissionOnly).toFixed(2)));

      return {
        vendorUsername,
        vendorShopName,
        vendorContact,
        vendorImage,
        totalSubtotal,
        totalCommissionAmount,
        totalNetPayout,
        orders,
      };
    }).sort((a, b) => b.totalNetPayout - a.totalNetPayout);
  }, [unclaimedOrders, allVendors]);

  // Group Rider Claimed Payouts
  const riderClaims = useMemo<RiderSettlementClaim[]>(() => {
    const grouped: Record<string, Order[]> = {};

    riderClaimedOrders.forEach((order) => {
      const rKey = order.assignedDeliveryBoyId || order.assignedDeliveryBoyName || 'unassigned';
      if (!grouped[rKey]) {
        grouped[rKey] = [];
      }
      grouped[rKey].push(order);
    });

    return Object.entries(grouped).map(([riderId, orders]) => {
      const riderObj = riders.find((r) => r.id === riderId);
      const riderName = riderObj?.name || orders[0]?.assignedDeliveryBoyName || 'Rider';
      const riderContact = riderObj?.contact || orders[0]?.assignedDeliveryBoyContact || '';
      const riderUpiId = riderObj?.upiId || '';
      const riderVehicleNumber = riderObj?.vehicleNumber || '';

      const paymentMode = orders[0]?.riderSettlementPaymentMode || 'UPI / Direct Transfer';
      const markedAt = orders[0]?.riderSettlementMarkedAt || orders[0]?.createdAt;

      const totalPayoutAmount = orders.reduce(
        (sum, ord) => sum + (ord.riderPayout || 0),
        0
      );

      return {
        riderId,
        riderName,
        riderContact,
        riderUpiId,
        riderVehicleNumber,
        paymentMode,
        markedAt,
        totalPayoutAmount: Number(totalPayoutAmount.toFixed(2)),
        orders,
      };
    });
  }, [riderClaimedOrders, riders]);

  // Group Rider Unsettled Balances
  const riderOwedBalances = useMemo<RiderOwedBalance[]>(() => {
    const grouped: Record<string, Order[]> = {};

    riderUnsettledOrders.forEach((order) => {
      const rKey = order.assignedDeliveryBoyId || order.assignedDeliveryBoyName || 'unassigned';
      if (!grouped[rKey]) {
        grouped[rKey] = [];
      }
      grouped[rKey].push(order);
    });

    return Object.entries(grouped).map(([riderId, orders]) => {
      const riderObj = riders.find((r) => r.id === riderId);
      const riderName = riderObj?.name || orders[0]?.assignedDeliveryBoyName || 'Rider';
      const riderContact = riderObj?.contact || orders[0]?.assignedDeliveryBoyContact || '';
      const riderUpiId = riderObj?.upiId || '';
      const riderVehicleNumber = riderObj?.vehicleNumber || '';

      const totalOwedAmount = orders.reduce(
        (sum, ord) => sum + (ord.riderPayout || 0),
        0
      );

      return {
        riderId,
        riderName,
        riderContact,
        riderUpiId,
        riderVehicleNumber,
        totalOwedAmount: Number(totalOwedAmount.toFixed(2)),
        orders,
      };
    }).sort((a, b) => b.totalOwedAmount - a.totalOwedAmount);
  }, [riderUnsettledOrders, riders]);

  // Top Stat Totals
  const totalVendorClaimedNetPayoutSum = useMemo(() => {
    return Number(settlementClaims.reduce((sum, c) => sum + c.totalNetPayout, 0).toFixed(2));
  }, [settlementClaims]);

  const totalVendorOwedNetPayoutSum = useMemo(() => {
    return Number(owedBalances.reduce((sum, b) => sum + b.totalNetPayout, 0).toFixed(2));
  }, [owedBalances]);

  const totalVendorCommissionSum = useMemo(() => {
    return Number(owedBalances.reduce((sum, b) => sum + b.totalCommissionAmount, 0).toFixed(2));
  }, [owedBalances]);

  const totalRiderClaimedSum = useMemo(() => {
    return Number(riderClaims.reduce((sum, c) => sum + c.totalPayoutAmount, 0).toFixed(2));
  }, [riderClaims]);

  const totalRiderOwedSum = useMemo(() => {
    return Number(riderOwedBalances.reduce((sum, b) => sum + b.totalOwedAmount, 0).toFixed(2));
  }, [riderOwedBalances]);

  const handleConfirmVendorSettlement = async () => {
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

      const amount = settlingVendor.totalNetPayout;
      
      // Look up vendor details for email dispatch
      const vendorObj = allVendors.find(v => v.username === settlingVendor.vendorUsername);
      const vendorEmail = vendorObj?.email;

      if (vendorEmail) {
        const totalSubtotal = Number(settlingVendor.orders.reduce((sum, ord) => sum + (ord.subtotal || 0), 0).toFixed(2));
        const totalCommission = Number(settlingVendor.orders.reduce((sum, ord) => sum + (ord.commissionAmount || 0), 0).toFixed(2));
        const netPayout = Math.max(0, Number((totalSubtotal - totalCommission).toFixed(2)));

        const settlementId = `SETTLE-${format(new Date(), 'yyyyMMdd')}-${settlingVendor.vendorUsername.slice(0, 6).toUpperCase()}`;

        const sortedVendorOrders = [...settlingVendor.orders].sort((a, b) => {
          const idA = a.displayId || a.orderId || '';
          const idB = b.displayId || b.orderId || '';
          const numA = parseInt(idA.replace(/\D/g, ''), 10) || 0;
          const numB = parseInt(idB.replace(/\D/g, ''), 10) || 0;
          if (numA !== numB) return numA - numB;
          return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: 'base' });
        });

        const orderSummaries = sortedVendorOrders.map(ord => ({
          displayId: ord.displayId || ord.orderId || 'HYPER',
          createdAt: ord.createdAt || nowIso,
          deliveryOption: ord.deliveryOption || 'Home Delivery',
          subtotal: ord.subtotal || 0,
          commissionPercentage: ord.commissionPercentage || 0,
          commissionAmount: ord.commissionAmount || 0,
          netAmount: Math.max(0, Number(((ord.subtotal || 0) - (ord.commissionAmount || 0)).toFixed(2)))
        }));

        sendVendorSettlementEmail({
          vendor: {
            username: settlingVendor.vendorUsername,
            shopName: settlingVendor.vendorShopName,
            email: vendorEmail,
            contact: vendorObj?.contact || settlingVendor.vendorContact,
            upiId: vendorObj?.upiId
          },
          settlementDetails: {
            settlementId,
            settledAt: nowIso,
            paymentMode: 'paymentMode' in settlingVendor ? settlingVendor.paymentMode : 'Direct Payout',
            totalSubtotal,
            totalCommission,
            netPayout,
            orders: orderSummaries
          }
        }).then((res) => {
          if (res.success) {
            console.log(`Settlement statement email sent to ${vendorEmail}`);
          }
        }).catch(err => {
          console.error('Error sending settlement email:', err);
        });

        toast({
          title: 'Settlement Confirmed!',
          description: `Settled ₹${amount} for ${settlingVendor.vendorShopName} & statement emailed to ${vendorEmail}.`,
        });
      } else {
        toast({
          title: 'Settlement Confirmed!',
          description: `Successfully settled ₹${amount} payout for ${settlingVendor.vendorShopName}.`,
        });
      }

      setSettlingVendor(null);
    } catch (e: any) {
      console.error('Error confirming vendor settlement:', e);
      toast({
        title: 'Error',
        description: e.message || 'Could not update settlement status.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmRiderSettlement = async () => {
    if (!settlingRider) return;

    setIsProcessing(true);
    try {
      const batch = writeBatch(db);
      const nowIso = new Date().toISOString();

      settlingRider.orders.forEach((ord) => {
        const orderRef = doc(db, 'orders', ord.orderId);
        batch.update(orderRef, {
          riderSettlementStatus: 'settled',
          riderSettlementConfirmedAt: nowIso,
        });
      });

      await batch.commit();

      const amount = 'totalPayoutAmount' in settlingRider ? settlingRider.totalPayoutAmount : settlingRider.totalOwedAmount;
      
      // Look up rider details for email dispatch
      const riderObj = riders.find(r => r.id === settlingRider.riderId);
      const riderEmail = riderObj?.email;

      if (riderEmail) {
        const sortedRiderOrders = [...settlingRider.orders].sort((a, b) => {
          const idA = a.displayId || a.orderId || '';
          const idB = b.displayId || b.orderId || '';
          const numA = parseInt(idA.replace(/\D/g, ''), 10) || 0;
          const numB = parseInt(idB.replace(/\D/g, ''), 10) || 0;
          if (numA !== numB) return numA - numB;
          return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: 'base' });
        });

        const totalPayout = Number(settlingRider.orders.reduce((sum, ord) => sum + (ord.riderPayout || 0), 0).toFixed(2));
        const settlementId = `RIDER-SETTLE-${format(new Date(), 'yyyyMMdd')}-${settlingRider.riderId.slice(0, 6).toUpperCase()}`;

        const orderSummaries = sortedRiderOrders.map(ord => ({
          displayId: ord.displayId || ord.orderId || 'HYPER',
          createdAt: ord.createdAt || nowIso,
          vendorShopName: ord.vendorShopName || 'Local Shop',
          deliveryDistanceKm: ord.deliveryDistanceKm || 0,
          riderPayout: Number((ord.riderPayout || 0).toFixed(2))
        }));

        sendRiderSettlementEmail({
          rider: {
            id: settlingRider.riderId,
            name: settlingRider.riderName,
            email: riderEmail,
            contact: riderObj?.contact || settlingRider.riderContact,
            upiId: riderObj?.upiId || settlingRider.riderUpiId,
            vehicleNumber: riderObj?.vehicleNumber || settlingRider.riderVehicleNumber
          },
          settlementDetails: {
            settlementId,
            settledAt: nowIso,
            paymentMode: 'paymentMode' in settlingRider ? settlingRider.paymentMode : 'Direct Payout',
            totalDeliveries: orderSummaries.length,
            totalPayout,
            orders: orderSummaries
          }
        }).then((res) => {
          if (res.success) {
            console.log(`Rider settlement statement email sent to ${riderEmail}`);
          }
        }).catch(err => {
          console.error('Error sending rider settlement email:', err);
        });

        toast({
          title: 'Rider Settlement Confirmed!',
          description: `Settled ₹${amount} for ${settlingRider.riderName} & statement emailed to ${riderEmail}.`,
        });
      } else {
        toast({
          title: 'Rider Settlement Confirmed!',
          description: `Successfully settled ₹${amount} delivery payout for ${settlingRider.riderName}.`,
        });
      }

      setSettlingRider(null);
    } catch (e: any) {
      console.error('Error confirming rider settlement:', e);
      toast({
        title: 'Error',
        description: e.message || 'Could not update rider settlement status.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUpi(text);
    toast({ title: "Copied!", description: `Copied ${text} to clipboard.` });
    setTimeout(() => setCopiedUpi(null), 2000);
  };

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8 pt-6 max-w-6xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-destructive/10 text-destructive">
              <HandCoins className="h-7 w-7" />
            </div>
            <h2 className="text-3xl font-black tracking-tight">Commission & Payout Settlements</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Track and verify vendor commission collections and rider delivery payout settlements.
          </p>
        </div>

        {/* Top-Level Main Switcher (Vendor vs Rider) */}
        <div className="flex items-center bg-muted/60 p-1.5 rounded-2xl border border-border/80 w-fit">
          <button
            onClick={() => setMainTab('vendor')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
              mainTab === 'vendor'
                ? 'bg-card text-foreground shadow-md'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Store className="h-4 w-4 text-primary" />
            <span>Vendor Commissions</span>
          </button>
          <button
            onClick={() => setMainTab('rider')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
              mainTab === 'rider'
                ? 'bg-card text-foreground shadow-md'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Bike className="h-4 w-4 text-orange-500" />
            <span>Rider Payouts</span>
            {(riderClaims.length > 0 || riderOwedBalances.length > 0) && (
              <span className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
            )}
          </button>
        </div>
      </div>

      {/* Dynamic Top Stat Cards based on selected main tab */}
      {mainTab === 'vendor' ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/5 border-green-500/20 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Pending Net Payouts to Vendors
              </span>
              <div className="p-2 rounded-xl bg-green-500/20 text-green-600">
                <Receipt className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-black text-green-600 dark:text-green-400">₹{totalVendorOwedNetPayoutSum}</span>
              <p className="text-xs text-muted-foreground mt-1 font-medium">
                Net payout to pay across {owedBalances.length} active vendor{owedBalances.length === 1 ? '' : 's'}
              </p>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/5 border-amber-500/20 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Admin Commission & Platform Fees
              </span>
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-600">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-black text-amber-600 dark:text-amber-400">₹{totalVendorCommissionSum}</span>
              <p className="text-xs text-muted-foreground mt-1 font-medium">
                Platform revenue retained across {unclaimedOrders.length} order{unclaimedOrders.length === 1 ? '' : 's'}
              </p>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500/10 to-indigo-500/5 border-blue-500/20 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Active Vendor Accounts
              </span>
              <div className="p-2 rounded-xl bg-blue-500/20 text-blue-600">
                <Building className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-black text-foreground">{allVendors.length}</span>
              <p className="text-xs text-muted-foreground mt-1 font-medium">Vendors registered on platform</p>
            </div>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <Card className="bg-gradient-to-br from-orange-500/10 to-amber-500/5 border-orange-500/20 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Pending Delivery Payouts
              </span>
              <div className="p-2 rounded-xl bg-orange-500/20 text-orange-600">
                <Bike className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-black text-orange-600 dark:text-orange-400">₹{totalRiderOwedSum}</span>
              <p className="text-xs text-muted-foreground mt-1 font-medium">
                Earned by {riderOwedBalances.length} rider{riderOwedBalances.length === 1 ? '' : 's'} on completed deliveries
              </p>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/5 border-green-500/20 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Claimed (Awaiting Verification)
              </span>
              <div className="p-2 rounded-xl bg-green-500/20 text-green-600">
                <Clock className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-black text-foreground">₹{totalRiderClaimedSum}</span>
              <p className="text-xs text-muted-foreground mt-1 font-medium">
                Across {riderClaims.length} rider claim{riderClaims.length === 1 ? '' : 's'}
              </p>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500/10 to-indigo-500/5 border-blue-500/20 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Registered Riders
              </span>
              <div className="p-2 rounded-xl bg-blue-500/20 text-blue-600">
                <UserCheck className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-black text-foreground">{riders.length}</span>
              <p className="text-xs text-muted-foreground mt-1 font-medium">Active delivery partners</p>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. VENDOR COMMISSION VIEW */}
      {/* ========================================================================= */}
      {mainTab === 'vendor' && (
        <Tabs defaultValue="owed" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 rounded-2xl p-1 bg-muted/60 border mb-6">
            <TabsTrigger value="owed" className="rounded-xl text-xs font-bold py-2">
              Pending / Owed Balances ({owedBalances.length})
            </TabsTrigger>
            <TabsTrigger value="claims" className="rounded-xl text-xs font-bold py-2">
              Claimed Payouts ({settlementClaims.length})
            </TabsTrigger>
          </TabsList>

          {/* Vendor Tab 1: Vendor Owed Balances (Pending / Unclaimed) */}
          <TabsContent value="owed" className="space-y-6">
            {owedBalances.length > 0 ? (
              <div className="grid grid-cols-1 gap-6">
                {owedBalances.map((owed) => {
                  const isExpanded = expandedVendor === `owed-${owed.vendorUsername}`;

                  return (
                    <Card
                      key={`owed-${owed.vendorUsername}`}
                      className="bg-card/80 backdrop-blur-sm border-amber-500/20 rounded-3xl overflow-hidden shadow-sm transition-all"
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

                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <span className="text-xs text-muted-foreground block font-semibold">
                                Net Payout to Pay Vendor
                              </span>
                              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                                ₹{owed.totalNetPayout.toFixed(2)}
                              </span>
                              <div className="text-[11px] text-muted-foreground font-medium mt-0.5">
                                Sales: ₹{owed.totalSubtotal.toFixed(2)} · Comm: -₹{owed.totalCommissionAmount.toFixed(2)}
                              </div>
                            </div>

                            <Button
                              onClick={() => setSettlingVendor(owed)}
                              disabled={isProcessing}
                              className="rounded-xl text-white bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 shadow-md font-bold px-5 h-10"
                            >
                              <CheckCheck className="h-4 w-4 mr-2" />
                              Settle Payout
                            </Button>

                            {owed.vendorContact && (
                              <a href={`tel:${owed.vendorContact}`} title="Call Vendor">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="rounded-xl h-10 w-10 border-primary/20 text-primary hover:bg-primary/10 shrink-0"
                                >
                                  <Phone className="h-4 w-4" />
                                </Button>
                              </a>
                            )}
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="pt-4 space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs bg-muted/40 p-3 rounded-2xl border">
                          <div className="flex items-center gap-2 font-semibold text-foreground">
                            <Package className="h-4 w-4 text-primary" />
                            <span>
                              {owed.orders.length} Unsettled Home Delivery Order{owed.orders.length === 1 ? '' : 's'}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-[11px]">
                            <span className="text-muted-foreground">
                              Gross Sales: <strong className="text-foreground">₹{owed.totalSubtotal.toFixed(2)}</strong>
                            </span>
                            <span className="text-muted-foreground">
                              Commission: <strong className="text-destructive">-₹{owed.totalCommissionAmount.toFixed(2)}</strong>
                            </span>
                            <span className="text-muted-foreground">
                              Net Payout: <strong className="text-emerald-600 dark:text-emerald-400 font-bold">₹{owed.totalNetPayout.toFixed(2)}</strong>
                            </span>
                          </div>
                        </div>

                        <div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setExpandedVendor((prev) => (prev === `owed-${owed.vendorUsername}` ? null : `owed-${owed.vendorUsername}`))}
                            className="text-xs text-muted-foreground hover:text-foreground font-semibold"
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
                                <div className="border rounded-2xl overflow-hidden bg-background">
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-xs text-left">
                                      <thead className="bg-muted/40 text-muted-foreground uppercase text-[10px] tracking-wider border-b">
                                        <tr>
                                          <th className="p-3 pl-4">Order ID</th>
                                          <th className="p-3">Date</th>
                                          <th className="p-3">Item Subtotal</th>
                                          <th className="p-3">Commission</th>
                                          <th className="p-3">Platform Fee</th>
                                          <th className="p-3 text-right pr-4">Net Payout (To Pay)</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-border/40">
                                        {owed.orders.map((ord) => {
                                          const subtotal = ord.subtotal || ord.totalPrice || 0;
                                          const comm = ord.commissionAmount ?? 0;
                                          const net = Math.max(0, Number((subtotal - comm).toFixed(2)));
                                          return (
                                            <tr key={ord.orderId} className="hover:bg-muted/20 transition-colors">
                                              <td className="p-3 pl-4 font-mono font-bold text-primary">
                                                {ord.displayId || ord.orderId}
                                              </td>
                                              <td className="p-3 text-muted-foreground">
                                                {ord.createdAt ? format(new Date(ord.createdAt), 'MMM dd, yyyy HH:mm') : '-'}
                                              </td>
                                              <td className="p-3 font-semibold">₹{subtotal.toFixed(2)}</td>
                                              <td className="p-3 font-mono text-destructive">
                                                <div className="flex items-center gap-1.5">
                                                  <span>-₹{comm.toFixed(2)}</span>
                                                  <Badge variant="outline" className="text-[9px] px-1 py-0">
                                                    {ord.commissionPercentage ?? 0}%
                                                  </Badge>
                                                </div>
                                              </td>
                                              <td className="p-3 text-muted-foreground">
                                                ₹{(ord.platformFee ?? 0).toFixed(2)}
                                              </td>
                                              <td className="p-3 text-right pr-4 font-extrabold text-emerald-600 dark:text-emerald-400">
                                                ₹{net.toFixed(2)}
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                      <tfoot className="bg-muted/30 font-bold border-t">
                                        <tr>
                                          <td colSpan={2} className="p-3 pl-4">Total ({owed.orders.length} Orders)</td>
                                          <td className="p-3 font-semibold">₹{owed.totalSubtotal.toFixed(2)}</td>
                                          <td className="p-3 text-destructive">-₹{owed.totalCommissionAmount.toFixed(2)}</td>
                                          <td className="p-3 text-muted-foreground">-</td>
                                          <td className="p-3 text-right pr-4 text-emerald-600 dark:text-emerald-400 text-sm font-black">
                                            ₹{owed.totalNetPayout.toFixed(2)}
                                          </td>
                                        </tr>
                                      </tfoot>
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

          {/* Vendor Tab 2: Claimed Payouts */}
          <TabsContent value="claims" className="space-y-6">
            {isLoadingVendors ? (
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
                      className="bg-card/80 backdrop-blur-sm border-primary/20 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all"
                    >
                      <CardHeader className="bg-muted/20 pb-4">
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
                              <span className="text-xs text-muted-foreground block font-semibold">Net Payout to Pay</span>
                              <span className="text-2xl font-black text-green-600 dark:text-green-400">
                                ₹{claim.totalNetPayout.toFixed(2)}
                              </span>
                              <div className="text-[11px] text-muted-foreground font-medium mt-0.5">
                                Sales: ₹{claim.totalSubtotal.toFixed(2)} · Comm: -₹{claim.totalCommissionAmount.toFixed(2)}
                              </div>
                            </div>

                            <Button
                              onClick={() => setSettlingVendor(claim)}
                              disabled={isProcessing}
                              className="rounded-xl text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-md font-bold px-5 h-10"
                            >
                              <CheckCheck className="h-4 w-4 mr-2" />
                              Confirm Settlement
                            </Button>
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="pt-4 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs bg-muted/20 p-3.5 rounded-2xl border">
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4 text-primary shrink-0" />
                            <div>
                              <span className="text-muted-foreground block">Payment Reference / Mode</span>
                              <span className="font-semibold">{claim.paymentMode}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-primary shrink-0" />
                            <div>
                              <span className="text-muted-foreground block">Submitted Date</span>
                              <span className="font-semibold">
                                {claim.markedAt ? format(new Date(claim.markedAt), 'PPpp') : 'N/A'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-primary shrink-0" />
                            <div>
                              <span className="text-muted-foreground block">Orders Count</span>
                              <span className="font-semibold">{claim.orders.length} Home Delivery Orders</span>
                            </div>
                          </div>
                        </div>

                        <div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setExpandedVendor((prev) => (prev === claim.vendorUsername ? null : claim.vendorUsername))}
                            className="text-xs text-muted-foreground hover:text-foreground font-semibold"
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
                                <div className="border rounded-2xl overflow-hidden bg-background">
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-xs text-left">
                                      <thead className="bg-muted/40 text-muted-foreground uppercase text-[10px] tracking-wider border-b">
                                        <tr>
                                          <th className="p-3 pl-4">Order ID</th>
                                          <th className="p-3">Date</th>
                                          <th className="p-3">Item Subtotal</th>
                                          <th className="p-3">Commission</th>
                                          <th className="p-3">Platform Fee</th>
                                          <th className="p-3 text-right pr-4">Net Payout (To Pay)</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-border/40">
                                        {claim.orders.map((ord) => {
                                          const subtotal = ord.subtotal || ord.totalPrice || 0;
                                          const comm = ord.commissionAmount ?? 0;
                                          const net = Math.max(0, Number((subtotal - comm).toFixed(2)));
                                          return (
                                            <tr key={ord.orderId} className="hover:bg-muted/20 transition-colors">
                                              <td className="p-3 pl-4 font-mono font-bold text-primary">
                                                {ord.displayId || ord.orderId}
                                              </td>
                                              <td className="p-3 text-muted-foreground">
                                                {ord.createdAt ? format(new Date(ord.createdAt), 'MMM dd, yyyy HH:mm') : '-'}
                                              </td>
                                              <td className="p-3 font-semibold">₹{subtotal.toFixed(2)}</td>
                                              <td className="p-3 font-mono text-destructive">
                                                <div className="flex items-center gap-1.5">
                                                  <span>-₹{comm.toFixed(2)}</span>
                                                  <Badge variant="outline" className="text-[9px] px-1 py-0">
                                                    {ord.commissionPercentage ?? 0}%
                                                  </Badge>
                                                </div>
                                              </td>
                                              <td className="p-3 text-muted-foreground">
                                                ₹{(ord.platformFee ?? 0).toFixed(2)}
                                              </td>
                                              <td className="p-3 text-right pr-4 font-extrabold text-green-600 dark:text-green-400">
                                                ₹{net.toFixed(2)}
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                      <tfoot className="bg-muted/30 font-bold border-t">
                                        <tr>
                                          <td colSpan={2} className="p-3 pl-4">Total ({claim.orders.length} Orders)</td>
                                          <td className="p-3 font-semibold">₹{claim.totalSubtotal.toFixed(2)}</td>
                                          <td className="p-3 text-destructive">-₹{claim.totalCommissionAmount.toFixed(2)}</td>
                                          <td className="p-3 text-muted-foreground">-</td>
                                          <td className="p-3 text-right pr-4 text-green-600 dark:text-green-400 text-sm font-black">
                                            ₹{claim.totalNetPayout.toFixed(2)}
                                          </td>
                                        </tr>
                                      </tfoot>
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
        </Tabs>
      )}

      {/* ========================================================================= */}
      {/* 2. RIDER DELIVERY PAYOUTS VIEW */}
      {/* ========================================================================= */}
      {mainTab === 'rider' && (
        <Tabs defaultValue="owed" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 rounded-2xl p-1 bg-muted/60 border mb-6">
            <TabsTrigger value="owed" className="rounded-xl text-xs font-bold py-2">
              Pending Rider Payouts ({riderOwedBalances.length})
            </TabsTrigger>
            <TabsTrigger value="claims" className="rounded-xl text-xs font-bold py-2">
              Claimed by Riders ({riderClaims.length})
            </TabsTrigger>
          </TabsList>

          {/* Rider Tab 1: Pending Rider Payouts */}
          <TabsContent value="owed" className="space-y-6">
            {isLoadingRiders ? (
              <div className="flex justify-center items-center h-48">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
              </div>
            ) : riderOwedBalances.length > 0 ? (
              <div className="grid grid-cols-1 gap-6">
                {riderOwedBalances.map((owed) => {
                  const isExpanded = expandedRider === `owed-${owed.riderId}`;

                  return (
                    <Card
                      key={`owed-rider-${owed.riderId}`}
                      className="bg-card/80 backdrop-blur-sm border-orange-500/20 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all"
                    >
                      <CardHeader className="bg-orange-500/5 pb-4">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                          <div className="flex items-center gap-3.5">
                            <div className="p-3 rounded-2xl bg-orange-500/10 text-orange-600 shrink-0 border border-orange-500/20">
                              <Bike className="h-6 w-6" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <CardTitle className="text-xl font-bold">{owed.riderName}</CardTitle>
                                {owed.riderVehicleNumber && (
                                  <Badge variant="outline" className="text-[10px] font-mono font-semibold">
                                    <Truck className="h-3 w-3 mr-1" />
                                    {owed.riderVehicleNumber}
                                  </Badge>
                                )}
                              </div>
                              
                              <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
                                {owed.riderContact && (
                                  <div className="flex items-center gap-1">
                                    <Phone className="h-3.5 w-3.5 text-emerald-600" />
                                    <a href={`tel:${owed.riderContact}`} className="hover:underline font-semibold text-foreground">
                                      {owed.riderContact}
                                    </a>
                                  </div>
                                )}
                                {owed.riderUpiId && (
                                  <div className="flex items-center gap-1.5 bg-muted/60 px-2.5 py-0.5 rounded-lg border">
                                    <CreditCard className="h-3 w-3 text-primary" />
                                    <span className="font-mono text-foreground font-semibold">UPI: {owed.riderUpiId}</span>
                                    <button 
                                      onClick={() => copyToClipboard(owed.riderUpiId!)}
                                      className="text-muted-foreground hover:text-foreground transition-colors ml-1"
                                      title="Copy UPI ID"
                                    >
                                      {copiedUpi === owed.riderUpiId ? (
                                        <Check className="h-3 w-3 text-green-600" />
                                      ) : (
                                        <Copy className="h-3 w-3" />
                                      )}
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <span className="text-xs text-muted-foreground block font-semibold">Total Payout Due</span>
                              <span className="text-2xl font-black text-orange-600 dark:text-orange-400">
                                ₹{owed.totalOwedAmount}
                              </span>
                            </div>

                            <Button
                              onClick={() => setSettlingRider(owed)}
                              disabled={isProcessing}
                              className="rounded-xl text-white bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 shadow-md font-bold px-5 h-10"
                            >
                              <CheckCheck className="h-4 w-4 mr-2" />
                              Settle Payout
                            </Button>
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="pt-4 space-y-4">
                        <div className="flex flex-wrap items-center justify-between text-xs bg-muted/20 p-3.5 rounded-2xl border gap-2">
                          <div className="flex items-center gap-2 text-foreground font-semibold">
                            <Package className="h-4 w-4 text-orange-500" />
                            <span>{owed.orders.length} Completed Delivery Order{owed.orders.length === 1 ? '' : 's'}</span>
                          </div>
                          <span className="text-muted-foreground text-[11px]">
                            Earnings accumulated from delivery fee shares
                          </span>
                        </div>

                        <div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setExpandedRider((prev) => (prev === `owed-${owed.riderId}` ? null : `owed-${owed.riderId}`))}
                            className="text-xs text-muted-foreground hover:text-foreground font-semibold"
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp className="h-4 w-4 mr-1" /> Hide Delivered Orders
                              </>
                            ) : (
                              <>
                                <ChevronDown className="h-4 w-4 mr-1" /> View Delivered Orders ({owed.orders.length})
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
                                <div className="border rounded-2xl overflow-hidden bg-background">
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-xs text-left">
                                      <thead className="bg-muted/40 text-muted-foreground uppercase text-[10px] tracking-wider border-b">
                                        <tr>
                                          <th className="p-3 pl-4">Order ID</th>
                                          <th className="p-3">Delivered At</th>
                                          <th className="p-3">Vendor</th>
                                          <th className="p-3">Distance</th>
                                          <th className="p-3 text-right pr-4">Rider Payout</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-border/40">
                                        {owed.orders.map((ord) => (
                                          <tr key={ord.orderId} className="hover:bg-muted/20 transition-colors">
                                            <td className="p-3 pl-4 font-mono font-bold text-primary">
                                              {ord.displayId || ord.orderId}
                                            </td>
                                            <td className="p-3 text-muted-foreground">
                                              {ord.createdAt ? format(new Date(ord.createdAt), 'MMM dd, yyyy HH:mm') : '-'}
                                            </td>
                                            <td className="p-3 font-medium">
                                              {ord.vendorShopName || ord.vendorUsername}
                                            </td>
                                            <td className="p-3 font-mono text-muted-foreground">
                                              {typeof ord.deliveryDistanceKm === 'number'
                                                ? `${ord.deliveryDistanceKm.toFixed(2)} km`
                                                : ord.deliveryDistanceKm
                                                ? `${Number(ord.deliveryDistanceKm).toFixed(2)} km`
                                                : 'N/A'}
                                            </td>
                                            <td className="p-3 text-right pr-4 font-extrabold text-orange-600 dark:text-orange-400">
                                              ₹{ord.riderPayout ?? 0}
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
                  <div className="mx-auto w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-bold">All Rider Payouts Settled!</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    There are currently no pending unsettled delivery earnings owed to riders.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Rider Tab 2: Claimed by Riders */}
          <TabsContent value="claims" className="space-y-6">
            {riderClaims.length > 0 ? (
              <div className="grid grid-cols-1 gap-6">
                {riderClaims.map((claim) => {
                  const isExpanded = expandedRider === `claim-${claim.riderId}`;

                  return (
                    <Card
                      key={`claim-rider-${claim.riderId}`}
                      className="bg-card/80 backdrop-blur-sm border-green-500/20 rounded-3xl overflow-hidden shadow-sm transition-all"
                    >
                      <CardHeader className="bg-green-500/5 pb-4">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                          <div className="flex items-center gap-3.5">
                            <div className="p-3 rounded-2xl bg-green-500/10 text-green-600 shrink-0 border border-green-500/20">
                              <Bike className="h-6 w-6" />
                            </div>
                            <div>
                              <CardTitle className="text-xl font-bold">{claim.riderName}</CardTitle>
                              <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
                                {claim.riderContact && (
                                  <a href={`tel:${claim.riderContact}`} className="hover:underline font-semibold text-foreground">
                                    {claim.riderContact}
                                  </a>
                                )}
                                {claim.riderUpiId && (
                                  <span className="bg-muted/60 px-2.5 py-0.5 rounded-lg border font-mono">
                                    UPI: {claim.riderUpiId}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <span className="text-xs text-muted-foreground block font-semibold">Total Claimed</span>
                              <span className="text-2xl font-black text-green-600 dark:text-green-400">
                                ₹{claim.totalPayoutAmount}
                              </span>
                            </div>

                            <Button
                              onClick={() => setSettlingRider(claim)}
                              disabled={isProcessing}
                              className="rounded-xl text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-md font-bold px-5 h-10"
                            >
                              <CheckCheck className="h-4 w-4 mr-2" />
                              Confirm Settlement
                            </Button>
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="pt-4 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs bg-muted/20 p-3.5 rounded-2xl border">
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4 text-primary shrink-0" />
                            <div>
                              <span className="text-muted-foreground block">Payment Reference / Mode</span>
                              <span className="font-semibold">{claim.paymentMode}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-primary shrink-0" />
                            <div>
                              <span className="text-muted-foreground block">Submitted Date</span>
                              <span className="font-semibold">
                                {claim.markedAt ? format(new Date(claim.markedAt), 'PPpp') : 'N/A'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-primary shrink-0" />
                            <div>
                              <span className="text-muted-foreground block">Orders Count</span>
                              <span className="font-semibold">{claim.orders.length} Deliveries</span>
                            </div>
                          </div>
                        </div>

                        <div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setExpandedRider((prev) => (prev === `claim-${claim.riderId}` ? null : `claim-${claim.riderId}`))}
                            className="text-xs text-muted-foreground hover:text-foreground font-semibold"
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp className="h-4 w-4 mr-1" /> Hide Orders Breakdown
                              </>
                            ) : (
                              <>
                                <ChevronDown className="h-4 w-4 mr-1" /> View Orders Breakdown ({claim.orders.length})
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
                                <div className="border rounded-2xl overflow-hidden bg-background">
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-xs text-left">
                                      <thead className="bg-muted/40 text-muted-foreground uppercase text-[10px] tracking-wider border-b">
                                        <tr>
                                          <th className="p-3 pl-4">Order ID</th>
                                          <th className="p-3">Date</th>
                                          <th className="p-3">Vendor</th>
                                          <th className="p-3">Distance</th>
                                          <th className="p-3 text-right pr-4">Rider Payout</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-border/40">
                                        {claim.orders.map((ord) => (
                                          <tr key={ord.orderId} className="hover:bg-muted/20 transition-colors">
                                            <td className="p-3 pl-4 font-mono font-bold text-primary">
                                              {ord.displayId || ord.orderId}
                                            </td>
                                            <td className="p-3 text-muted-foreground">
                                              {ord.createdAt ? format(new Date(ord.createdAt), 'MMM dd, yyyy HH:mm') : '-'}
                                            </td>
                                            <td className="p-3 font-medium">
                                              {ord.vendorShopName || ord.vendorUsername}
                                            </td>
                                            <td className="p-3 font-mono text-muted-foreground">
                                              {typeof ord.deliveryDistanceKm === 'number'
                                                ? `${ord.deliveryDistanceKm.toFixed(2)} km`
                                                : ord.deliveryDistanceKm
                                                ? `${Number(ord.deliveryDistanceKm).toFixed(2)} km`
                                                : 'N/A'}
                                            </td>
                                            <td className="p-3 text-right pr-4 font-extrabold text-green-600 dark:text-green-400">
                                              ₹{ord.riderPayout ?? 0}
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
                  <h3 className="text-lg font-bold">No Pending Rider Claims</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    There are no rider submitted payment claims awaiting verification.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Vendor Settlement Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={!!settlingVendor}
        onOpenChange={(open) => !open && setSettlingVendor(null)}
        onConfirm={handleConfirmVendorSettlement}
        title="Confirm Vendor Payout Settlement?"
        description={`Are you sure you want to confirm settlement for ${settlingVendor?.vendorShopName}? This will settle a Net Payout of ₹${settlingVendor?.totalNetPayout.toFixed(2)} (Gross Sales: ₹${settlingVendor?.totalSubtotal.toFixed(2)} minus Commission: ₹${settlingVendor?.totalCommissionAmount.toFixed(2)}) across ${settlingVendor?.orders.length} order(s) and email the official settlement statement.`}
      />

      {/* Rider Settlement Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={!!settlingRider}
        onOpenChange={(open) => !open && setSettlingRider(null)}
        onConfirm={handleConfirmRiderSettlement}
        title="Confirm Rider Delivery Payout Settlement?"
        description={`Are you sure you want to confirm settlement for ${settlingRider?.riderName}? This will mark ₹${settlingRider && ('totalPayoutAmount' in settlingRider ? settlingRider.totalPayoutAmount : settlingRider.totalOwedAmount)} across ${settlingRider?.orders.length} delivered order(s) as settled.`}
      />
    </div>
  );
}

