'use client';

import React, { useMemo } from 'react';
import { ChefHat, Flame, Clock, CheckCircle2, Bike, AlertCircle, Sparkles, Store, ChevronRight } from 'lucide-react';
import type { Order, Vendor } from '@/types';
import { VendorStatusManager } from '@/lib/vendorStatusManager';
import { VendorStatus } from '@/types';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import VendorDailyGoalRing from './vendor-daily-goal-ring';

interface VendorKitchenPulseBarProps {
  vendor: Vendor | null;
  orders: Order[];
  todayRevenue: number;
  past7DaysDailyRevenue: number[];
  className?: string;
}

export default function VendorKitchenPulseBar({
  vendor,
  orders,
  todayRevenue,
  past7DaysDailyRevenue,
  className,
}: VendorKitchenPulseBarProps) {
  const shopStatus = useMemo(() => {
    return vendor ? VendorStatusManager.getShopStatus(vendor) : null;
  }, [vendor]);

  const isShopOpen = !shopStatus || shopStatus.status === VendorStatus.OPEN;

  // Active kitchen orders
  const newOrdersCount = useMemo(() => {
    return orders.filter((o) => o.status === 'Order Placed').length;
  }, [orders]);

  const inPrepCount = useMemo(() => {
    return orders.filter((o) => o.status === 'Processing' || o.status === 'Accepted').length;
  }, [orders]);

  const readyCount = useMemo(() => {
    return orders.filter((o) => o.status === 'Order Ready' || o.status === 'Out for Delivery').length;
  }, [orders]);

  const deliveredTodayCount = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return orders.filter(
      (o) => (o.status === 'Delivered' || o.status === 'Picked Up') && o.createdAt?.startsWith(todayStr)
    ).length;
  }, [orders]);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-3xl bg-gradient-to-br from-card via-card/95 to-muted/40 border border-border/70 p-4 sm:p-5 shadow-sm transition-all duration-300",
        className
      )}
    >
      {/* Background ambient lighting */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

      <div className="relative z-10 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Left: Kitchen Identity & Live Operational Status */}
        <div className="flex items-center gap-3.5">
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center text-primary font-bold shadow-xs">
              <ChefHat className="h-6 w-6 text-primary" />
            </div>
            {/* Live pulsating dot */}
            <span className={cn(
              "absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-background",
              isShopOpen ? "bg-emerald-500 animate-pulse" : "bg-red-500"
            )} />
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-bold font-headline text-foreground leading-tight">
                {vendor?.shopName || 'Kitchen Operations'}
              </h2>
              <Link
                href="/admin/dashboard/availability"
                className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all",
                  isShopOpen
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30"
                    : "bg-red-500/15 text-red-600 dark:text-red-400 hover:bg-red-500/25 border border-red-500/30"
                )}
              >
                <span className={cn("w-1.5 h-1.5 rounded-full", isShopOpen ? "bg-emerald-500" : "bg-red-500")} />
                {isShopOpen ? 'Live • Taking Orders' : (shopStatus?.msg || 'Store Closed')}
                <ChevronRight className="h-2.5 w-2.5 opacity-60" />
              </Link>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 font-normal">
              {vendor?.category || 'Cloud Kitchen'} • {vendor?.address || 'Local Area Hub'}
            </p>
          </div>
        </div>

        {/* Center: Live Kitchen Prep Queue Ticker */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5 py-1">
          {/* New Orders */}
          <Link
            href="/admin/dashboard/orders"
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-2xl border transition-all text-left group",
              newOrdersCount > 0
                ? "bg-amber-500/10 border-amber-500/40 text-amber-600 dark:text-amber-400 shadow-xs"
                : "bg-muted/30 hover:bg-muted/60 border-border/60 text-muted-foreground hover:text-foreground"
            )}
          >
            <div className={cn(
              "w-7 h-7 rounded-xl flex items-center justify-center shrink-0 font-bold text-xs",
              newOrdersCount > 0 ? "bg-amber-500 text-white" : "bg-foreground/5 text-muted-foreground"
            )}>
              {newOrdersCount}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider truncate">New</p>
              <p className="text-xs font-extrabold truncate text-foreground">Incoming</p>
            </div>
          </Link>

          {/* Cooking In Prep */}
          <Link
            href="/admin/dashboard/orders"
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-2xl border transition-all text-left group",
              inPrepCount > 0
                ? "bg-blue-500/10 border-blue-500/40 text-blue-600 dark:text-blue-400 shadow-xs"
                : "bg-muted/30 hover:bg-muted/60 border-border/60 text-muted-foreground hover:text-foreground"
            )}
          >
            <div className={cn(
              "w-7 h-7 rounded-xl flex items-center justify-center shrink-0 font-bold text-xs",
              inPrepCount > 0 ? "bg-blue-500 text-white" : "bg-foreground/5 text-muted-foreground"
            )}>
              {inPrepCount}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider truncate">Cooking</p>
              <p className="text-xs font-extrabold truncate text-foreground">In Prep</p>
            </div>
          </Link>

          {/* Ready / Dispatched */}
          <Link
            href="/admin/dashboard/orders"
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-2xl border transition-all text-left group",
              readyCount > 0
                ? "bg-purple-500/10 border-purple-500/40 text-purple-600 dark:text-purple-400 shadow-xs"
                : "bg-muted/30 hover:bg-muted/60 border-border/60 text-muted-foreground hover:text-foreground"
            )}
          >
            <div className={cn(
              "w-7 h-7 rounded-xl flex items-center justify-center shrink-0 font-bold text-xs",
              readyCount > 0 ? "bg-purple-500 text-white" : "bg-foreground/5 text-muted-foreground"
            )}>
              {readyCount}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider truncate">Ready</p>
              <p className="text-xs font-extrabold truncate text-foreground">For Pickup</p>
            </div>
          </Link>

          {/* Delivered Today */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-muted/30 border border-border/60 text-muted-foreground text-left">
            <div className="w-7 h-7 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 font-bold text-xs">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider truncate">Completed</p>
              <p className="text-xs font-extrabold truncate text-foreground">{deliveredTodayCount} Orders</p>
            </div>
          </div>
        </div>

        {/* Right: Today's Revenue Goal Progress Ring (Zero-DB) */}
        <div className="shrink-0">
          <VendorDailyGoalRing
            todayRevenue={todayRevenue}
            past7DaysRevenue={past7DaysDailyRevenue}
            vendorUsername={vendor?.username}
          />
        </div>
      </div>
    </div>
  );
}
