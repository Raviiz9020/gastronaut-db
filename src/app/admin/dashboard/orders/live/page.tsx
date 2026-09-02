'use client';

import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useOrder } from '@/context/order-context';
import type { Order, OrderStatus, CartItem, DeliveryOption, DeliveryBoy, Vendor } from '@/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { format, formatDistanceToNow } from 'date-fns';
import { Separator } from '@/components/ui/separator';
import { useVendor } from '@/context/vendor-context';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Package,
  User,
  Utensils,
  Bike,
  Home,
  Store,
  QrCode,
  Edit,
  MessageSquare,
  MapPin,
  Clock,
  LayoutGrid,
  LayoutList,
  ChefHat,
  CheckCircle2,
  Flame,
  Maximize2
} from 'lucide-react';
import Link from 'next/link';
import CancellationReasonDialog from '@/components/cancellation-reason-dialog';
import { useDelivery } from '@/context/delivery-context';
import QrCodeDialog from '@/components/qr-code-dialog';
import VendorKdsBoard from '@/components/vendor-kds-board';

const statusColors: Record<OrderStatus, string> = {
  'Order Placed': 'bg-blue-500 text-blue-100',
  'Accepted': 'bg-cyan-500 text-cyan-100',
  'Processing': 'bg-amber-500 text-amber-100',
  'Out for Delivery': 'bg-orange-500 text-orange-100',
  'Delivered': 'bg-emerald-500 text-emerald-100',
  'Cancelled': 'bg-red-500 text-red-100',
  'Order Ready': 'bg-teal-500 text-teal-100',
  'Picked Up': 'bg-emerald-500 text-emerald-100',
};

const activeStatuses: OrderStatus[] = ['Order Placed', 'Accepted', 'Processing', 'Out for Delivery', 'Order Ready'];
const homeDeliveryStatuses: OrderStatus[] = ['Order Placed', 'Accepted', 'Processing', 'Out for Delivery', 'Delivered', 'Cancelled'];
const selfPickupStatuses: OrderStatus[] = ['Order Placed', 'Accepted', 'Order Ready', 'Picked Up', 'Cancelled'];
const dineInStatuses: OrderStatus[] = ['Processing', 'Delivered', 'Cancelled'];

const LiveOrderCard = ({
  order,
  vendor,
  onStatusChange,
  onAssignDelivery,
  onPayClick,
  onEditOrder,
  deliveryTeam
}: {
  order: Order;
  vendor?: Vendor;
  onStatusChange: (order: Order, newStatus: OrderStatus) => void;
  onAssignDelivery: (orderId: string, deliveryBoyId: string) => void;
  onPayClick: (order: Order) => void;
  onEditOrder: (order: Order) => void;
  deliveryTeam: DeliveryBoy[];
}) => {
  const getStatusOptions = (deliveryOption: DeliveryOption): OrderStatus[] => {
    switch (deliveryOption) {
      case 'Self Pickup': return selfPickupStatuses;
      case 'Dine-In': return dineInStatuses;
      case 'Home Delivery':
      default:
        return homeDeliveryStatuses;
    }
  };

  const isAssignable = order.deliveryOption === 'Home Delivery' && !order.assignedDeliveryBoyId;
  const qrCodeStatuses: OrderStatus[] = ['Accepted', 'Processing', 'Out for Delivery', 'Order Ready'];
  const canShowPayButton = qrCodeStatuses.includes(order.status) && vendor?.upiId;
  const isDineIn = order.deliveryOption === 'Dine-In';

  const elapsedText = useMemo(() => {
    try {
      if (!order.createdAt) return '';
      return formatDistanceToNow(new Date(order.createdAt), { addSuffix: true });
    } catch {
      return '';
    }
  }, [order.createdAt]);

  // Quick action next status button logic
  const getNextStatus = (): { label: string; status: OrderStatus; icon: any } | null => {
    if (order.status === 'Order Placed') {
      return { label: 'Accept Order', status: 'Accepted', icon: CheckCircle2 };
    }
    if (order.status === 'Accepted') {
      return { label: 'Start Cooking', status: 'Processing', icon: ChefHat };
    }
    if (order.status === 'Processing') {
      if (order.deliveryOption === 'Self Pickup') {
        return { label: 'Mark Ready', status: 'Order Ready', icon: CheckCircle2 };
      }
      if (order.deliveryOption === 'Dine-In') {
        return { label: 'Served / Done', status: 'Delivered', icon: CheckCircle2 };
      }
      return { label: 'Dispatch Delivery', status: 'Out for Delivery', icon: Bike };
    }
    if (order.status === 'Order Ready') {
      return { label: 'Customer Picked Up', status: 'Picked Up', icon: CheckCircle2 };
    }
    if (order.status === 'Out for Delivery') {
      return { label: 'Mark Delivered', status: 'Delivered', icon: CheckCircle2 };
    }
    return null;
  };

  const nextAction = getNextStatus();

  return (
    <Card className={cn(
      "rounded-3xl border shadow-xs flex flex-col overflow-hidden transition-all hover:shadow-md",
      isDineIn
        ? "border-blue-500/50 bg-blue-500/10 dark:bg-blue-950/30 ring-1 ring-blue-500/30 hover:border-blue-500"
        : order.deliveryOption === 'Self Pickup'
        ? "border-purple-500/40 bg-purple-500/5 dark:bg-purple-950/20 ring-1 ring-purple-500/20 hover:border-purple-500"
        : "border-orange-500/40 bg-orange-500/5 dark:bg-orange-950/20 ring-1 ring-orange-500/20 hover:border-orange-500"
    )}>
      {/* Ticket Header */}
      <div className={cn(
        "p-3.5 sm:p-4 border-b flex items-start justify-between gap-2",
        isDineIn
          ? "bg-blue-500/20 border-blue-500/30"
          : order.deliveryOption === 'Self Pickup'
          ? "bg-purple-500/15 border-purple-500/25"
          : "bg-orange-500/15 border-orange-500/25"
      )}>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-extrabold font-headline text-base text-foreground">
              #{order.displayId || order.orderId.slice(-6).toUpperCase()}
            </span>
            {isDineIn ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold text-white bg-blue-600 shadow-2xs uppercase tracking-wider">
                <Utensils className="h-3 w-3" /> {order.customer.name.startsWith('Table') ? order.customer.name : 'Dine-In Table'}
              </span>
            ) : order.deliveryOption === 'Self Pickup' ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold text-white bg-purple-600 shadow-2xs uppercase tracking-wider">
                <Home className="h-3 w-3" /> Self Pickup
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold text-white bg-orange-600 shadow-2xs uppercase tracking-wider">
                <Bike className="h-3 w-3" /> Delivery
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
            <User className="h-3 w-3 text-primary shrink-0" />
            <span className="font-semibold text-foreground truncate max-w-[130px]">{order.customer.name}</span>
          </div>

          {order.customer.address && !isDineIn && (
            <div className="text-[11px] text-muted-foreground flex items-start gap-1 mt-0.5">
              <MapPin className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
              <span className="truncate max-w-[140px]">{order.customer.address}</span>
            </div>
          )}
        </div>

        <div className="text-right shrink-0">
          <div className="text-base font-extrabold text-foreground">
            ₹{order.totalPrice.toFixed(0)}
          </div>
          {elapsedText && (
            <div className="inline-flex items-center gap-1 text-[10px] font-bold text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded-md mt-1">
              <Clock className="h-2.5 w-2.5 text-primary" />
              <span>{elapsedText}</span>
            </div>
          )}
        </div>
      </div>

      {/* Ticket Body: Items & Notes */}
      <CardContent className="p-3.5 sm:p-4 flex-1 space-y-2.5">
        {order.customNotes && (
          <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2 shadow-2xs">
            <MessageSquare className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-500" />
            <p className="italic font-medium">"{order.customNotes}"</p>
          </div>
        )}

        <div className="space-y-1.5">
          {order.items.map(item => (
            <div key={item.cartItemId || item.name} className="py-1 border-b border-border/40 last:border-0">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary font-extrabold text-[10px] flex items-center justify-center shrink-0">
                    {item.quantity}
                  </span>
                  <span className="font-bold text-foreground">{item.name}</span>
                </div>
                <span className="font-semibold text-muted-foreground">
                  ₹{(item.price * item.quantity).toFixed(0)}
                </span>
              </div>

              {(item.customizationDetails && Object.entries(item.customizationDetails).length > 0) ? (
                <div className="flex flex-wrap gap-1 mt-1 pl-7">
                  {Object.entries(item.customizationDetails).map(([custId, value]) => {
                    const group = item.customizations?.find(c => c.id === custId);
                    if (!group) return null;
                    const selectedNames = (Array.isArray(value) ? value : [value])
                      .map(optId => group.options.find(o => o.id === optId)?.name)
                      .filter(Boolean);
                    if (selectedNames.length === 0) return null;
                    return (
                      <span key={custId} className="text-[9px] font-bold text-muted-foreground bg-muted/80 px-2 py-0.5 rounded-full">
                        {group.name}: {selectedNames.join(', ')}
                      </span>
                    );
                  })}
                </div>
              ) : (
                item.customizations && item.customizations.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1 pl-7">
                    {item.customizations.map((group: any) => (
                      <span key={group.id} className="text-[9px] font-bold text-muted-foreground bg-muted/80 px-2 py-0.5 rounded-full">
                        {group.name}: {group.options.map((o: any) => o.name).join(', ')}
                      </span>
                    ))}
                  </div>
                )
              )}
            </div>
          ))}
        </div>
      </CardContent>

      {/* Ticket Footer: Actions & Status Selection */}
      <CardFooter className="p-3.5 sm:p-4 pt-0 flex flex-col gap-2 bg-muted/10 border-t border-border/50">
        {/* Quick Next Step Button */}
        {nextAction && (
          <Button
            type="button"
            size="sm"
            className="w-full rounded-full font-extrabold text-xs h-8 gap-1.5 shadow-xs"
            onClick={() => onStatusChange(order, nextAction.status)}
          >
            <nextAction.icon className="h-3.5 w-3.5" />
            <span>{nextAction.label}</span>
          </Button>
        )}

        <div className="flex items-center gap-2 w-full">
          {/* Status Dropdown */}
          <Select
            value={order.status}
            onValueChange={(value: OrderStatus) => onStatusChange(order, value)}
          >
            <SelectTrigger className="w-full h-8 text-xs rounded-xl font-bold">
              <div className="flex items-center gap-1.5">
                <span className={cn('h-2 w-2 rounded-full', statusColors[order.status].split(' ')[0])} />
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent>
              {getStatusOptions(order.deliveryOption).map(status => (
                <SelectItem key={status} value={status} className="text-xs font-semibold">
                  <div className="flex items-center gap-2">
                    <span className={cn('h-2 w-2 rounded-full', statusColors[status].split(' ')[0])} />
                    {status}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Edit Order */}
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2.5 rounded-xl text-xs font-bold shrink-0"
            onClick={() => onEditOrder(order)}
            title="Edit Order"
          >
            <Edit className="h-3.5 w-3.5" />
          </Button>

          {/* Pay QR */}
          {canShowPayButton && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2.5 rounded-xl text-xs font-bold shrink-0 text-primary"
              onClick={() => onPayClick(order)}
              title="Show Payment QR"
            >
              <QrCode className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {/* Delivery Assignment if unassigned */}
        {isAssignable && (
          <Select
            onValueChange={(deliveryBoyId: string) => onAssignDelivery(order.orderId, deliveryBoyId)}
            disabled={deliveryTeam.length === 0}
          >
            <SelectTrigger className="w-full h-8 text-xs rounded-xl">
              <div className="flex items-center gap-1.5 text-xs">
                <Bike className="h-3.5 w-3.5 text-orange-500" />
                <SelectValue placeholder="Assign Rider" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned" disabled>Unassigned</SelectItem>
              {deliveryTeam.filter(boy => boy.isApproved).map(boy => (
                <SelectItem key={boy.id} value={boy.id} className="text-xs">
                  {boy.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </CardFooter>
    </Card>
  );
};

export default function LiveOrdersPage() {
  const { orders, updateOrderStatus, assignDeliveryBoyToOrder } = useOrder();
  const { vendor } = useVendor();
  const { deliveryTeam } = useDelivery();
  const router = useRouter();

  const [orderToCancel, setOrderToCancel] = useState<Order | null>(null);
  const [qrCodeOrder, setQrCodeOrder] = useState<Order | null>(null);
  const [viewMode, setViewMode] = useState<'kds' | 'grid'>('kds');
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    if (!vendor) {
      router.replace('/admin/login');
    }
  }, [vendor, router]);

  // Live real-time clock
  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(format(new Date(), 'hh:mm:ss a'));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const activeOrders = useMemo(() => {
    if (!vendor) return [];
    return [...orders]
      .filter(order => order.vendorUsername === vendor.username && activeStatuses.includes(order.status))
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [orders, vendor]);

  if (!vendor) {
    return null;
  }

  const handleStatusChange = (order: Order, newStatus: OrderStatus) => {
    if (newStatus === 'Cancelled') {
      setOrderToCancel(order);
    } else {
      updateOrderStatus(order.orderId, newStatus);
    }
  };

  const handleCancellationConfirm = (reason: string) => {
    if (orderToCancel) {
      updateOrderStatus(orderToCancel.orderId, 'Cancelled', reason);
      setOrderToCancel(null);
    }
  };

  const handleAssignDelivery = (orderId: string, deliveryBoyId: string) => {
    assignDeliveryBoyToOrder(orderId, deliveryBoyId, deliveryTeam);
  };

  const handleEditOrder = (order: Order) => {
    const vendorIdentifier = vendor?.slug || vendor?.username;
    if (vendorIdentifier) {
      router.push(`/vendor/${vendorIdentifier}?edit_order=${order.orderId}`);
    }
  };

  return (
    <>
      <div className="flex flex-col min-h-screen bg-background text-foreground">
        {/* Full Screen KDS Header Bar */}
        <header className="sticky top-0 z-30 bg-background/90 backdrop-blur-md border-b border-border/70 px-4 sm:px-6 py-3 flex items-center justify-between gap-4 shadow-xs">
          {/* Left: Store Title & Live Clock */}
          <div className="flex items-center gap-3">
            <Link href="/admin/dashboard/orders" passHref>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-extrabold font-headline text-foreground flex items-center gap-1.5">
                  <ChefHat className="h-5 w-5 text-primary" />
                  <span>{vendor.shopName}</span>
                </h1>
                <span className="text-xs text-muted-foreground font-semibold">• Live KDS</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                <Clock className="h-3.5 w-3.5 text-primary" />
                <span>{currentTime || 'Syncing...'}</span>
              </div>
            </div>
          </div>

          {/* Right: Active Ticket Counter, View Switcher & Exit */}
          <div className="flex items-center gap-2.5">
            {/* Active Tickets Pill */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 shadow-2xs">
              <Flame className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
              <span>{activeOrders.length} Active Tickets</span>
            </div>

            {/* View Mode Toggle Pill */}
            <div className="flex items-center gap-1 bg-muted/70 p-1 rounded-full border border-border/60 shadow-2xs">
              <button
                type="button"
                onClick={() => setViewMode('kds')}
                className={cn(
                  "flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-full transition-all cursor-pointer",
                  viewMode === 'kds'
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">KDS Board</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={cn(
                  "flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-full transition-all cursor-pointer",
                  viewMode === 'grid'
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <LayoutList className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Ticket Grid</span>
              </button>
            </div>

            {/* Exit Full Screen */}
            <Link href="/admin/dashboard/orders" passHref>
              <Button variant="outline" size="sm" className="rounded-full text-xs font-bold gap-1.5 h-8">
                <ArrowLeft className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Exit Fullscreen</span>
              </Button>
            </Link>
          </div>
        </header>

        {/* Main Display Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {activeOrders.length > 0 ? (
            viewMode === 'kds' ? (
              <VendorKdsBoard
                orders={activeOrders}
                onStatusChange={handleStatusChange}
                onAssignDeliveryBoy={handleAssignDelivery}
                onShowQrCode={setQrCodeOrder}
                onEditOrder={handleEditOrder}
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {activeOrders.map(order => (
                  <LiveOrderCard
                    key={order.orderId}
                    order={order}
                    vendor={vendor}
                    onStatusChange={handleStatusChange}
                    onAssignDelivery={handleAssignDelivery}
                    onPayClick={setQrCodeOrder}
                    onEditOrder={handleEditOrder}
                    deliveryTeam={deliveryTeam}
                  />
                ))}
              </div>
            )
          ) : (
            <div className="text-center py-28 flex flex-col items-center justify-center gap-4 bg-card/60 backdrop-blur-md rounded-3xl border border-dashed border-border/80 max-w-2xl mx-auto shadow-xs">
              <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                <ChefHat className="h-8 w-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-bold font-headline text-foreground">Kitchen is All Caught Up!</h3>
                <p className="text-xs text-muted-foreground">
                  New incoming orders from customers and tables will appear here automatically with live sound alerts.
                </p>
              </div>
            </div>
          )}
        </main>
      </div>

      <CancellationReasonDialog
        isOpen={!!orderToCancel}
        onOpenChange={() => setOrderToCancel(null)}
        onConfirm={handleCancellationConfirm}
      />

      {qrCodeOrder && vendor && (
        <QrCodeDialog
          order={qrCodeOrder}
          vendor={vendor}
          isOpen={!!qrCodeOrder}
          onOpenChange={() => setQrCodeOrder(null)}
        />
      )}
    </>
  );
}
