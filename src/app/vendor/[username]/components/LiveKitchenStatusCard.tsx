'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ChefHat,
  Clock,
  CheckCircle2,
  Minus,
  MessageSquare,
  Plus,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Order } from '@/types';

export interface LiveKitchenStatusCardProps {
  activeTableOrder: Order;
  vendorUsername?: string;
  graceSecondsLeft: number;
  isTableHost: boolean;
  onReduceItem: (itemIdKey: string) => void;
  onAddMoreItems: () => void;
}

const getOrderNotes = (notes: any, vendorUsername?: string): string => {
  if (!notes) return '';
  if (typeof notes === 'string') return notes.trim();
  if (typeof notes === 'object') {
    if (vendorUsername && notes[vendorUsername]) return String(notes[vendorUsername]).trim();
    const vals = Object.values(notes).filter(Boolean);
    return vals.join(' | ').trim();
  }
  return '';
};

export function LiveKitchenStatusCard({
  activeTableOrder,
  vendorUsername,
  graceSecondsLeft,
  isTableHost,
  onReduceItem,
  onAddMoreItems,
}: LiveKitchenStatusCardProps) {
  return (
    <div className="mb-4 max-w-5xl mx-auto">
      <Card className="rounded-2xl border-2 border-primary/40 bg-card shadow-lg overflow-hidden">
        <div className="p-3 sm:p-4 bg-primary/5 border-b border-border/60 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-xs shrink-0">
              <ChefHat className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-extrabold text-sm sm:text-base text-foreground">
                  Kitchen Status • Table {activeTableOrder.tableId}
                </h3>
                <Badge variant="outline" className={cn(
                  "font-extrabold text-[10px] uppercase tracking-wider",
                  activeTableOrder.status === 'Processing' ? "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30" :
                    activeTableOrder.status === 'Order Placed' ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30" :
                      "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                )}>
                  {activeTableOrder.status === 'Order Placed' ? '⏳ Sent to Kitchen' :
                    activeTableOrder.status === 'Processing' ? '👨‍🍳 Cooking in Kitchen' :
                      activeTableOrder.status === 'Out for Delivery' ? '🍽️ Being Served' :
                        activeTableOrder.status}
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Order #{activeTableOrder.displayId || activeTableOrder.orderId?.slice(-6)} • Round {activeTableOrder.orderRound || 1}
              </p>
            </div>
          </div>

          {activeTableOrder.status === 'Order Placed' && graceSecondsLeft > 0 ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-bold animate-pulse">
              <Clock className="h-3.5 w-3.5" />
              <span>Edit Window: {Math.floor(graceSecondsLeft / 60)}:{(graceSecondsLeft % 60).toString().padStart(2, '0')}</span>
            </div>
          ) : activeTableOrder.status === 'Processing' ? (
            <div className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1">
              <ChefHat className="h-3.5 w-3.5" /> Cooking in Progress
            </div>
          ) : null}
        </div>

        <CardContent className="p-3 sm:p-4 space-y-3">
          <div className="space-y-2">
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Dishes in this Order</div>
            <div className="divide-y divide-border/40">
              {activeTableOrder.items.map((item, idx) => {
                const itemIdKey = item.cartItemId || item.id || `dish-${idx}`;
                const itemPrice = typeof item.price === 'number' ? item.price : ((item as any).finalPrice ?? 0);
                const itemTotal = itemPrice * (item.quantity || 1);
                return (
                  <div key={itemIdKey} className="py-2.5 flex items-center justify-between text-xs sm:text-sm gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0 pr-2">
                      <span className="font-bold text-foreground shrink-0">{item.quantity}x</span>
                      <div className="min-w-0">
                        <span className="font-semibold text-foreground break-words">{item.name}</span>
                        {item.selectedOptionsText && (
                          <p className="text-[10px] text-muted-foreground">{item.selectedOptionsText}</p>
                        )}
                        {(item.round || 1) > 1 || (activeTableOrder.orderRound && activeTableOrder.orderRound > 1) ? (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-muted text-muted-foreground border ml-1.5 inline-block">
                            Round {item.round || 1}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                      <span className="font-bold text-foreground text-xs sm:text-sm whitespace-nowrap">
                        ₹{itemTotal.toFixed(2)}
                      </span>

                      {item.served ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 whitespace-nowrap">
                          <CheckCircle2 className="h-3 w-3" /> Served
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 whitespace-nowrap">
                          <ChefHat className="h-3 w-3" /> Cooking
                        </span>
                      )}

                      {isTableHost && activeTableOrder.status === 'Order Placed' && graceSecondsLeft > 0 && !item.served && (
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-6 w-6 rounded-full border-destructive/40 text-destructive hover:bg-destructive hover:text-white shrink-0"
                          title="Reduce quantity or remove dish"
                          onClick={() => onReduceItem(itemIdKey)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {(() => {
            const notesText = getOrderNotes(activeTableOrder.customNotes, vendorUsername);
            if (!notesText) return null;
            return (
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2 shadow-2xs">
                <MessageSquare className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <span className="font-extrabold text-[11px] uppercase tracking-wider block text-amber-700 dark:text-amber-300">Special Instructions for Chef</span>
                  <span className="break-words font-medium">{notesText}</span>
                </div>
              </div>
            );
          })()}

          {activeTableOrder.status === 'Processing' && (
            <p className="text-[11px] text-muted-foreground bg-muted/40 p-2.5 rounded-xl border border-border/50">
              🔒 Dishes are currently cooking in the kitchen. To modify or cancel any dish, please notify your server.
            </p>
          )}

          <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-border/60">
            <div className="text-xs">
              <span className="text-muted-foreground">Order Total: </span>
              <span className="font-extrabold text-foreground">₹{activeTableOrder.totalPrice.toFixed(2)}</span>
              <span className="text-muted-foreground ml-2">(Pay at Counter)</span>
            </div>

            {isTableHost ? (
              <Button
                variant="outline"
                size="sm"
                className="rounded-full text-xs font-bold border-primary text-primary hover:bg-primary hover:text-primary-foreground gap-1.5 shadow-2xs"
                onClick={onAddMoreItems}
              >
                <Plus className="h-3.5 w-3.5" /> Add More Items (Round {(activeTableOrder.orderRound || 1) + 1})
              </Button>
            ) : (
              <span className="text-[11px] font-medium text-muted-foreground bg-muted/60 px-3 py-1 rounded-full border border-border/40 flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Managed by Table Host
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
