'use client';

import React, { useState, useEffect } from 'react';
import type { Order, OrderStatus, DeliveryOption } from '@/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Bell, 
  ChefHat, 
  Bike, 
  Home, 
  Utensils, 
  Clock, 
  QrCode, 
  Edit, 
  CheckCircle2, 
  ArrowRight, 
  AlertCircle, 
  MessageSquare, 
  Phone, 
  Flame,
  UserCheck
} from 'lucide-react';
import { useDelivery } from '@/context/delivery-context';
import { useVendor } from '@/context/vendor-context';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, parseISO } from 'date-fns';

interface VendorKdsBoardProps {
  orders: Order[];
  onStatusChange: (order: Order, newStatus: OrderStatus) => void;
  onAssignDeliveryBoy: (orderId: string, deliveryBoyId: string) => void;
  onShowQrCode: (order: Order) => void;
  onEditOrder: (order: Order) => void;
}

// Live Elapsed Timer Component for individual KDS ticket
function ElapsedTimer({ createdAt }: { createdAt?: string }) {
  const [elapsedMins, setElapsedMins] = useState(0);

  useEffect(() => {
    if (!createdAt) return;
    const calculateElapsed = () => {
      const createdTime = new Date(createdAt).getTime();
      const now = new Date().getTime();
      const diffMins = Math.floor((now - createdTime) / 60000);
      setElapsedMins(Math.max(0, diffMins));
    };

    calculateElapsed();
    const interval = setInterval(calculateElapsed, 30000); // update every 30s
    return () => clearInterval(interval);
  }, [createdAt]);

  const timerColor =
    elapsedMins < 10
      ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30"
      : elapsedMins < 20
      ? "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/30"
      : "text-red-600 dark:text-red-400 bg-red-500/15 border-red-500/40 animate-pulse";

  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border", timerColor)}>
      <Clock className="h-3 w-3" />
      {elapsedMins}m ago
    </span>
  );
}

export default function VendorKdsBoard({
  orders,
  onStatusChange,
  onAssignDeliveryBoy,
  onShowQrCode,
  onEditOrder,
}: VendorKdsBoardProps) {
  const { deliveryTeam } = useDelivery();
  const { vendor } = useVendor();

  // 1. Column 1: New Orders (Order Placed)
  const newOrders = orders.filter((o) => o.status === 'Order Placed');

  // 2. Column 2: Cooking in Kitchen (Processing / Accepted)
  const inPrepOrders = orders.filter((o) => o.status === 'Processing' || o.status === 'Accepted');

  // 3. Column 3: Ready for Handover / Dispatched (Order Ready / Out for Delivery)
  const readyOrders = orders.filter((o) => o.status === 'Order Ready' || o.status === 'Out for Delivery');

  const formatAndMaskContact = (contact: string) => {
    if (!contact) return '';
    const cleaned = contact.replace('+91', '');
    if (cleaned.length <= 4) return cleaned;
    const lastFour = cleaned.slice(-4);
    return `xxxxxx${lastFour}`;
  };

  const renderDeliveryBadge = (option: DeliveryOption, customerName: string) => {
    switch (option) {
      case 'Home Delivery':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-orange-600 dark:text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full">
            <Bike className="h-3 w-3" /> Delivery
          </span>
        );
      case 'Self Pickup':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full">
            <Home className="h-3 w-3" /> Pickup
          </span>
        );
      case 'Dine-In':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">
            <Utensils className="h-3 w-3" /> {customerName.startsWith('Table') ? customerName : 'Dine-In'}
          </span>
        );
      default:
        return null;
    }
  };

  // Reusable Ticket Card
  const renderTicket = (order: Order, stage: 'new' | 'prep' | 'ready') => {
    const isDineIn = order.deliveryOption === 'Dine-In';
    const isSelfPickup = order.deliveryOption === 'Self Pickup';

    return (
      <Card
        key={order.orderId}
        className={cn(
          "rounded-2xl border bg-card/90 shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col justify-between",
          stage === 'new' && "border-amber-500/50 ring-1 ring-amber-500/20",
          stage === 'prep' && "border-blue-500/40",
          stage === 'ready' && "border-purple-500/40"
        )}
      >
        {/* Ticket Header */}
        <div className="p-3.5 border-b border-border/50 bg-muted/20">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold font-headline text-foreground">
                #{order.displayId || order.orderId.slice(-4).toUpperCase()}
              </span>
              {renderDeliveryBadge(order.deliveryOption, order.customer.name)}
            </div>
            <ElapsedTimer createdAt={order.createdAt} />
          </div>

          <div className="flex items-center justify-between mt-2">
            <div className="min-w-0">
              <p className="text-xs font-bold text-foreground truncate">{order.customer.name}</p>
              {!isDineIn && (
                <a
                  href={`tel:${order.customer.contact}`}
                  className="text-[11px] text-muted-foreground hover:text-primary flex items-center gap-1 mt-0.5"
                >
                  <Phone className="h-3 w-3" />
                  {formatAndMaskContact(order.customer.contact)}
                </a>
              )}
            </div>
            <div className="text-right shrink-0">
              <span className="text-xs font-extrabold text-foreground">
                ₹{order.totalPrice.toFixed(0)}
              </span>
              <p className="text-[10px] text-muted-foreground">{order.items.length} items</p>
            </div>
          </div>
        </div>

        {/* Custom Cooking Notes Callout */}
        {order.customNotes && (
          <div className="mx-3.5 mt-2.5 p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-[11px] flex items-start gap-1.5 font-medium">
            <MessageSquare className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-500" />
            <p className="italic">"{order.customNotes}"</p>
          </div>
        )}

        {/* Food Items Checklist */}
        <div className="p-3.5 space-y-1.5 flex-1">
          {order.items.map((item, idx) => (
            <div key={item.cartItemId || idx} className="flex items-start justify-between text-xs gap-2 py-0.5">
              <div className="flex items-baseline gap-1.5 min-w-0">
                <span className="px-1.5 py-0.2 rounded-md bg-primary/10 text-primary font-extrabold text-[11px] shrink-0">
                  {item.quantity}x
                </span>
                <span className="font-semibold text-foreground truncate">{item.name}</span>
              </div>
              {item.customizationDetails && Object.keys(item.customizationDetails).length > 0 && (
                <span className="text-[10px] text-muted-foreground truncate max-w-[100px]">
                  {Object.values(item.customizationDetails).flat().join(', ')}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Handover & Delivery Agent Assignment (Only for Column 3) */}
        {stage === 'ready' && order.deliveryOption === 'Home Delivery' && (
          <div className="px-3.5 pb-2">
            <Select
              value={order.assignedDeliveryBoyId}
              onValueChange={(deliveryBoyId: string) => onAssignDeliveryBoy(order.orderId, deliveryBoyId)}
              disabled={deliveryTeam.length === 0}
            >
              <SelectTrigger className="w-full h-8 text-xs rounded-xl bg-muted/30">
                <SelectValue placeholder="Assign Delivery Rider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned" disabled>Unassigned</SelectItem>
                {deliveryTeam.filter((b) => b.isApproved).map((boy) => (
                  <SelectItem key={boy.id} value={boy.id}>
                    🚴 {boy.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Ticket Footer Action Buttons */}
        <div className="p-3 bg-muted/15 border-t border-border/50 flex items-center justify-between gap-2">
          {/* Action Tools: Pay QR / Edit */}
          <div className="flex items-center gap-1">
            {vendor?.upiId && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2 rounded-xl text-xs gap-1"
                onClick={() => onShowQrCode(order)}
                title="Collect Payment QR"
              >
                <QrCode className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2 rounded-xl text-xs gap-1"
              onClick={() => onEditOrder(order)}
              title="Edit Order / Add Items"
            >
              <Edit className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Primary Stage Advancement Button */}
          {stage === 'new' && (
            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onStatusChange(order, 'Cancelled')}
                className="h-8 px-2.5 rounded-xl text-xs text-destructive hover:bg-destructive/10"
              >
                Decline
              </Button>
              <Button
                size="sm"
                onClick={() => onStatusChange(order, 'Processing')}
                className="h-8 px-3 rounded-xl text-xs font-bold gap-1 bg-amber-500 hover:bg-amber-600 text-white shadow-xs"
              >
                <Flame className="h-3.5 w-3.5" /> Accept & Cook
              </Button>
            </div>
          )}

          {stage === 'prep' && (
            <Button
              size="sm"
              onClick={() =>
                onStatusChange(
                  order,
                  isDineIn ? 'Delivered' : isSelfPickup ? 'Order Ready' : 'Out for Delivery'
                )
              }
              className="h-8 px-3 rounded-xl text-xs font-bold gap-1 bg-blue-600 hover:bg-blue-700 text-white shadow-xs ml-auto"
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> Mark Ready ➔
            </Button>
          )}

          {stage === 'ready' && (
            <Button
              size="sm"
              onClick={() => onStatusChange(order, isSelfPickup ? 'Picked Up' : 'Delivered')}
              className="h-8 px-3 rounded-xl text-xs font-bold gap-1 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs ml-auto"
            >
              <UserCheck className="h-3.5 w-3.5" /> Complete Handover
            </Button>
          )}
        </div>
      </Card>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-5">
      {/* Column 1: 🔔 New Incoming Orders */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
            <h3 className="text-sm font-bold font-headline text-foreground">
              New Incoming
            </h3>
          </div>
          <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-amber-500/15 text-amber-600 dark:text-amber-400">
            {newOrders.length}
          </span>
        </div>

        <div className="space-y-3 min-h-[220px] p-2 rounded-2xl bg-muted/20 border border-dashed border-border/70">
          {newOrders.length > 0 ? (
            newOrders.map((order) => renderTicket(order, 'new'))
          ) : (
            <div className="flex flex-col items-center justify-center h-40 text-center p-4 text-muted-foreground">
              <Bell className="h-6 w-6 opacity-30 mb-1" />
              <p className="text-xs font-medium">No new orders waiting</p>
            </div>
          )}
        </div>
      </div>

      {/* Column 2: 🍳 Cooking in Prep */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <h3 className="text-sm font-bold font-headline text-foreground">
              Cooking In Prep
            </h3>
          </div>
          <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-blue-500/15 text-blue-600 dark:text-blue-400">
            {inPrepOrders.length}
          </span>
        </div>

        <div className="space-y-3 min-h-[220px] p-2 rounded-2xl bg-muted/20 border border-dashed border-border/70">
          {inPrepOrders.length > 0 ? (
            inPrepOrders.map((order) => renderTicket(order, 'prep'))
          ) : (
            <div className="flex flex-col items-center justify-center h-40 text-center p-4 text-muted-foreground">
              <ChefHat className="h-6 w-6 opacity-30 mb-1" />
              <p className="text-xs font-medium">Kitchen is all caught up</p>
            </div>
          )}
        </div>
      </div>

      {/* Column 3: 🛵 Ready for Handover */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
            <h3 className="text-sm font-bold font-headline text-foreground">
              Ready for Handover
            </h3>
          </div>
          <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-purple-500/15 text-purple-600 dark:text-purple-400">
            {readyOrders.length}
          </span>
        </div>

        <div className="space-y-3 min-h-[220px] p-2 rounded-2xl bg-muted/20 border border-dashed border-border/70">
          {readyOrders.length > 0 ? (
            readyOrders.map((order) => renderTicket(order, 'ready'))
          ) : (
            <div className="flex flex-col items-center justify-center h-40 text-center p-4 text-muted-foreground">
              <CheckCircle2 className="h-6 w-6 opacity-30 mb-1" />
              <p className="text-xs font-medium">No orders waiting for pickup</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
