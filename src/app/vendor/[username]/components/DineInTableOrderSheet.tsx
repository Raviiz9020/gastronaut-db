'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Utensils,
  ChevronDown,
  X,
  Minus,
  Plus,
  Trash2,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Vendor, Order } from '@/types';
import type { TableOrderItem } from '../types';

export interface DineInTableOrderSheetProps {
  isOpen: boolean;
  onClose: () => void;
  orderIdToEdit: string | null;
  activeTableOrder?: Order | null;
  activeTableId: string;
  vendor: Vendor | null;
  onSelectTable: (tableNum: string) => void;
  dineInNotes: string;
  onDineInNotesChange: (notes: string) => void;
  tableOrderItems: TableOrderItem[];
  onQuantityChange: (itemId: string, change: number) => void;
  onRemoveItem: (item: TableOrderItem) => void;
  tableOrderTotal: number;
  showMinAmountWarning: boolean;
  minAmount: number;
  onPlaceOrUpdateOrder: () => void;
  isUpdateDisabled: boolean;
  isPlacingTableOrder: boolean;
}

export function DineInTableOrderSheet({
  isOpen,
  onClose,
  orderIdToEdit,
  activeTableOrder,
  activeTableId,
  vendor,
  onSelectTable,
  dineInNotes,
  onDineInNotesChange,
  tableOrderItems,
  onQuantityChange,
  onRemoveItem,
  tableOrderTotal,
  showMinAmountWarning,
  minAmount,
  onPlaceOrUpdateOrder,
  isUpdateDisabled,
  isPlacingTableOrder,
}: DineInTableOrderSheetProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.9 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="fixed bottom-4 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-96 max-w-sm"
        >
          <Card className="w-full shadow-2xl rounded-3xl border-2 border-primary/20 bg-card/95 backdrop-blur-md overflow-hidden">
            <CardHeader
              className={cn(
                "flex flex-row items-center justify-between p-3.5 bg-primary/5 border-b border-border/40",
                "cursor-pointer"
              )}
              onClick={onClose}
            >
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs">
                  <Utensils className="h-3.5 w-3.5" />
                </div>
                <CardTitle className="text-sm sm:text-base font-extrabold text-foreground">
                  {orderIdToEdit
                    ? `Editing: #${orderIdToEdit.split('-')[1] || orderIdToEdit}`
                    : activeTableOrder
                      ? `Table ${activeTableId} • Round ${(activeTableOrder.orderRound || 1) + 1}`
                      : `Table ${activeTableId || 'Selection'} • Dine-In`}
                </CardTitle>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                  }}
                  title="Minimize to floating bar"
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                  }}
                  title="Close"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-3.5 py-3 space-y-3.5">
              {!orderIdToEdit && !activeTableId && (
                <div className="space-y-1.5">
                  <Label htmlFor="table-id-selector" className="text-xs font-bold">Select Table Number</Label>
                  <div id="table-id-selector" className="flex flex-wrap gap-1.5">
                    {Array.from({ length: vendor?.dineInTables ?? 6 }, (_, i) => i + 1).map((number) => (
                      <Button
                        key={number}
                        type="button"
                        variant={activeTableId === `${number}` ? 'default' : 'outline'}
                        size="sm"
                        className="h-7 w-7 p-0 rounded-full font-bold text-xs"
                        onClick={() => onSelectTable(`${number}`)}
                      >
                        {number}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              <div className="space-y-1">
                <Label htmlFor="dine-in-notes" className="text-xs font-semibold">Special Instructions for Chef</Label>
                <Textarea
                  id="dine-in-notes"
                  placeholder="e.g., extra spicy, no onions, serve hot..."
                  rows={2}
                  value={dineInNotes}
                  onChange={(e) => onDineInNotesChange(e.target.value)}
                  className="text-xs rounded-xl"
                />
              </div>
              <ScrollArea className="h-44">
                <div className="space-y-2 pr-3">
                  {tableOrderItems.length > 0 ? tableOrderItems.map((item, idx) => (
                    <div key={item.cartItemId || item.id || idx} className="flex justify-between items-center text-xs p-1.5 rounded-xl hover:bg-muted/40 transition-colors">
                      <div className="flex-1 pr-2">
                        <span className="font-semibold block text-foreground">{item.name}</span>
                        {item.selectedOptionsText && (
                          <span className="text-[10px] text-muted-foreground block">{item.selectedOptionsText}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-6 w-6 rounded-full border-destructive text-destructive hover:bg-destructive hover:text-white"
                          onClick={() => onQuantityChange(item.id, -1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-5 text-center font-bold text-xs">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-6 w-6 rounded-full border-primary text-primary hover:bg-primary hover:text-white"
                          onClick={() => onQuantityChange(item.id, 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <span className="font-bold w-12 text-right">₹{(item.finalPrice * item.quantity).toFixed(2)}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 ml-1 text-muted-foreground hover:text-destructive"
                        onClick={() => onRemoveItem(item)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )) : <p className="text-center text-xs text-muted-foreground pt-10">No items added to this order yet.</p>}
                </div>
              </ScrollArea>
            </CardContent>
            <CardFooter className="flex-col gap-2 p-3.5 bg-muted/20 border-t border-border/40">
              <div className="flex justify-between w-full font-extrabold text-sm">
                <span>Total (Pay at Counter):</span>
                <span className="text-primary">₹{tableOrderTotal.toFixed(2)}</span>
              </div>
              {showMinAmountWarning && (
                <p className="text-xs text-destructive text-center">
                  The total must be at least ₹{minAmount.toFixed(2)} to update the order.
                </p>
              )}
              <Button
                className="w-full h-10 rounded-full font-extrabold text-xs tracking-wider uppercase shadow-md"
                onClick={onPlaceOrUpdateOrder}
                disabled={isUpdateDisabled || tableOrderItems.length === 0 || (!orderIdToEdit && !activeTableId.trim()) || isPlacingTableOrder}
              >
                {isPlacingTableOrder ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : orderIdToEdit ? (
                  'Update Order'
                ) : activeTableOrder ? (
                  `Send Round ${(activeTableOrder.orderRound || 1) + 1} to Kitchen`
                ) : (
                  'Send Order to Kitchen'
                )}
              </Button>
            </CardFooter>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
